# Suhail — AI Context File

> This file is for AI coding assistants (Claude, GPT, Copilot, etc.) to understand the Suhail project. Read this before making any changes.

## What is Suhail?

Suhail is an AI-powered assistive app for **visually impaired users**, built for **Mentra Live** smart glasses. It captures images from the glasses camera, processes them through cloud AI APIs, and speaks results back to the user. It is a graduation project (SWE 496, King Saud University).

**Critical constraint:** Mentra Live glasses have a camera, microphone, and speakers, but **NO display**. All output MUST go through `session.audio.speak()`. Never use `session.layouts` — it does not exist on this hardware.

## Tech Stack

- **Runtime:** Bun (not Node.js) — use `bun run start`, `bun install`, etc.
- **Language:** TypeScript (strict mode)
- **SDK:** `@mentra/sdk` (MentraOS TypeScript SDK)
- **Package manager:** Bun
- **Storage:** In-memory (no database yet — planned: SQLite or Firebase)
- **AI services:** Currently all mocked. Planned: OpenAI GPT-4o, Google Cloud Vision, Azure Face API

## How MentraOS Works

MentraOS apps are **server-side TypeScript applications**. The architecture:

```
Mentra Live Glasses ←→ User's Phone (Mentra App) ←→ WebSocket (Mentra Relay) ←→ YOUR SERVER
```

1. Your server extends `AppServer` from `@mentra/sdk`
2. When a user connects, `onSession(session, sessionId, userId)` is called
3. You register event listeners on the `session` object
4. You receive events (voice, buttons, photos) and send back audio responses

### Key SDK APIs

```typescript
// Extend this to create your app
class MyApp extends AppServer {
  // Called when a user connects — this is your entry point
  override async onSession(session: AppSession, sessionId: string, userId: string): Promise<void> { }
}

// Constructor config
new AppServer({
  packageName: "com.suhail.assistant",  // Must match Mentra developer portal
  apiKey: "your_mentra_api_key",
  port: 3000,
});

// Start the server
app.start();
```

### Session Events

```typescript
// Voice transcription from microphone (speech-to-text done by Mentra)
session.events.onTranscription((data: TranscriptionData) => {
  // data.text — the transcribed text (string)
  // data.isFinal — boolean, true when transcription is complete (ALWAYS check this)
  // data.confidence — optional confidence score
  // data.detectedLanguage — optional detected language
});

// Physical button press on the glasses
session.events.onButtonPress((event: ButtonPress) => {
  // event.buttonId — "left" or "right" (string)
  // event.pressType — "short" or "long"
});
```

### Camera

```typescript
// Request a photo from the glasses camera
const photoData = await session.camera.requestPhoto(options?);
// Returns: PhotoData { buffer: Buffer, mimeType: string, filename: string, size: number, timestamp: Date }
// Options: { size?: "small"|"medium"|"large"|"full", saveToGallery?: boolean, compress?: "none"|"medium"|"heavy" }

// IMPORTANT: The SDK returns a Buffer, NOT a base64 string.
// Convert with: photoData.buffer.toString("base64")
// The method is requestPhoto(), NOT takePhoto()
```

### Audio Output (TTS)

```typescript
// Speak text through the glasses speakers (uses ElevenLabs TTS)
await session.audio.speak(text: string, options?: SpeakOptions);
// Options: { voice_id?, model_id?, voice_settings?: { stability, similarity_boost, speed }, volume? }

// Play audio from a URL
await session.audio.playUrl(url: string);
```

### Things That Do NOT Exist on Mentra Live

- `session.layouts` — NO DISPLAY, do not use
- `session.display` — does not exist
- `session.screen` — does not exist
- Any visual UI — the glasses are audio-only

## Project Structure

