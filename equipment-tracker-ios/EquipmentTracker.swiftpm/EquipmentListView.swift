import SwiftUI

enum FormMode: Identifiable {
    case add
    case edit(EquipmentItem)
    case replace(EquipmentItem)

    var id: String {
        switch self {
        case .add: return "add"
        case .edit(let item): return "edit-\(item.id)"
        case .replace(let item): return "replace-\(item.id)"
        }
    }
}

struct EquipmentListView: View {
    @EnvironmentObject private var store: EquipmentStore
    @State private var search = ""
    @State private var filter: ExpiryStatus?
    @State private var form: FormMode?
    @State private var showingSettings = false

    var body: some View {
        NavigationStack {
            List {
                Section {
                    SummaryTiles(filter: $filter)
                        .listRowInsets(EdgeInsets())
                        .listRowBackground(Color.clear)
                }

                ForEach(ExpiryStatus.allCases) { status in
                    let rows = visibleItems(status)
                    if !rows.isEmpty {
                        Section("\(status.title) (\(rows.count))") {
                            ForEach(rows) { item in
                                Button { form = .edit(item) } label: { EquipmentRow(item: item) }
                                    .tint(.primary)
                                    .swipeActions(edge: .leading) {
                                        Button { form = .replace(item) } label: {
                                            Label("Replaced", systemImage: "arrow.triangle.2.circlepath")
                                        }
                                        .tint(.teal)
                                    }
                            }
                            .onDelete { offsets in
                                store.delete(ids: Set(offsets.map { rows[$0].id }))
                            }
                        }
                    }
                }
            }
            .overlay { emptyState }
            .searchable(text: $search, prompt: "Name, category, location, lot")
            .navigationTitle("Equipment")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button { showingSettings = true } label: { Label("Settings", systemImage: "gearshape") }
                }
                ToolbarItem(placement: .primaryAction) {
                    Button { form = .add } label: { Label("Add equipment", systemImage: "plus") }
                }
            }
            .sheet(item: $form) { mode in
                EquipmentFormView(mode: mode)
            }
            .sheet(isPresented: $showingSettings) {
                SettingsView()
            }
        }
    }

    private func visibleItems(_ status: ExpiryStatus) -> [EquipmentItem] {
        if let filter, filter != status { return [] }
        let rows = store.items(with: status)
        let query = search.trimmingCharacters(in: .whitespaces)
        guard !query.isEmpty else { return rows }
        return rows.filter {
            [$0.name, $0.category, $0.location, $0.lot, $0.notes].contains { $0.localizedCaseInsensitiveContains(query) }
        }
    }

    @ViewBuilder
    private var emptyState: some View {
        if store.items.isEmpty {
            ContentUnavailableView {
                Label("No equipment yet", systemImage: "cross.case")
            } description: {
                Text("Add your equipment and its expiry dates. You'll be reminded before anything expires.")
            } actions: {
                Button("Add equipment") { form = .add }
                    .buttonStyle(.borderedProminent)
            }
        } else if ExpiryStatus.allCases.allSatisfy({ visibleItems($0).isEmpty }) {
            ContentUnavailableView.search
        }
    }
}

private struct SummaryTiles: View {
    @EnvironmentObject private var store: EquipmentStore
    @Binding var filter: ExpiryStatus?

    var body: some View {
        HStack(spacing: 10) {
            ForEach(ExpiryStatus.allCases) { status in
                let selected = filter == status
                Button {
                    filter = selected ? nil : status
                } label: {
                    VStack(alignment: .leading, spacing: 4) {
                        Image(systemName: status.symbol)
                            .foregroundStyle(status.color)
                        Text("\(store.items(with: status).count)")
                            .font(.title.bold())
                            .monospacedDigit()
                        Text(status == .dueSoon ? "Due ≤ \(store.warnDays)d" : status.title)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(12)
                    .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 12))
                    .overlay {
                        RoundedRectangle(cornerRadius: 12)
                            .strokeBorder(selected ? status.color : .clear, lineWidth: 2)
                    }
                }
                .buttonStyle(.plain)
                .accessibilityLabel("\(store.items(with: status).count) \(status.title)")
                .accessibilityAddTraits(selected ? .isSelected : [])
            }
        }
        .padding(.vertical, 4)
    }
}

struct EquipmentRow: View {
    @EnvironmentObject private var store: EquipmentStore
    let item: EquipmentItem

    var body: some View {
        let status = item.status(warnDays: store.warnDays)
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: status.symbol)
                .foregroundStyle(status.color)
                .font(.title3)
            VStack(alignment: .leading, spacing: 3) {
                Text(item.name)
                    .font(.headline)
                Text(item.detailLine)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                Text("Expiry: \(item.expiry.formatted(date: .abbreviated, time: .omitted))")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                Text(item.dueText)
                    .font(.caption.bold())
                    .foregroundStyle(status.color)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 2)
                    .background(status.color.opacity(0.15), in: Capsule())
                    .padding(.top, 2)
            }
        }
        .padding(.vertical, 2)
    }
}
