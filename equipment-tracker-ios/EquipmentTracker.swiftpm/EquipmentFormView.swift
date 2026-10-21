import SwiftUI

struct EquipmentFormView: View {
    @EnvironmentObject private var store: EquipmentStore
    @Environment(\.dismiss) private var dismiss
    @State private var draft: EquipmentItem
    @State private var confirmingDelete = false
    private let mode: FormMode

    init(mode: FormMode) {
        self.mode = mode
        switch mode {
        case .add:
            _draft = State(initialValue: EquipmentItem())
        case .edit(let item):
            _draft = State(initialValue: item)
        case .replace(let item):
            // new stock: keep the description, ask for the new expiry date and lot
            var item = item
            item.lot = ""
            item.expiry = Calendar.current.startOfDay(for: .now)
            _draft = State(initialValue: item)
        }
    }

    private var title: String {
        switch mode {
        case .add: return "Add equipment"
        case .edit: return "Edit equipment"
        case .replace: return "Replaced"
        }
    }

    private var canSave: Bool {
        !draft.name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    var body: some View {
        NavigationStack {
            Form {
                if case .replace = mode {
                    Section {
                        Text("Enter the expiry date and lot number of the new stock.")
                            .foregroundStyle(.secondary)
                    }
                }

                Section("Item") {
                    TextField("Name (e.g. Adrenaline 1mg/1ml)", text: $draft.name)
                    SuggestingField(title: "Category", text: $draft.category, suggestions: store.suggestions(for: \.category))
                    SuggestingField(title: "Location", text: $draft.location, suggestions: store.suggestions(for: \.location))
                }

                Section {
                    DatePicker("Expiry date", selection: $draft.expiry, displayedComponents: .date)
                    let status = draft.status(warnDays: store.warnDays)
                    Label(draft.dueText, systemImage: status.symbol)
                        .foregroundStyle(status.color)
                } header: {
                    Text("Expiry")
                }

                Section("Details") {
                    Stepper("Quantity: \(draft.quantity)", value: $draft.quantity, in: 0...9999)
                    TextField("Lot / batch / serial number", text: $draft.lot)
                    TextField("Notes", text: $draft.notes, axis: .vertical)
                        .lineLimit(2...6)
                }

                if case .edit = mode {
                    Section {
                        Button("Delete equipment", role: .destructive) { confirmingDelete = true }
                    }
                }
            }
            .navigationTitle(title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        store.save(draft)
                        dismiss()
                    }
                    .disabled(!canSave)
                }
            }
            .confirmationDialog("Delete \(draft.name)?", isPresented: $confirmingDelete, titleVisibility: .visible) {
                Button("Delete", role: .destructive) {
                    store.delete(ids: [draft.id])
                    dismiss()
                }
            }
        }
    }
}

/// A text field with a menu of values already used on other items.
private struct SuggestingField: View {
    let title: String
    @Binding var text: String
    let suggestions: [String]

    var body: some View {
        HStack {
            TextField(title, text: $text)
            if !suggestions.isEmpty {
                Menu {
                    ForEach(suggestions, id: \.self) { value in
                        Button(value) { text = value }
                    }
                } label: {
                    Image(systemName: "chevron.down.circle")
                }
                .accessibilityLabel("Choose \(title.lowercased())")
            }
        }
    }
}
