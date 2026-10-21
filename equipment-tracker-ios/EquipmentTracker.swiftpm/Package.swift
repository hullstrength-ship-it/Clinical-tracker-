// swift-tools-version: 5.9

// Swift Playgrounds / Xcode app package. Open this folder in Swift Playgrounds (iPad or Mac)
// or in Xcode to run it. Change bundleIdentifier to something unique to you before installing.

import PackageDescription
import AppleProductTypes

let package = Package(
    name: "Equipment Tracker",
    platforms: [
        .iOS("17.0")
    ],
    products: [
        .iOSApplication(
            name: "Equipment Tracker",
            targets: ["AppModule"],
            bundleIdentifier: "com.example.EquipmentTracker",
            teamIdentifier: "",
            displayVersion: "1.0",
            bundleVersion: "1",
            appIcon: .placeholder(icon: .calendar),
            accentColor: .presetColor(.teal),
            supportedDeviceFamilies: [
                .pad,
                .phone
            ],
            supportedInterfaceOrientations: [
                .portrait,
                .landscapeRight,
                .landscapeLeft,
                .portraitUpsideDown(.when(deviceFamilies: [.pad]))
            ]
        )
    ],
    targets: [
        .executableTarget(
            name: "AppModule",
            path: "."
        )
    ]
)
