# Suhail — AI Context File

> This file is for AI coding assistants (Claude, GPT, Copilot, etc.) to understand the Suhail project. Read this before making any changes.

## What is Suhail?

Suhail is an AI-powered assistive app for **visually impaired users**, built for **Mentra Live** smart glasses. It captures images from the glasses camera, processes them through cloud AI APIs, and speaks results back to the user. It is a graduation project (SWE 496, King Saud University).

**Critical constraint:** Mentra Live glasses have a camera, microphone, speakers, LEDs, and WiFi — but **NO display**. All output MUST go through `session.audio.speak()`. Do not use `session.layouts` — it exists on the session object but has no effect since Mentra Live has no screen.

## Environments

The project runs in two environments:

### Local Development
- Run the server locally with `bun run dev` (auto-restart) or `bun run start`
- Expose the local server to the internet with `ngrok http 3000`
- Copy the ngrok HTTPS URL into the Mentra Developer Console as the webhook URL
- Use `.env` file for environment variables
- Good for rapid iteration and debugging

### Production (Railway)
- The `main` branch is deployed on **Railway** (cloud hosting)
- Railway provides the public URL — no ngrok needed
- Environment variables are set in Railway's dashboard
- Push to `main` triggers automatic deployment

## Tech Stack

- **Runtime:** Bun (not Node.js) — use `bun run start`, `bun install`, etc.
- **Language:** TypeScript (strict mode)
- **SDK:** `@mentra/sdk` (MentraOS TypeScript SDK)
- **Package manager:** Bun
- **Storage:** In-memory currently. The SDK provides `session.simpleStorage` (persistent, cloud-synced key-value store, ~10MB per user) which could replace the planned SQLite/Firebase for some use cases
- **AI services:** Currently all mocked. Planned: OpenAI GPT-4o, Google Cloud Vision, Azure Face API

## Mentra Live Hardware

Mentra Live is one of several glasses models supported by MentraOS. Here's what it has:

| Feature | Mentra Live | Notes |
|---------|-------------|-------|
| Camera | 1080p (photo + video streaming) | `session.camera` |
| Microphone | Yes (with Voice Activity Detection) | `session.events.onTranscription()` |
| Speaker | Yes | `session.audio.speak()` |
| Buttons | 2 physical buttons (left + right/camera) + swipe pad | Short press + long press each |
| LEDs | RGB + White | `session.led` |
| WiFi | Yes | |
| Display | **No** | `session.layouts` has no effect |
| IMU | Not documented | |

Other glasses (Even Realities G1, Vuzix Z100) have displays but no camera/speaker. Code written for Mentra Live should never assume a display exists.

## How MentraOS Works

MentraOS apps are **server-side TypeScript applications**. The architecture:

```
Mentra Live Glasses <-> User's Phone (Mentra App) <-> MentraOS Cloud (WebSocket) <-> YOUR SERVER
```

### Session Lifecycle
1. User launches your app from the Mentra phone app
2. MentraOS Cloud sends an HTTP POST webhook to your server with `sessionId` and `userId`
3. Your server establishes a WebSocket connection to MentraOS Cloud
4. `onSession(session, sessionId, userId)` is called — this is your entry point
5. Session is active — glasses stream events, server sends audio responses
6. Session ends via: user stopping app, glasses disconnect, network error, or `session.disconnect()`
7. `onStop(sessionId, userId, reason)` is called (session object is NOT available here)

### Voice Commands — How They Work
There is **no built-in wake word or command system** from Mentra. The SDK gives you **raw transcription text** via `session.events.onTranscription()`. Your app is responsible for parsing commands from that text. The Suhail app uses keyword matching in `command-router.ts` — this is the standard pattern.

**Swipe-to-command:** The user swipes **forward** on the swipe pad to activate a ~10 second listening window. The next voice transcription is processed as a command without needing a wake word. Swiping **backward** repeats the last response. The left button also works as a fallback (short press = listen, long press = repeat). This prevents accidental triggers from background conversation and is more reliable than speech-based wake words.

## MentraOS SDK Reference

### AppServer

