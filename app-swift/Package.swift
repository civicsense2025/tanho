// swift-tools-version: 5.9
import PackageDescription

/// LaminaApp — the Lamina companion Swift library.
///
/// A pure-SwiftUI library target that talks to the platform's bearer-token
/// REST API v1 (envelope `{ ok, data } | { ok: false, error }`). Mirrors the
/// platform's entity models and ships feature screens. macOS 13 / iOS 16 are
/// the floor so `NavigationStack` and the modern `.task`/async-await patterns
/// are available everywhere.
let package = Package(
    name: "LaminaApp",
    platforms: [
        .macOS(.v13),
        .iOS(.v16),
    ],
    products: [
        .library(name: "LaminaApp", targets: ["LaminaApp"]),
    ],
    targets: [
        .target(name: "LaminaApp", path: "Sources/LaminaApp"),
    ]
)
