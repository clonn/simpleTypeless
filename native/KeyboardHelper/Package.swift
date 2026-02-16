// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "KeyboardHelper",
    platforms: [.macOS(.v12)],
    targets: [
        .executableTarget(
            name: "KeyboardHelper",
            path: "Sources"
        )
    ]
)