```typescript
import { AppServer, AppSession } from "@mentra/sdk";

class MyApp extends AppServer {
  // Called when a user connects
  override async onSession(session: AppSession, sessionId: string, userId: string): Promise<void> { }

  // Called when a session ends (session object NOT available here)
  override async onStop(sessionId: string, userId: string, reason: string): Promise<void> { }
}

// Constructor config
new AppServer({
  packageName: "com.suhail.assistant",  // Must match Mentra Developer Console
  apiKey: "your_mentra_api_key",
  port: 3000,
  publicDir: false,       // Static files directory (optional)
  healthCheck: true,      // Enable /health endpoint (optional)
});

app.start();   // Launch server
app.stop();    // Stop server
```

Additional AppServer methods:
- `getExpressApp()` — returns the underlying Express app instance
- `generateToken(userId, sessionId, secretKey)` — generates JWT for webview auth
- `addCleanupHandler(handler)` — registers cleanup function

### Session Properties

| Property | Type | Description |
|----------|------|-------------|
| `session.events` | `EventManager` | Subscribe to events (voice, buttons, sensors, etc.) |
| `session.audio` | `AudioManager` | Text-to-speech and audio playback |
| `session.camera` | `CameraManager` | Photo capture and video streaming |
| `session.led` | `LedModule` | Control RGB LEDs (Mentra Live only) |
| `session.location` | `LocationManager` | GPS location access |
| `session.simpleStorage` | `SimpleStorage` | Persistent key-value storage (cloud-synced) |
| `session.settings` | `SettingsManager` | App settings from Developer Console |
| `session.capabilities` | `Capabilities \| null` | Detect device hardware at runtime |
| `session.layouts` | `LayoutManager` | Display layouts — exists but has NO effect on Mentra Live |
| `session.dashboard` | `DashboardAPI` | Persistent status display — NO effect on Mentra Live |
| `session.logger` | `Logger` (Pino) | Session-scoped logging |

### Events (session.events)

```typescript
// Voice transcription (speech-to-text done by MentraOS)
session.events.onTranscription((data: TranscriptionData) => {
  // data.text       — transcribed text (string)
  // data.isFinal    — boolean, true when user finished speaking (ALWAYS check this)
  // data.confidence — confidence score 0-1
  // data.language   — language code e.g. "en-US"
  // data.timestamp  — Date
});

// Button press (Mentra Live has 2 buttons: "left" and "right"/"camera")
session.events.onButtonPress((data: ButtonPress) => {
  // data.buttonId  — "left" or "right" (also "camera" as alias for "right")
  // data.pressType — "short" or "long"
});

// Head position detection
session.events.onHeadPosition((data: HeadPosition) => {
  // "up" or "down"
});

// Voice activity detection (is the user speaking?)
session.events.onVoiceActivity((data: Vad) => {
  // boolean — true when voice detected
});

// Phone notifications forwarded from the user's phone
session.events.onPhoneNotifications((data: PhoneNotification) => {
  // data.app, data.title, data.content
});

// Battery levels
session.events.onGlassesBattery((data: GlassesBatteryUpdate) => {
  // data.level, data.charging
});
session.events.onPhoneBattery((data: PhoneBatteryUpdate) => { });

// Calendar events
session.events.onCalendarEvent((data: CalendarEvent) => { });

// Raw audio chunks (requires explicit subscription)
session.events.onAudioChunk((data: AudioChunk) => { });
// Must subscribe first: session.subscribe([StreamType.AUDIO_CHUNK])

// Location updates
session.events.onLocation((data: LocationUpdate) => { });

// Connection lifecycle
session.events.onConnected((settings?: AppSettings) => { });
session.events.onDisconnected((reason: string) => { });
session.events.onError((error: WebSocketError | Error) => { });

// Settings changes
session.events.onSettingsUpdate((settings: AppSettings) => { });

// All event listeners return an unsubscribe function:
const unsubscribe = session.events.onTranscription(handler);
unsubscribe(); // stop listening
```

### Camera (session.camera)

