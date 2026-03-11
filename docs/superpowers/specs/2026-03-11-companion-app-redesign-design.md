# Suhail Companion App — Redesign Spec

## Overview

Complete overhaul of `public/index.html` from an admin dashboard into a modern 4-tab single-page companion app. Dark navy theme (#0D111C) with cyan accents (#06B6D4), matching the Part-1 graduation project aesthetic. Functional-only approach: every screen maps to real backend functionality.

The existing Face Contact Book (AWS Rekognition) is preserved and adapted to the new UI.

## Design Decisions

- **Option B: Status + Command List** chosen for Home tab (informational, not app-launcher)
- **Photo Cards** chosen for Contacts tab (shows enrolled photo thumbnails, recognition count)
- **No built-in screen reader** — relies on OS-level TalkBack/VoiceOver per accessibility standards
- **Semantic HTML + ARIA** for screen reader compatibility
- **Voice output settings** exposed (speed, volume, voice preset) since SDK supports them

## Architecture

Single-page app with client-side tab switching. No framework — vanilla HTML/CSS/JS in one file (`public/index.html`). Communicates with existing Express API endpoints plus new settings endpoints.

```
public/index.html (SPA)
  ├── Tab: Home ──────── GET /api/status (polls 5s)
  ├── Tab: Contacts ──── GET /api/faces, GET /api/faces/:faceId/photo
  │                      PUT /api/faces/:faceId, DELETE /api/faces/:faceId
  ├── Tab: Activity ──── GET /api/activity (polls 5s)
  └── Tab: Settings ──── GET/PUT /api/settings (new)
```

## Tab 1: Home (Status + Command List)

- Connection status banner: gradient card showing Connected/Disconnected + battery %
- Voice commands list: scrollable list of all available commands with icons and example phrases
  - Describe Scene — "What's around me?"
  - Recognize Face — "Who is this?"
  - Read Text — "Read this"
  - Find Object — "Find my keys"
  - Currency — "Count money"
  - Color — "What color is this?"
  - Enroll Face — "Remember this person"
- Polls `/api/status` every 5s for live updates

## Tab 2: Contacts (Photo Cards)

- Search bar at top for filtering by name
- Photo card list per contact:
  - Enrolled photo thumbnail (52px rounded square, colored border)
  - Name, enrollment date, recognition count
  - Tap to open detail view
- Detail view modal:
  - Full-size enrolled photo
  - Rename button (calls `PUT /api/faces/:faceId`)
  - Delete button with confirmation (calls `DELETE /api/faces/:faceId`)
- Fetches from existing `GET /api/faces` and `GET /api/faces/:faceId/photo`
- Polls every 30s for updates

## Tab 3: Activity

- Chronological feed of processed commands
- Color-coded left border per command type:
  - Cyan (#06B6D4) — scene description
  - Purple (#a855f7) — face recognition/enrollment
  - Green (#22c55e) — OCR/text reading
  - Amber (#f59e0b) — currency recognition
  - Blue (#3b82f6) — object finding
  - Pink (#ec4899) — color detection
- Each entry: timestamp, command name, result preview (truncated)
- Polls `/api/activity` every 5s

## Tab 4: Settings

### Device (read-only)
- Battery level (from status API)
- Connection status

### Voice Output (new functionality)
- **Speech Speed** — slider, 0.5x to 2.0x, default 1.0x
- **Volume** — slider, 0% to 100%, default 80%
- **Voice Preset** — picker with options: Default (Female), Male, Female
  - Maps to hardcoded ElevenLabs voice IDs

### App
- **Language** — toggle between Arabic and English

### About
- Version info (Suhail v1.0.0, SWE 496)

## Backend Changes

### New API Endpoints

```
GET  /api/settings          — returns current settings object
PUT  /api/settings          — updates settings (partial update)
```

Settings payload:
```json
{
  "speechSpeed": 1.0,
  "volume": 0.8,
  "voicePreset": "default",
  "language": "ar"
}
```

### TTS Service Changes (`src/services/tts-service.ts`)

Modify `speak()` to pass `SpeakOptions` to `session.audio.speak()`:

```typescript
await session.audio.speak(text, {
  voice_id: getVoiceId(settings.voicePreset),
  voice_settings: {
    speed: settings.speechSpeed,
  },
  volume: settings.volume,
});
```

### Storage

Settings stored via in-memory object with defaults. Could later use `session.simpleStorage` for persistence.

## Visual Design System

### Colors
- Background: #0D111C (dark navy)
- Card/surface: #1a1f2e
- Card border/divider: #252a3a
- Primary accent: #06B6D4 (cyan)
- Text primary: #fff / #e2e8f0
- Text secondary: #94a3b8
- Text muted: #64748b
- Success: #22c55e
- Command colors: cyan, purple, green, amber, blue, pink (per command type)

### Components
- Bottom navigation bar with 4 tabs (icon + label)
- Active tab highlighted in cyan
- Cards with rounded corners (12px)
- Sliders with cyan gradient fill and glowing thumb
- Search bar with search icon
- Modals for detail views

### Typography
- System font stack (system-ui, sans-serif)
- Headings: 16-18px, weight 700
- Body: 12-13px, weight 500-600
- Labels: 10-11px, uppercase, letter-spacing 1px
- Muted text: 9-10px

## Accessibility

- Semantic HTML: `<nav>`, `<button>`, `<header>`, `<main>`, `<section>`, `<input>`
- ARIA: `aria-label` on interactive elements, `aria-live="polite"` on status regions, `role` attributes
- Focus management: visible focus rings, logical tab order
- RTL support: Arabic layout mirrors for right-to-left
- High contrast: inherent in dark navy + bright cyan/white theme
- No custom screen reader — relies on TalkBack/VoiceOver

## Bilingual Support

- All UI text has Arabic and English variants
- Language selection in Settings controls:
  1. UI text language (client-side)
  2. TTS response language (sent to backend via settings API)
- RTL layout applied when Arabic is selected