```
suhail/
├── src/
│   ├── index.ts                  # Entry point — creates SuhailApp and calls app.start()
│   ├── app.ts                    # SuhailApp class (extends AppServer) — session handling, event routing
│   ├── commands/
│   │   ├── command-router.ts     # routeCommand(text) → { command, params } — keyword matching
│   │   ├── scene-summarize.ts    # "Describe my surroundings" → photo → vision LLM → speak
│   │   ├── ocr-read-text.ts      # "Read this text" → photo → OCR → speak
│   │   ├── face-recognize.ts     # "Who is this?" → photo → face API → speak name
│   │   ├── face-enroll.ts        # "Enroll this person" → photo → ask name → save (stateful, 2-step)
│   │   ├── find-object.ts        # "Find my keys" → photo → object detection → speak location
│   │   ├── currency-recognize.ts # "Count money" → photo → vision LLM → speak denomination
│   │   ├── visual-qa.ts          # Any question → photo + question → vision LLM → speak answer
│   │   └── color-detect.ts       # "What color is this?" → photo → color analysis → speak color
│   ├── services/
│   │   ├── ai-handler.ts         # AIHandler class — unified facade that routes to specific services
│   │   ├── vision-service.ts     # GPT-4o vision calls (scene, VQA, currency, object detection, color)
│   │   ├── ocr-service.ts        # Google Cloud Vision OCR
│   │   ├── face-service.ts       # Azure Face API (recognition + enrollment) + in-memory face database
│   │   └── tts-service.ts        # speak(), speakBilingual(), localize(), common messages
│   ├── utils/
│   │   ├── config.ts             # Environment variables (all from process.env with defaults)
│   │   ├── logger.ts             # Logger class with tag-based [Tag] prefix logging
│   │   └── image-utils.ts        # capturePhoto(session) → base64 string, base64 helpers
│   └── types/
│       └── index.ts              # All shared interfaces and types
├── .env.example                  # Environment variable template
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

## Architecture & Data Flow

### Request Flow (Voice Command)

```
User speaks → Mentra glasses mic → Mentra STT → onTranscription(data)
  → check data.isFinal (skip partial transcriptions)
  → check pending face enrollment (intercept if waiting for name)
  → routeCommand(data.text) → { command: CommandType, params }
  → handlers[command].execute(session, params)
    → speakBilingual(session, messages.processing)  // "Processing..."
    → capturePhoto(session)                          // Camera → Buffer → base64
    → ai.someMethod(base64Image)                     // AI service (currently mocked)
    → speak(session, result)                         // Speak result to user
```

### Request Flow (Button Press)

```
User presses button → onButtonPress(event)
  → event.buttonId: "right" | "left"
  → event.pressType: "short" | "long"
  → Route to handler:
      right + short → Scene Summarization
      right + long  → Face Recognition
      left  + short → OCR / Read Text
      left  + long  → Repeat last response
```

### Command Handler Pattern

Every command handler implements the `CommandHandler` interface:

```typescript
interface CommandHandler {
  execute(session: AppSession, params?: Record<string, string>): Promise<void>;
}
```

Standard handler flow:
1. Speak "Processing..." feedback
2. Capture photo via `capturePhoto(session)` — returns base64 or null
3. If null, speak "Camera not available" and return
4. Call AI service via `AIHandler`
5. Speak the result
6. Catch errors and speak "Sorry, I couldn't process that"

### Face Enrollment (Special — Stateful, 2-Step)

Face enrollment is the only stateful command. It works across two transcriptions:

1. User says "enroll this person" → captures photo, stores in `pendingEnrollments` Map, asks "say the name"
2. User says "Abdullah" → `app.ts` checks `hasPendingEnrollment(sessionId)`, passes name to complete enrollment
3. Face is saved to in-memory `faceDatabase` array

The state machine lives in `FaceEnrollCommand.pendingEnrollments: Map<sessionId, base64Photo>`.

## Voice Command Routing (command-router.ts)

The router uses **keyword matching** (case-insensitive). Routes are checked in order — first match wins.

| Priority | Command | Keywords (any match) | Notes |
|----------|---------|---------------------|-------|
| 1 | face-enroll | "enroll", "save face", "remember this person" | Arabic: "سجل", "احفظ" |
| 2 | face-recognize | "who is this", "who is in front" | Also checks requiredAll: ["who"]. Arabic: "من هذا", "من قدامي" |
| 3 | scene-summarize | "describe", "surroundings", "what's around" | Arabic: "وصف", "حولي", "ايش حولي" |
| 4 | ocr-read-text | "read", "text" | Arabic: "اقرأ", "نص" |
| 5 | find-object | "find", "where is" | Extracts object name via regex. Arabic: "وين", "ابحث" |
| 6 | currency-recognize | "money", "currency", "bill" | Arabic: "فلوس", "عملة" |
| 7 | color-detect | "color", "colour" | Arabic: "لون" |
| fallback | visual-qa | (anything unmatched) | Sends transcription as the question |

The router supports two matching modes:
- `keywords[]` — OR logic (any keyword triggers the route)
- `requiredAll[]` — AND logic (all must match)
- `extractParams(text)` — optional function to pull params from the text (used by find-object)

## Bilingual Support (Arabic/English)

The app supports Arabic and English via `BilingualMessage` objects:

```typescript
interface BilingualMessage { ar: string; en: string; }