```typescript
// Request a photo from the glasses camera
const photoData = await session.camera.requestPhoto(options?);

// Options:
interface PhotoRequestOptions {
  size?: "small" | "medium" | "large";  // Default: "medium". NOTE: there is no "full" option
  saveToGallery?: boolean;
  compress?: "none" | "medium" | "heavy";  // Default: "none"
  customWebhookUrl?: string;
  authToken?: string;
}

// Returns:
interface PhotoData {
  buffer: Buffer;      // Raw image bytes
  mimeType: string;
  filename: string;
  size: number;        // bytes
  requestId: string;
}

// IMPORTANT: The SDK returns a Buffer, NOT a base64 string.
// Convert with: photoData.buffer.toString("base64")
// The method is requestPhoto(), NOT takePhoto()

// Video streaming (managed — MentraOS handles encoding/CDN)
const result = await session.camera.startManagedStream(options?);
// Returns: { hlsUrl, dashUrl, webrtcUrl?, streamId, previewUrl, thumbnailUrl }
await session.camera.stopManagedStream();
session.camera.onManagedStreamStatus((status) => { });
// status: "initializing" | "preparing" | "active" | "stopping" | "stopped" | "error"

// Video streaming (unmanaged — direct RTMP)
await session.camera.startStream({ rtmpUrl: "rtmp://..." });
await session.camera.stopStream();
session.camera.onStreamStatus(handler);
session.camera.isCurrentlyStreaming(): boolean;
```

### Audio (session.audio)

```typescript
// Text-to-speech (uses ElevenLabs)
const result = await session.audio.speak(text: string, options?: SpeakOptions);
// Returns: AudioPlayResult { success: boolean, error?: string, duration?: number }
// TTS has a 60-second timeout

interface SpeakOptions {
  voice_id?: string;                    // ElevenLabs voice ID
  model_id?: string;                    // Default: "eleven_flash_v2_5"
  voice_settings?: {
    stability?: number;                 // 0-1
    similarity_boost?: number;          // 0-1
    style?: number;                     // 0-1
    speed?: number;                     // 0.5-2.0
    use_speaker_boost?: boolean;
  };
  volume?: number;                      // 0.0-1.0, default 1.0
}

// Available TTS models:
// - "eleven_flash_v2_5" (multilingual, ~75ms latency) — DEFAULT
// - "eleven_v3" (70+ languages, standard latency)
// - "eleven_turbo_v2_5" (multilingual, ~250-300ms)
// - "eleven_multilingual_v2" (29 languages, standard latency)

// Play audio from a URL
await session.audio.playAudio({ audioUrl: "https://...", volume?: 0.0-1.0, stopOtherAudio?: true });
// NOTE: The method is playAudio({ audioUrl }), NOT playUrl(url)

// Stop all audio
session.audio.stopAudio();

// Check if audio is still playing
session.audio.hasPendingRequest(requestId?: string): boolean;
```

### LEDs (session.led) — Mentra Live Only

```typescript
// Colors: "red" | "green" | "blue" | "orange" | "white"
await session.led.turnOn({ color: "green", brightness?: number });
await session.led.turnOff();
await session.led.blink(color, onTimeMs, offTimeMs, count);
await session.led.solid(color, durationMs);
session.led.getCapabilities(); // Returns array of LED info
// LED commands are fire-and-forget
```

### Location (session.location)

```typescript
// Continuous location updates
const unsubscribe = session.location.subscribeToStream(
  { accuracy: "standard" },
  (data: LocationUpdate) => {
    // data.latitude, data.longitude, data.accuracy (meters), data.altitude?, data.timestamp
  }
);

// Single location poll (15-second timeout)
const loc = await session.location.getLatestLocation({ accuracy: "high" });

// Accuracy options: "realtime" | "high" | "tenMeters" | "standard" | "hundredMeters" | "kilometer" | "threeKilometers" | "reduced"

// Stop all updates
session.location.unsubscribeFromStream();
```

Requires `LOCATION` permission in Developer Console.

### Simple Storage (session.simpleStorage)

Persistent, cloud-synced key-value storage. User-isolated, app-scoped.

```typescript
await session.simpleStorage.set(key, value);       // Values are strings only (use JSON.stringify for objects)
const val = await session.simpleStorage.get(key);
await session.simpleStorage.hasKey(key);
await session.simpleStorage.delete(key);
await session.simpleStorage.clear();
await session.simpleStorage.keys();
await session.simpleStorage.size();
await session.simpleStorage.getAllData();
await session.simpleStorage.setMultiple({ key1: "val1", key2: "val2" });
// Limits: ~1MB per value, ~10MB total per user
// Local caching for fast reads
```

