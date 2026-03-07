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

| Feature | Command | Status |
|---------|---------|--------|
| Scene Summarization | "Describe my surroundings" | Mock |
| OCR / Read Text | "Read this text" | Mock |
| Face Recognition | "Who is in front of me?" | Mock |
| Face Enrollment | "Enroll this person" | Mock |
| Find Object | "Find my keys" | Mock |
| Currency Recognition | "Count money" | Mock |
| Visual Question Answering | Any question | Mock |
| Color Detection | "What color is this?" | Mock |

> **Mock** = Structure is ready, using placeholder data. Replace with real API calls when API keys are available.

## Button Mapping

| Button | Action |
|--------|--------|
| Right — Single press | Scene Summarization |
| Right — Long press | Face Recognition |
| Left — Single press | Read Text (OCR) |
| Left — Long press | Repeat last response |

## Project Structure

```
suhail/
├── src/
│   ├── index.ts                  # Entry point
│   ├── app.ts                    # Main AppServer — sessions, routing
│   ├── commands/
│   │   ├── command-router.ts     # Voice command → handler routing
│   │   ├── scene-summarize.ts    # Scene description
│   │   ├── ocr-read-text.ts      # Text reading (OCR)
│   │   ├── face-recognize.ts     # Face identification
│   │   ├── face-enroll.ts        # Face enrollment
│   │   ├── find-object.ts        # Object location
│   │   ├── currency-recognize.ts # Currency identification
│   │   ├── visual-qa.ts          # Visual Q&A
│   │   └── color-detect.ts       # Color detection
│   ├── services/
│   │   ├── ai-handler.ts         # Unified AI service facade
│   │   ├── vision-service.ts     # Vision LLM calls (GPT-4o)
│   │   ├── ocr-service.ts        # OCR calls (Google Cloud Vision)
│   │   ├── face-service.ts       # Face recognition (AWS Rekognition)
│   │   └── tts-service.ts        # Text-to-speech helper
│   ├── utils/
│   │   ├── config.ts             # Environment config
│   │   ├── logger.ts             # Logging utility
│   │   └── image-utils.ts        # Image processing helpers
│   └── types/
│       └── index.ts              # Shared TypeScript types
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
