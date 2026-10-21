import CoreTransferable
import SwiftUI
import UniformTypeIdentifiers
import UserNotifications

struct SettingsView: View {
    @EnvironmentObject private var store: EquipmentStore
    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL
    @Environment(\.scenePhase) private var scenePhase
    @State private var permission: UNAuthorizationStatus = .notDetermined

    private var reminderTime: Binding<Date> {
        Binding {
            Calendar.current.date(byAdding: .minute, value: store.reminderMinutes, to: Calendar.current.startOfDay(for: .now)) ?? .now
        } set: { date in
            let parts = Calendar.current.dateComponents([.hour, .minute], from: date)
            store.reminderMinutes = (parts.hour ?? 9) * 60 + (parts.minute ?? 0)
        }
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Picker("Warn me", selection: $store.warnDays) {
                        ForEach(EquipmentStore.warnDayOptions, id: \.self) { days in
                            Text("\(days) days before").tag(days)
                        }
                    }
                    DatePicker("Reminder time", selection: reminderTime, displayedComponents: .hourAndMinute)
                } header: {
                    Text("Expiry alerts")
                } footer: {
                    Text("You'll get a notification when an item is \(store.warnDays) days from expiry, on its expiry date, and the day after it expires.")
                }

                Section("Notifications") {
                    switch permission {
                    case .authorized, .provisional, .ephemeral:
                        Label("Notifications are on", systemImage: "bell.badge.fill")
                            .foregroundStyle(.green)
                    case .denied:
                        Label("Notifications are turned off", systemImage: "bell.slash.fill")
                            .foregroundStyle(.red)
                        Button("Open iPhone Settings") {
                            if let url = URL(string: UIApplication.openSettingsURLString) { openURL(url) }
                        }
                    default:
                        Button {
                            Task {
                                await Reminders.requestAuthorization()
                                await updatePermission()
                                store.refresh()
                            }
                        } label: {
                            Label("Turn on notifications", systemImage: "bell")
                        }
                    }
                }

                Section {
                    ShareLink(item: CSVExport(text: store.csv()), preview: SharePreview("Equipment list (CSV)")) {
                        Label("Export list as CSV", systemImage: "square.and.arrow.up")
                    }
                    .disabled(store.items.isEmpty)
                } header: {
                    Text("Your data")
                } footer: {
                    Text("Your list is stored only on this iPhone and is included in its iCloud or computer backup.")
                }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
            .task { await updatePermission() }
            .onChange(of: scenePhase) { _, phase in
                // returning from the Settings app
                if phase == .active { Task { await updatePermission() } }
            }
        }
    }

    private func updatePermission() async {
        permission = await Reminders.authorizationStatus()
    }
}

/// Shares the CSV as a real .csv file (opens in Excel/Numbers) rather than plain text.
struct CSVExport: Transferable {
    let text: String

    static var transferRepresentation: some TransferRepresentation {
        FileRepresentation(exportedContentType: .commaSeparatedText) { export in
            let url = FileManager.default.temporaryDirectory.appending(path: "Equipment list.csv")
            try export.text.write(to: url, atomically: true, encoding: .utf8)
            return SentTransferredFile(url)
        }
    }
}