### Device Capabilities (session.capabilities)

```typescript
// Detect hardware at runtime
if (session.capabilities) {
  session.capabilities.modelName;    // e.g., "Mentra Live"
  session.capabilities.hasCamera;    // true
  session.capabilities.hasDisplay;   // false for Mentra Live
  session.capabilities.hasMicrophone;
  session.capabilities.hasSpeaker;
  session.capabilities.hasButton;
  session.capabilities.hasLight;     // LEDs
  session.capabilities.hasIMU;
  session.capabilities.hasWifi;
}
```

### Settings (session.settings)

Settings are configured in the Mentra Developer Console.

```typescript
session.settings.get<T>(key, defaultValue?);
session.settings.has(key);
session.settings.getAll();
session.settings.onChange(handler);          // Listen for any setting change
session.settings.onValueChange<T>(key, handler);  // Listen for specific key
session.settings.fetch();                   // Force refresh from cloud
```

### Permissions

Configured in the Mentra Developer Console (not at runtime):
- `MICROPHONE` — voice input, audio chunks
- `CAMERA` — photos, video streaming
- `LOCATION` — GPS coordinates
- `BACKGROUND_LOCATION` — GPS when app inactive
- `CALENDAR` — calendar events
- `READ_NOTIFICATIONS` — phone notifications
- `POST_NOTIFICATIONS` — send notifications

### Things That Do NOT Exist in the SDK

- `session.display` — does not exist
- `session.screen` — does not exist
- `session.audio.playUrl(url)` — the correct method is `session.audio.playAudio({ audioUrl })`
- `session.camera.takePhoto()` — the correct method is `session.camera.requestPhoto()`
- Photo size `"full"` — only `"small"`, `"medium"`, `"large"` exist

## Project Structure

```
suhail/
├── src/
│   ├── index.ts                  # Entry point — creates SuhailApp and calls app.start()
│   ├── app.ts                    # SuhailApp class (extends AppServer) — session handling, event routing
│   ├── commands/
│   │   ├── command-router.ts     # routeCommand(text) -> { command, params } — keyword matching
│   │   ├── scene-summarize.ts    # "Describe my surroundings" -> photo -> vision LLM -> speak
│   │   ├── ocr-read-text.ts      # "Read this text" -> photo -> OCR -> speak
│   │   ├── face-recognize.ts     # "Who is this?" -> photo -> face API -> speak name
│   │   ├── face-enroll.ts        # "Enroll this person" -> photo -> ask name -> save (stateful, 2-step)
│   │   ├── find-object.ts        # "Find my keys" -> photo -> object detection -> speak location
│   │   ├── currency-recognize.ts # "Count money" -> photo -> vision LLM -> speak denomination
│   │   ├── visual-qa.ts          # Any question -> photo + question -> vision LLM -> speak answer
│   │   └── color-detect.ts       # "What color is this?" -> photo -> color analysis -> speak color
│   ├── services/
│   │   ├── ai-handler.ts         # AIHandler class — unified facade that routes to specific services
│   │   ├── vision-service.ts     # GPT-4o vision calls (scene, VQA, currency, object detection, color)
│   │   ├── ocr-service.ts        # Google Cloud Vision OCR
│   │   ├── face-service.ts       # Azure Face API (recognition + enrollment) + in-memory face database
│   │   └── tts-service.ts        # speak(), speakBilingual(), localize(), common messages
│   ├── utils/
│   │   ├── config.ts             # Environment variables (all from process.env with defaults)
│   │   ├── logger.ts             # Logger class with tag-based [Tag] prefix logging
│   │   └── image-utils.ts        # capturePhoto(session) -> base64 string, base64 helpers
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
User speaks -> Mentra glasses mic -> MentraOS STT -> onTranscription(data)
  -> check data.isFinal (skip partial transcriptions)
  -> check pending face enrollment (intercept if waiting for name)
  -> routeCommand(data.text) -> { command: CommandType, params }
  -> handlers[command].execute(session, params)
    -> speakBilingual(session, messages.processing)  // "Processing..."
    -> capturePhoto(session)                          // Camera -> Buffer -> base64
    -> ai.someMethod(base64Image)                     // AI service (currently mocked)
    -> speak(session, result)                         // Speak result to user
```

