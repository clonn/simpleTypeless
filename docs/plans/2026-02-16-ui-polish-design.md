# UI Polish & UX Design

## Goal
Improve the visual quality, layout, and user experience of Local Typeless to match Typeless.app production standards. Focus on sidebar navigation, floating widget redesign, consistent styling, and refined animations.

## Architecture
The main window transitions from a flat tab bar to a sidebar + content panel layout. The floating widget gets a glass-morphism redesign with live audio waveform. All inline styles are consolidated into the CSS variable system. Animations get smoother easing and state-aware transitions.

## Current State vs Target

| Area | Current | Target |
|------|---------|--------|
| Navigation | Tab bar (Status/Models/Settings) | Sidebar with icons + labels |
| Widget | 200x60, basic dot + text | 280x56, glass blur, live waveform, transcript preview |
| ModelStatusPanel | Inline styles throughout | CSS classes using design tokens |
| StatusIndicator | Basic circle + pulse | Refined orb with layered glow |
| Settings | Long scroll, no grouping | Sectioned cards with visual hierarchy |
| Footer | Text-only status | Hidden (info moves to sidebar) |
| Transitions | Abrupt tab switches | Fade/slide content transitions |

## Design Sections

### 1. Sidebar Navigation Layout

Replace the header tab-bar with a left sidebar:

```
+--------+----------------------------------+
| [icon] |                                  |
| Status |    Content Area                  |
|        |                                  |
| [icon] |    (StatusIndicator +            |
| Models |     TranscriptionHistory)        |
|        |                                  |
| [icon] |                                  |
| Settings                                 |
|        |                                  |
+--------+                                  |
| ASR: ok|                                  |
| LLM: ok|                                  |
+--------+----------------------------------+
```

- Sidebar width: 180px (collapsible to 56px icon-only)
- Background: `var(--bg-secondary)` with `border-right`
- Active item: accent left-border indicator + lighter background
- Bottom: compact model status indicators
- Remove header and footer entirely

### 2. Floating Widget Redesign

Expand to 280x56 with glass morphism:

```
+------------------------------------------+
| [pulse dot]  Listening...  [|||||waveform]|
+------------------------------------------+
```

- Size: 280x56
- Background: `rgba(26, 26, 46, 0.85)` with `backdrop-filter: blur(20px)`
- Border: `1px solid rgba(255, 255, 255, 0.08)`
- Shadow: `0 8px 32px rgba(0, 0, 0, 0.4)`
- Waveform: 8 bars with realistic audio-driven heights (via CSS custom properties from IPC)
- Status dot: 10px with color-coded glow shadow
- Text: truncated transcript preview (last 40 chars)
- Rounded corners: 14px
- Draggable via `-webkit-app-region: drag`

### 3. StatusIndicator Refinement

Replace flat circle with layered orb effect:

- Outer glow ring (blurred, color-coded)
- Inner gradient circle (subtle radial gradient)
- Center icon (mic icon using Unicode or SVG)
- States:
  - Ready: dim blue-grey glow, static
  - Recording: red pulsing glow (2 layers: fast inner + slow outer)
  - Processing: amber rotating gradient + processing spinner

Button: pill-shaped with icon + text, not just text.

### 4. Consistent Styling System

Convert ModelStatusPanel from inline styles to CSS classes:

New CSS classes to add:
- `.model-card` - replaces inline styles on ModelCard wrapper
- `.model-card-header` - flex row for title + status
- `.model-card-status` - colored status text
- `.model-card-name` - model file name
- `.model-card-progress` - progress bar container
- `.model-card-progress-fill` - animated fill bar
- `.model-card-download-btn` - download button

Add new CSS variables:
```css
--radius-sm: 4px;
--radius-md: 8px;
--radius-lg: 12px;
--transition-fast: 0.15s ease;
--transition-normal: 0.25s ease;
--shadow-sm: 0 1px 3px rgba(0,0,0,0.2);
--shadow-md: 0 4px 12px rgba(0,0,0,0.3);
--shadow-lg: 0 8px 32px rgba(0,0,0,0.4);
```

### 5. Settings Panel Cards

Reorganize settings into card-based sections:

```
+----------------------------------+
| General Settings                 |
| +------------------------------+ |
| | Hotkey     [Cmd+Shift+Space] | |
| | Auto-inject        [toggle]  | |
| | Widget             [toggle]  | |
| | Sounds             [toggle]  | |
| +------------------------------+ |
|                                  |
| Speech Recognition               |
| +------------------------------+ |
| | [x] Local Whisper    [ok/x]  | |
| | [ ] macOS Dictation          | |
| | [ ] Cloud OpenAI             | |
| |   [Test Recognition]         | |
| +------------------------------+ |
|                                  |
| Writing Mode                     |
| +-----+ +-----+ +-----+ +-----+|
| |Gen. | |Email| |Code | |Notes||
| +-----+ +-----+ +-----+ +-----+|
+----------------------------------+
```

Each section gets:
- Card background: `var(--bg-secondary)` with `var(--radius-lg)` and `var(--shadow-sm)`
- Section header: bold, no border, slightly larger
- Spacing: `gap: 16px` between cards, `12px` internal padding

### 6. Content Transitions

Add smooth transitions when switching views:

- CSS-only approach using opacity + transform
- Active view: `opacity: 1; transform: translateX(0)`
- Entering view: `opacity: 0; transform: translateX(8px)` -> animate in
- Duration: 200ms ease-out

### 7. TranscriptionHistory Polish

- History items: subtle hover effect (background lighten)
- Timestamps: relative format ("2m ago", "1h ago")
- Empty state: centered illustration/icon + message
- App context badge: small pill showing focused app name
- Copy/delete buttons: icon-only, appear on hover

## Files to Modify

1. `src/renderer/src/App.tsx` - New sidebar layout, remove header/footer
2. `src/renderer/src/styles/global.css` - New CSS variables, sidebar styles, card styles, transitions, remove tab-bar/header/footer styles
3. `src/renderer/src/components/StatusIndicator.tsx` - Layered orb, pill button
4. `src/renderer/src/components/ModelStatusPanel.tsx` - Replace inline styles with CSS classes
5. `src/renderer/src/components/SettingsPanel.tsx` - Card-based sections
6. `src/renderer/src/components/TranscriptionHistory.tsx` - Hover effects, badges, relative time
7. `src/renderer/widget.html` - Glass morphism, wider layout, 8-bar waveform
8. `src/main/index.ts` - Update widget window dimensions (280x56)

## Success Criteria

- All inline styles in ModelStatusPanel replaced with CSS classes
- Sidebar navigation working with active state indicators
- Widget has glass-morphism effect and 8-bar waveform
- Settings panel uses card layout
- Smooth content transitions between views
- All existing tests still pass
- App builds and runs cleanly
