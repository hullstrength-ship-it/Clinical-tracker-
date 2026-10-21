import SwiftUI

/// Holds the equipment list, saves it to a JSON file in the app's Documents folder
/// (included in the iPhone's iCloud/computer backup) and keeps reminders in sync.
@MainActor
final class EquipmentStore: ObservableObject {
    @Published private(set) var items: [EquipmentItem] = []

    @Published var warnDays: Int {
        didSet {
            UserDefaults.standard.set(warnDays, forKey: Keys.warnDays)
            refreshReminders()
        }
    }

    /// Time of day reminders fire, in minutes after midnight.
    @Published var reminderMinutes: Int {
        didSet {
            UserDefaults.standard.set(reminderMinutes, forKey: Keys.reminderMinutes)
            refreshReminders()
        }
    }

    static let warnDayOptions = [7, 14, 30, 60, 90, 180]

    private enum Keys {
        static let warnDays = "warnDays"
        static let reminderMinutes = "reminderMinutes"
    }

    private let fileURL = URL.documentsDirectory.appending(path: "equipment.json")

    init() {
        let defaults = UserDefaults.standard
        warnDays = defaults.object(forKey: Keys.warnDays) as? Int ?? 30
        reminderMinutes = defaults.object(forKey: Keys.reminderMinutes) as? Int ?? 9 * 60
        load()
    }

    // MARK: - Queries

    func items(with status: ExpiryStatus) -> [EquipmentItem] {
        items.filter { $0.status(warnDays: warnDays) == status }
    }

    var attentionCount: Int {
        items.filter { $0.status(warnDays: warnDays) != .inDate }.count
    }

    func suggestions(for keyPath: KeyPath<EquipmentItem, String>) -> [String] {
        Array(Set(items.map { $0[keyPath: keyPath] }.filter { !$0.isEmpty })).sorted()
    }

    // MARK: - Changes

    func save(_ item: EquipmentItem) {
        var item = item
        item.name = item.name.trimmingCharacters(in: .whitespacesAndNewlines)
        item.expiry = Calendar.current.startOfDay(for: item.expiry)
        if let index = items.firstIndex(where: { $0.id == item.id }) {
            items[index] = item
        } else {
            items.append(item)
        }
        persist()
    }

    func delete(ids: Set<UUID>) {
        items.removeAll { ids.contains($0.id) }
        persist()
    }

    /// Call when the app comes to the foreground: statuses depend on today's date.
    func refresh() {
        objectWillChange.send()
        refreshReminders()
    }

    // MARK: - Export

    func csv() -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        func cell(_ value: String) -> String { "\"\(value.replacingOccurrences(of: "\"", with: "\"\""))\"" }
        let header = ["Name", "Category", "Location", "Quantity", "Lot / batch / serial", "Expiry", "Days remaining", "Status", "Notes"]
        let rows = sorted(items).map { item in
            [item.name, item.category, item.location, String(item.quantity), item.lot,
             formatter.string(from: item.expiry), String(item.daysUntilExpiry()),
             item.status(warnDays: warnDays).title, item.notes]
        }
        return ([header] + rows).map { $0.map(cell).joined(separator: ",") }.joined(separator: "\r\n")
    }

    // MARK: - Private

    private func sorted(_ list: [EquipmentItem]) -> [EquipmentItem] {
        list.sorted { ($0.expiry, $0.name) < ($1.expiry, $1.name) }
    }

    private func load() {
        guard let data = try? Data(contentsOf: fileURL) else { return }
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        items = sorted((try? decoder.decode([EquipmentItem].self, from: data)) ?? [])
    }

    private func persist() {
        items = sorted(items)
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        encoder.outputFormatting = .prettyPrinted
        do {
            try encoder.encode(items).write(to: fileURL, options: [.atomic, .completeFileProtection])
        } catch {
            print("Could not save equipment: \(error)")
        }
        refreshReminders()
    }

    private func refreshReminders() {
        let snapshot = self.items
        let days = self.warnDays
        let minutes = self.reminderMinutes
        Task {
            await Reminders.reschedule(items: snapshot, warnDays: days, minutesAfterMidnight: minutes)
        }
    }
}
