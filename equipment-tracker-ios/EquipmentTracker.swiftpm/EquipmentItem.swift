import SwiftUI

struct EquipmentItem: Identifiable, Codable, Hashable {
    var id = UUID()
    var name: String = ""
    var category: String = ""
    var location: String = ""
    var quantity: Int = 1
    var lot: String = ""
    var expiry: Date = Calendar.current.startOfDay(for: .now)
    var notes: String = ""
    var createdAt = Date()

    /// Whole days from today until the expiry date (negative once expired).
    func daysUntilExpiry(from now: Date = .now) -> Int {
        let cal = Calendar.current
        return cal.dateComponents([.day], from: cal.startOfDay(for: now), to: cal.startOfDay(for: expiry)).day ?? 0
    }

    /// Items are usable up to and including their expiry date.
    func status(warnDays: Int, at now: Date = .now) -> ExpiryStatus {
        let days = daysUntilExpiry(from: now)
        if days < 0 { return .expired }
        if days <= warnDays { return .dueSoon }
        return .inDate
    }

    var dueText: String {
        let days = daysUntilExpiry()
        switch days {
        case ..<(-1): return "Expired \(-days) days ago"
        case -1: return "Expired yesterday"
        case 0: return "Expires today"
        case 1: return "Expires tomorrow"
        default: return "Expires in \(days) days"
        }
    }

    var detailLine: String {
        [category, location, "Qty \(quantity)", lot.isEmpty ? "" : "Lot \(lot)"]
            .filter { !$0.isEmpty }
            .joined(separator: " · ")
    }
}

enum ExpiryStatus: Int, CaseIterable, Identifiable {
    case expired, dueSoon, inDate

    var id: Int { rawValue }

    var title: String {
        switch self {
        case .expired: return "Expired"
        case .dueSoon: return "Due soon"
        case .inDate: return "In date"
        }
    }

    var color: Color {
        switch self {
        case .expired: return .red
        case .dueSoon: return .orange
        case .inDate: return .green
        }
    }

    var symbol: String {
        switch self {
        case .expired: return "exclamationmark.octagon.fill"
        case .dueSoon: return "clock.badge.exclamationmark.fill"
        case .inDate: return "checkmark.seal.fill"
        }
    }
}