### Request Flow (Button Press)

Mentra Live has **2 physical buttons** ("left" and "right"/"camera") plus a swipe pad. Gesture/button mappings:

- **Forward swipe** → Activate listening mode (~10s window for next voice command)
- **Backward swipe** → Repeat last response
- **Left short press** → Activate listening mode (fallback)
- **Left long press** → Repeat last response (fallback)
- **Right/camera button** → Reserved (triggers native camera hardware)

```
User swipes forward on swipe pad -> onTouchEvent(event)
  -> gesture_name="forward_swipe" -> activate listening mode
  -> next transcription is processed as a command (no wake word needed)
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

1. User says "enroll this person" -> captures photo, stores in `pendingEnrollments` Map, asks "say the name"
2. User says "Abdullah" -> `app.ts` checks `hasPendingEnrollment(sessionId)`, passes name to complete enrollment
3. Face is saved to in-memory `faceDatabase` array

The state machine lives in `FaceEnrollCommand.pendingEnrollments: Map<sessionId, base64Photo>`.

## Voice Command Routing (command-router.ts)

The router uses **keyword matching** (case-insensitive). Routes are checked in order — first match wins. The user must first activate listening mode by pressing the left button, then speak their command within the ~10 second window.

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
- `describeScene(base64)` — scene description for blind users
- `answerVisualQuestion(base64, question)` — VQA
- `recognizeCurrency(base64)` — money denomination
- `detectObject(base64, targetName)` — object location (e.g., "to your right, on the table")
- `detectColor(base64)` — dominant color name + hex

### OCR Service (ocr-service.ts) — MOCKED
- `extractText(base64)` — Google Cloud Vision TEXT_DETECTION (planned)

### Face Service (face-service.ts) — MOCKED
- `recognizeFace(base64)` — compare against in-memory database
- `enrollFace(name, base64)` — extract embedding + store in `faceDatabase[]`
- `extractFaceEmbedding(base64)` — returns mock 128-dim vector
- `getEnrolledCount()` — returns count
- Azure Face API integration planned

### TTS Service (tts-service.ts) — WORKING
- `speak(session, text)` — wraps `session.audio.speak()` with logging + error handling
- `speakBilingual(session, message)` — selects language from config
- `localize(message)` — returns string for current language

## Environment Variables

Defined in `src/utils/config.ts`, loaded from `.env` (local) or Railway dashboard (production):

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
- Button press handling
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
4. **face-service.ts** — Replace in-memory `faceDatabase[]` with persistent storage (consider `session.simpleStorage` or SQLite/Firebase)
5. **command-router.ts** — Optionally upgrade keyword matching to NLP-based intent detection

### SDK Features Not Yet Used (Available for Future Use)
- `session.led` — LED feedback (e.g., blink green when processing, red on error)
- `session.location` — GPS-aware features (e.g., "where am I?")
- `session.simpleStorage` — Persistent storage for face database, user preferences
- `session.capabilities` — Runtime hardware detection
- `session.events.onHeadPosition()` — Trigger actions on head up/down
- `session.events.onPhoneNotifications()` — Read phone notifications aloud
- `session.events.onGlassesBattery()` — Low battery warnings
- Video streaming via `session.camera.startManagedStream()`

## Rules for Contributing

1. **Audio only** — never reference displays, screens, or visual UI. All output goes through `session.audio.speak()`
2. **Always give feedback** — speak "Processing..." before any long operation, then speak the result or error
3. **Always handle camera failure** — `capturePhoto()` can return null, speak "Camera not available"
4. **Always catch errors** — every handler wraps its logic in try/catch and speaks a friendly error
5. **Use the CommandHandler interface** — `execute(session: AppSession, params?: Record<string, string>): Promise<void>`
6. **Use AIHandler facade** — don't call services directly from command handlers
7. **Use speakBilingual for common messages** — define `{ ar: "...", en: "..." }` pairs
8. **Use the Logger** — `new Logger("TagName")` for consistent `[TagName]` prefixed logging
9. **Use capturePhoto()** from `utils/image-utils.ts` — it handles the SDK's `requestPhoto()`, Buffer->base64 conversion, and error handling
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
ngrok http 3000       # Expose local server (needed for Mentra connection in local dev)
```
