import UserNotifications

/// Schedules local notifications on the iPhone itself, so alerts arrive even when the
/// app is closed and with no server involved. For each item there are up to three:
/// when it enters the warning window, on its expiry date and the day after it expires.
enum Reminders {
    /// iOS keeps at most 64 pending notifications per app; the soonest are kept.
    private static let maxPending = 64

    static func authorizationStatus() async -> UNAuthorizationStatus {
        await UNUserNotificationCenter.current().notificationSettings().authorizationStatus
    }

    @discardableResult
    static func requestAuthorization() async -> Bool {
        (try? await UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge])) ?? false
    }

    static func reschedule(items: [EquipmentItem], warnDays: Int, minutesAfterMidnight: Int) async {
        let center = UNUserNotificationCenter.current()
        let status = await center.notificationSettings().authorizationStatus
        guard status == .authorized || status == .provisional else { return }

        center.removeAllPendingNotificationRequests()
        let now = Date.now
        let cal = Calendar.current
        let attention = items.filter { $0.status(warnDays: warnDays, at: now) != .inDate }.count
        try? await center.setBadgeCount(attention)

        var pending: [(date: Date, request: UNNotificationRequest)] = []
        for item in items {
            let place = item.location.isEmpty ? "" : " (\(item.location))"
            let expiryText = item.expiry.formatted(date: .abbreviated, time: .omitted)
            let alerts: [(dayOffset: Int, key: String, title: String, body: String)] = [
                (-warnDays, "warn", "Expiring in \(warnDays) days", "\(item.name)\(place) expires on \(expiryText)."),
                (0, "today", "Expires today", "\(item.name)\(place) expires today."),
                (1, "expired", "Expired", "\(item.name)\(place) expired on \(expiryText). Replace or remove it."),
            ]
            for alert in alerts {
                guard let day = cal.date(byAdding: .day, value: alert.dayOffset, to: cal.startOfDay(for: item.expiry)),
                      let fireDate = cal.date(byAdding: .minute, value: minutesAfterMidnight, to: day),
                      fireDate > now
                else { continue }

                let content = UNMutableNotificationContent()
                content.title = alert.title
                content.body = alert.body
                content.sound = .default
                // badge = number of items needing attention on the day this alert fires
                content.badge = NSNumber(value: items.filter { $0.status(warnDays: warnDays, at: fireDate) != .inDate }.count)

                let components = cal.dateComponents([.year, .month, .day, .hour, .minute], from: fireDate)
                let trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: false)
                let request = UNNotificationRequest(identifier: "\(item.id.uuidString)-\(alert.key)", content: content, trigger: trigger)
                pending.append((fireDate, request))
            }
        }

        for entry in pending.sorted(by: { $0.date < $1.date }).prefix(maxPending) {
            try? await center.add(entry.request)
        }
    }
}