// Usage
await speakBilingual(session, { ar: "جاري المعالجة...", en: "Processing..." });
// Selects language based on config.defaultLanguage (from DEFAULT_LANGUAGE env var, default: "ar")
```

Common messages are defined in `src/services/tts-service.ts` as the `messages` object (welcome, processing, cameraError, generalError, noResult, repeatNoHistory).

## Services Layer

### AI Handler (ai-handler.ts)
Facade class that routes to specific services. All command handlers use this instead of calling services directly.

### Vision Service (vision-service.ts) — ALL MOCKED
Handles 5 different vision tasks through GPT-4o (planned):
- `describeScene(base64)` → scene description for blind users
- `answerVisualQuestion(base64, question)` → VQA
- `recognizeCurrency(base64)` → money denomination
- `detectObject(base64, targetName)` → object location (e.g., "to your right, on the table")
- `detectColor(base64)` → dominant color name + hex

### OCR Service (ocr-service.ts) — MOCKED
- `extractText(base64)` → Google Cloud Vision TEXT_DETECTION (planned)

### Face Service (face-service.ts) — MOCKED
- `recognizeFace(base64)` → compare against in-memory database
- `enrollFace(name, base64)` → extract embedding + store in `faceDatabase[]`
- `extractFaceEmbedding(base64)` → returns mock 128-dim vector
- `getEnrolledCount()` → returns count
- Azure Face API integration planned

### TTS Service (tts-service.ts) — WORKING
- `speak(session, text)` → wraps `session.audio.speak()` with logging + error handling
- `speakBilingual(session, message)` → selects language from config
- `localize(message)` → returns string for current language

## Environment Variables

Defined in `src/utils/config.ts`, loaded from `.env`:

| Variable | Purpose | Default |
|----------|---------|---------|
| `PACKAGE_NAME` | MentraOS app identifier | `com.suhail.assistant` |
| `MENTRAOS_API_KEY` | MentraOS authentication | (empty) |
| `PORT` | Server port | `3000` |
| `OPENAI_API_KEY` | GPT-4o vision API | (empty) |
| `GOOGLE_CLOUD_VISION_API_KEY` | OCR API | (empty) |
| `AZURE_FACE_API_KEY` | Face recognition | (empty) |
| `AZURE_FACE_ENDPOINT` | Face API endpoint | (empty) |
| `DEFAULT_LANGUAGE` | Response language ("ar" or "en") | `ar` |
| `CONFIDENCE_THRESHOLD` | Min confidence for results | `0.85` |

## Current State of the Project

All AI service calls are **mocked** with placeholder data. The app structure, types, routing, event handling, and TTS are fully working.

### What's Done
- Full MentraOS SDK integration (AppServer, sessions, events, camera, audio)
- Voice command routing with keyword matching (Arabic + English)
- Button press handling (4 mappings)
- All 8 command handlers with proper error handling
- Bilingual TTS (Arabic/English)
- Face enrollment state machine (2-step conversational flow)
- In-memory face database
- Logger, config, image utils

### What Needs Real Implementation (TODO)
Each of these is marked with `// TODO` comments in the service files:
1. **vision-service.ts** — Replace mocks with real OpenAI GPT-4o API calls (scene, VQA, currency, object, color)
2. **ocr-service.ts** — Replace mock with real Google Cloud Vision API call
3. **face-service.ts** — Replace mock with real Azure Face API (detect, identify, extract embedding)
4. **face-service.ts** — Replace in-memory `faceDatabase[]` with SQLite or Firebase
5. **command-router.ts** — Optionally upgrade keyword matching to NLP-based intent detection

## Rules for Contributing

1. **Audio only** — never reference displays, screens, or visual UI. All output goes through `session.audio.speak()`
2. **Always give feedback** — speak "Processing..." before any long operation, then speak the result or error
3. **Always handle camera failure** — `capturePhoto()` can return null, speak "Camera not available"
4. **Always catch errors** — every handler wraps its logic in try/catch and speaks a friendly error
5. **Use the CommandHandler interface** — `execute(session: AppSession, params?: Record<string, string>): Promise<void>`
6. **Use AIHandler facade** — don't call services directly from command handlers
7. **Use speakBilingual for common messages** — define `{ ar: "...", en: "..." }` pairs
8. **Use the Logger** — `new Logger("TagName")` for consistent `[TagName]` prefixed logging
9. **Use capturePhoto()** from `utils/image-utils.ts` — it handles the SDK's `requestPhoto()`, Buffer→base64 conversion, and error handling
10. **Keep it simple** — this is a graduation project. No over-engineering.

## Adding a New Command

1. Create `src/commands/my-command.ts` implementing `CommandHandler`
2. Add the command type to `CommandType` union in `src/types/index.ts`
3. Add keyword route to `routes[]` array in `src/commands/command-router.ts`
4. Register the handler in `this.handlers` map in `src/app.ts` constructor
5. Optionally add a button mapping in `handleButtonPress()` in `src/app.ts`
6. If it needs a new AI service, add it to `src/services/` and expose through `AIHandler`

## Commands Quick Reference

```bash
bun install           # Install dependencies
bun run start         # Start server
bun run dev           # Start with --watch (auto-restart)
bun run typecheck     # TypeScript type checking
ngrok http 3000       # Expose local server (needed for Mentra connection)
```
