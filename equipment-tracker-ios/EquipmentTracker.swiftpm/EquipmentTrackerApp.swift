import SwiftUI

@main
struct EquipmentTrackerApp: App {
    @StateObject private var store = EquipmentStore()
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            EquipmentListView()
                .environmentObject(store)
        }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active { store.refresh() }
        }
    }
}
