# Core Capability: Local Typeless

## ADDED Requirements

### Requirement: Audio Capture and Voice Detection
The system SHALL capture audio from the system microphone and detect speech using VAD.

#### Scenario: Speech detection starts recording
- **WHEN** the user speaks into the microphone
- **THEN** the system detects voice activity within 100ms
- **AND** begins buffering audio for transcription

#### Scenario: Silence ends recording segment
- **WHEN** the user stops speaking for 500ms
- **THEN** the system marks the speech segment as complete
- **AND** sends the audio to the ASR engine

### Requirement: Speech-to-Text Transcription
The system SHALL transcribe speech to text using local Whisper ASR.

#### Scenario: Successful transcription
- **WHEN** an audio segment is received by the ASR engine
- **THEN** the system transcribes the audio to raw text
- **AND** preserves mixed Chinese/English content verbatim

#### Scenario: Real-time feedback
- **WHEN** transcription is in progress
- **THEN** the system streams partial results to the UI
- **AND** updates the display within 200ms

### Requirement: Text Rewriting
The system SHALL rewrite raw transcripts into polished text using local LLM.

#### Scenario: Filler word removal
- **WHEN** the raw transcript contains filler words (um, uh, 那個, 就是)
- **THEN** the system removes them from the output
- **AND** preserves the original meaning

#### Scenario: Self-correction handling
- **WHEN** the user self-corrects during speech (e.g., "I want... no, I need")
- **THEN** the system outputs only the final intent ("I need")

#### Scenario: Code-switching preservation
- **WHEN** the user mixes Chinese and English
- **THEN** the system preserves the language mixing
- **AND** applies proper spacing between languages

### Requirement: Text Injection
The system SHALL inject rewritten text into the active application.

#### Scenario: Inject into active window
- **WHEN** text rewriting is complete
- **THEN** the system types the text into the currently focused application
- **AND** simulates natural typing behavior

### Requirement: Floating Widget UI
The system SHALL provide a minimal floating widget for status display.

#### Scenario: Show recording status
- **WHEN** the system is recording speech
- **THEN** the widget displays a recording indicator with waveform

#### Scenario: Show processing status
- **WHEN** ASR or LLM processing is active
- **THEN** the widget shows a processing indicator

### Requirement: Global Hotkey Activation
The system SHALL activate recording via global hotkey.

#### Scenario: Hotkey triggers recording
- **WHEN** the user presses the configured global hotkey
- **THEN** the system begins listening for speech
- **AND** shows the floating widget

### Requirement: Privacy-First Operation
The system SHALL operate entirely offline with no data transmission.

#### Scenario: Offline operation
- **WHEN** the device has no network connection
- **THEN** all features continue to function normally

#### Scenario: No data transmission
- **WHEN** speech is processed
- **THEN** no audio or text data is transmitted to external servers
