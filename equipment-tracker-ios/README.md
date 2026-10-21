# Equipment Tracker (iPhone app)

A native iPhone/iPad app (SwiftUI) for tracking medical equipment and its expiry dates.
It is separate from the Clinical Tracker web app in this repository.

## Features

- **Equipment list** grouped into **Expired**, **Due soon** and **In date**, sorted by expiry date,
  with colour-coded status ("Expires in 10 days", "Expired 3 days ago").
- **Summary tiles** at the top: tap one to filter the list by that status. Search by name,
  category, location, lot or notes.
- **Add / edit** an item: name, expiry date, category and location (with suggestions from
  values you've already used), quantity, lot / batch / serial number, and notes.
- **Replaced**: swipe right on an item after restocking. It keeps the item's details and asks for the
  new expiry date and lot. Swipe left to delete.
- **Expiry notifications** scheduled on the phone itself, so they arrive even when the app is
  closed. No server or internet connection is needed:
  - when an item is N days from expiry (choose 7 / 14 / 30 / 60 / 90 / 180 days in Settings),
  - on its expiry date,
  - the day after it expires.
  You also choose the time of day the alerts arrive. The app icon badge shows how many items
  need attention.
- **Export CSV** from Settings (opens in Excel / Numbers, or send by email).
- Data is stored only on the device and is included in its iCloud or computer backup.

## Running it

The app is a **Swift Playgrounds app package** (`EquipmentTracker.swiftpm`). It opens in:

- **Swift Playgrounds on an iPad** (free, from the App Store). Copy the
  `EquipmentTracker.swiftpm` folder to the iPad (iCloud Drive or Files), open it in Swift
  Playgrounds, and tap ▶︎ Run. To put it on the App Store / TestFlight from the iPad you need
  an Apple Developer Program membership.
- **Xcode on a Mac** (your own, a borrowed one, or a rented cloud Mac). Open the
  `EquipmentTracker.swiftpm` folder in Xcode, choose your iPhone as the run destination,
  select your Apple ID team under *Signing & Capabilities*, and press Run.

Before installing, change `bundleIdentifier` in `Package.swift` from
`com.example.EquipmentTracker` to something unique, e.g. `com.yourname.EquipmentTracker`.

Requires iOS / iPadOS 17 or later.

## Code layout

| File | Purpose |
| --- | --- |
| `EquipmentTrackerApp.swift` | App entry point; refreshes statuses when the app is opened |
| `EquipmentItem.swift` | The equipment record and expiry status logic |
| `EquipmentStore.swift` | Saves/loads the list (JSON in Documents), settings, CSV export |
| `Reminders.swift` | Schedules local expiry notifications and the app badge |
| `EquipmentListView.swift` | Main list, summary tiles, search, swipe actions |
| `EquipmentFormView.swift` | Add / edit / replaced form |
| `SettingsView.swift` | Alert settings, notification permission, CSV export |

The `Equipment Tracker iOS build` GitHub Actions workflow compiles the app on a macOS runner
on every change to this folder.
