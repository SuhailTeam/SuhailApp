# Suhail — AI Smart Glasses for the Visually Impaired

**Graduation Project — SWE 496, King Saud University (KSU)**

Suhail is an AI-powered assistive system that runs on **Mentra Live** smart glasses. It helps visually impaired users perceive and interact with the world through voice commands and real-time AI processing.

## Team Members

- Abdullah Alqobaisi
- Faisal Alqahtani
- Nasser Alaboud
- Abdullah Alyousef

## Prerequisites

- [Bun](https://bun.sh) (v1.0+)
- Node.js 18+ (for some dependencies)
- [ngrok](https://ngrok.com) (to expose your local server)
- Mentra app installed on your phone
- Mentra Live smart glasses paired with the Mentra app

## Setup

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd suhail
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and fill in your API keys.

4. **Start the server**
   ```bash
   bun run start
   ```

5. **Expose your server with ngrok**
   ```bash
   ngrok http 3000
   ```
   Copy the ngrok URL and configure it in the Mentra developer portal.

## Development

### Watch mode (auto-restart on file changes)
```bash
bun run dev
```

### Type checking
```bash
bun run typecheck
```

### Git workflow
```bash
git pull origin main        # Get latest changes
# Make your changes...
git add .
git commit -m "description"
git push origin main
```

## Features

| Feature | Command | AI Backend | Status |
|---------|---------|------------|--------|
| Scene Summarization | "Describe my surroundings" | OpenRouter / Gemini | Working |
| OCR / Read Text | "Read this text" | OpenRouter / Gemini | Working |
| Face Recognition | "Who is in front of me?" | AWS Rekognition | Working |
| Face Enrollment | "Enroll this person" | AWS Rekognition | Working |
| Find Object | "Find my keys" | OpenRouter / Gemini | Working |
| Currency Recognition | "Count money" | OpenRouter / Gemini | Working |
| Visual Question Answering | Any question | OpenRouter / Gemini | Working |
| Color Detection | "What color is this?" | OpenRouter / Gemini | Working |

All features use real AI backends. Vision tasks use Google Gemini 2.5 Flash Lite via OpenRouter. Face recognition uses AWS Rekognition with persistent storage.

## Controls

| Input | Action |
|-------|--------|
| Forward swipe | Activate listening mode (~10s window) |
| Backward swipe | Repeat last response |
| Left — Short press | Interrupt current operation + re-listen |
| Left — Long press | Repeat last response |
| Right/Camera | Reserved (native camera hardware) |

The app uses a **swipe-to-command** model: swipe forward to start listening, speak your command, and the AI processes it. No wake word needed.

## Project Structure

```
suhail/
├── src/
│   ├── index.ts                        # Entry point
│   ├── app.ts                          # Main AppServer — sessions, routing, listening mode, mini app API
│   ├── commands/
│   │   ├── command-router.ts           # LLM intent classification + keyword fallback
│   │   ├── scene-summarize.ts          # Scene description
│   │   ├── ocr-read-text.ts            # Text reading (OCR via vision LLM)
│   │   ├── face-recognize.ts           # Face identification
│   │   ├── face-enroll.ts              # Face enrollment (stateful 2-step)
│   │   ├── find-object.ts              # Object location
│   │   ├── currency-recognize.ts       # Currency identification
│   │   ├── visual-qa.ts                # Visual Q&A (fallback)
│   │   └── color-detect.ts             # Color detection
│   ├── services/
│   │   ├── ai-handler.ts               # Unified AI service facade
│   │   ├── vision-service.ts           # Vision LLM calls (OpenRouter / Gemini)
│   │   ├── ocr-service.ts              # OCR — delegates to vision service
│   │   ├── face-service.ts             # Face recognition (AWS Rekognition + local storage)
│   │   └── tts-service.ts              # Text-to-speech helper
│   ├── utils/
│   │   ├── config.ts                   # Environment config
│   │   ├── logger.ts                   # Logging utility
│   │   ├── image-utils.ts              # Image processing helpers
│   │   ├── transcription-filter.ts     # Validates transcriptions (rejects garbled text)
│   │   └── transcription-normalizer.ts # Script normalization via LLM
│   └── types/
│       └── index.ts                    # Shared TypeScript types
├── data/faces/                         # Persistent face data (metadata + photos)
├── models/                             # Face.js ML model weights
├── landing/                            # React + Vite landing page
├── public/                             # Mini app web dashboard
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

## Architecture

The app runs as a **server-side TypeScript application** using the MentraOS SDK:

1. Mentra Live glasses connect to the user's phone via the Mentra app
2. The phone connects to this server via WebSocket through the Mentra Relay
3. The server receives events (voice transcriptions, button presses, photos)
4. The server processes requests through AI services and speaks results back

All output is through **audio only** — the Mentra Live has no display.
