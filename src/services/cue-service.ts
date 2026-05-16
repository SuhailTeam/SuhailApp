import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { AppSession } from "@mentra/sdk";
import type { BilingualMessage } from "../types";
import { config } from "../utils/config";
import { Logger } from "../utils/logger";
import { mark } from "../utils/timeline";
import { speakBilingual, messages } from "./tts-service";

const logger = new Logger("CueService");

const CUE_DIR = path.resolve("./public/cues");
const SAMPLE_RATE = 22050;

export type CueType = "listening" | "got-it" | "cancelled";

const CUE_FILES: Record<CueType, string> = {
  "listening": "listening.wav",
  "got-it": "got-it.wav",
  "cancelled": "cancelled.wav",
};

const FALLBACK_MESSAGES: Record<CueType, BilingualMessage> = {
  "listening": messages.listening,
  "got-it": messages.received,
  "cancelled": messages.cancelled,
};

/** Returns the public URL of a cue, or "" if PUBLIC_BASE_URL is not set. */
export function cueUrl(type: CueType): string {
  if (!config.publicBaseUrl) return "";
  return `${config.publicBaseUrl}/cues/${CUE_FILES[type]}`;
}

let warnedNoPublicUrl = false;

/**
 * Plays a short non-speech cue on the glasses (track 1). If PUBLIC_BASE_URL is
 * not configured, or playback fails, falls back to the spoken word equivalent.
 * Cues are ~200ms chimes — ~3s faster than the equivalent TTS round-trip.
 */
export async function playCue(
  session: AppSession,
  type: CueType,
  sessionId?: string,
): Promise<void> {
  const url = cueUrl(type);
  if (!url) {
    if (!warnedNoPublicUrl) {
      logger.warn("PUBLIC_BASE_URL is not set — cues falling back to TTS (~3s/call slower). Add it to .env to enable chimes.");
      warnedNoPublicUrl = true;
    }
    await speakBilingual(session, FALLBACK_MESSAGES[type], sessionId);
    return;
  }
  mark(sessionId, `cue_start[${type}]`);
  try {
    await session.audio.playAudio({
      audioUrl: url,
      trackId: 1,
      stopOtherAudio: false,
      volume: 0.7,
    });
    mark(sessionId, `cue_done[${type}]`);
  } catch (err) {
    logger.warn(`Cue "${type}" playback failed, falling back to TTS:`, err);
    await speakBilingual(session, FALLBACK_MESSAGES[type], sessionId);
  }
}

/** Generates cue WAV files in public/cues/ if missing. Called once at startup. */
export async function ensureCuesGenerated(): Promise<void> {
  await fs.mkdir(CUE_DIR, { recursive: true });
  const tasks: Array<{ name: string; data: Buffer }> = [
    { name: CUE_FILES.listening, data: makeListeningCue() },
    { name: CUE_FILES["got-it"], data: makeGotItCue() },
    { name: CUE_FILES.cancelled, data: makeCancelledCue() },
  ];
  let generated = 0;
  for (const { name, data } of tasks) {
    const filePath = path.join(CUE_DIR, name);
    try {
      await fs.access(filePath);
    } catch {
      await fs.writeFile(filePath, data);
      logger.info(`Generated cue file: ${name} (${data.length} bytes)`);
      generated++;
    }
  }
  if (config.publicBaseUrl) {
    logger.info(`Cues ready (${tasks.length} files, ${generated} newly generated). Public URL: ${config.publicBaseUrl}/cues/`);
  } else {
    logger.warn(`Cues generated but PUBLIC_BASE_URL is empty — set it in .env to skip TTS cues and save ~3s/command.`);
  }
}

function buildWav(samples: Int16Array): Buffer {
  const dataSize = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0, "ascii");
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8, "ascii");
  buffer.write("fmt ", 12, "ascii");
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36, "ascii");
  buffer.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < samples.length; i++) {
    buffer.writeInt16LE(samples[i], 44 + i * 2);
  }
  return buffer;
}

function tone(freq: number, durationMs: number, amplitude = 0.5): Int16Array {
  const n = Math.floor((durationMs / 1000) * SAMPLE_RATE);
  const samples = new Int16Array(n);
  const attack = Math.min(0.02 * SAMPLE_RATE, n / 4);
  const release = Math.min(0.05 * SAMPLE_RATE, n / 4);
  for (let i = 0; i < n; i++) {
    let env = 1;
    if (i < attack) env = i / attack;
    else if (i > n - release) env = (n - i) / release;
    const s = Math.sin((2 * Math.PI * freq * i) / SAMPLE_RATE) * amplitude * env;
    samples[i] = Math.max(-32767, Math.min(32767, Math.round(s * 32767)));
  }
  return samples;
}

function silence(durationMs: number): Int16Array {
  return new Int16Array(Math.floor((durationMs / 1000) * SAMPLE_RATE));
}

function concat(...parts: Int16Array[]): Int16Array {
  let total = 0;
  for (const p of parts) total += p.length;
  const out = new Int16Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

// Rising A4 → E5: "go ahead, listening"
function makeListeningCue(): Buffer {
  return buildWav(concat(tone(440, 90), tone(659.25, 110)));
}

// Double E5 tap: acknowledgment
function makeGotItCue(): Buffer {
  return buildWav(concat(tone(659.25, 70), silence(30), tone(659.25, 70)));
}

// Falling E5 → A4: negative acknowledgment
function makeCancelledCue(): Buffer {
  return buildWav(concat(tone(659.25, 90), tone(440, 110)));
}
