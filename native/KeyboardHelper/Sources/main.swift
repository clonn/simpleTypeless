import Cocoa
import Foundation

func sendEvent(_ type: String, keyCode: Int64, flags: [String]) {
    let event: [String: Any] = [
        "type": type,
        "keyCode": keyCode,
        "flags": flags
    ]
    if let data = try? JSONSerialization.data(withJSONObject: event),
       let json = String(data: data, encoding: .utf8) {
        print(json)
        fflush(stdout)
    }
}

func flagsToArray(_ flags: CGEventFlags) -> [String] {
    var result: [String] = []
    if flags.contains(.maskCommand) { result.append("command") }
    if flags.contains(.maskShift) { result.append("shift") }
    if flags.contains(.maskControl) { result.append("control") }
    if flags.contains(.maskAlternate) { result.append("alt") }
    return result
}

let eventMask: CGEventMask = (1 << CGEventType.keyDown.rawValue)
    | (1 << CGEventType.keyUp.rawValue)
    | (1 << CGEventType.flagsChanged.rawValue)

guard let eventTap = CGEvent.tapCreate(
    tap: .cgSessionEventTap,
    place: .headInsertEventTap,
    options: .listenOnly,
    eventsOfInterest: eventMask,
    callback: { _, type, event, _ -> Unmanaged<CGEvent>? in
        let keyCode = event.getIntegerValueField(.keyboardEventKeycode)
        let flags = flagsToArray(event.flags)

        switch type {
        case .keyDown:
            sendEvent("keyDown", keyCode: keyCode, flags: flags)
        case .keyUp:
            sendEvent("keyUp", keyCode: keyCode, flags: flags)
        case .flagsChanged:
            sendEvent("flagsChanged", keyCode: keyCode, flags: flags)
        default:
            break
        }

        return Unmanaged.passRetained(event)
    },
    userInfo: nil
) else {
    fputs("{\"error\":\"Failed to create event tap. Accessibility permission required.\"}\n", stderr)
    exit(1)
}

let runLoopSource = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, eventTap, 0)
CFRunLoopAddSource(CFRunLoopGetCurrent(), runLoopSource, .commonModes)
CGEvent.tapEnable(tap: eventTap, enable: true)

fputs("{\"status\":\"ready\"}\n", stdout)
fflush(stdout)

CFRunLoopRun()
