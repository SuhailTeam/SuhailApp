import type { AppSession } from "@mentra/sdk";
import { Logger } from "../utils/logger";

const logger = new Logger("SettingsStore");

export interface AppSettings {
  speechSpeed: number;   // 0.5 - 2.0
  volume: number;        // 0.0 - 1.0
  voicePreset: "default" | "male" | "female";
  language: "ar" | "en";
}

const STORAGE_KEY = "suhail_settings";

const defaults: AppSettings = {
  speechSpeed: 1.0,
  volume: 0.8,
  voicePreset: "default",
  language: (process.env.DEFAULT_LANGUAGE as "ar" | "en") || "ar",
};

let settings: AppSettings = { ...defaults };

/** Active session used for persisting settings to simpleStorage */
let activeSession: AppSession | null = null;

export function getSettings(): AppSettings {
  return { ...settings };
}

export function updateSettings(partial: Partial<AppSettings>): AppSettings {
  if (partial.speechSpeed !== undefined) {
    settings.speechSpeed = Math.max(0.5, Math.min(2.0, partial.speechSpeed));
  }
  if (partial.volume !== undefined) {
    settings.volume = Math.max(0.0, Math.min(1.0, partial.volume));
  }
  if (partial.voicePreset !== undefined && ["default", "male", "female"].includes(partial.voicePreset)) {
    settings.voicePreset = partial.voicePreset;
  }
  if (partial.language !== undefined && ["ar", "en"].includes(partial.language)) {
    settings.language = partial.language;
  }
  logger.info(`Settings updated: ${JSON.stringify(settings)}`);

  // Persist to simpleStorage asynchronously
  if (activeSession) {
    activeSession.simpleStorage.set(STORAGE_KEY, JSON.stringify(settings))
      .then(() => activeSession?.simpleStorage.flush())
      .catch((e: unknown) => logger.warn("Failed to persist settings:", e));
  }

  return { ...settings };
}

/**
 * Loads persisted settings from simpleStorage on session start.
 * Falls back to defaults if no stored settings exist.
 */
export async function initSettingsFromStorage(session: AppSession): Promise<void> {
  activeSession = session;
  try {
    const stored = await session.simpleStorage.get(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      updateSettings(parsed);
      logger.info("Settings loaded from simpleStorage");
    } else {
      logger.info("No persisted settings found, using defaults");
    }
  } catch (e) {
    logger.warn("Failed to load settings from storage:", e);
  }
}

/** Clears the session reference when the session ends. */
export function clearSettingsSession(): void {
  activeSession = null;
}
