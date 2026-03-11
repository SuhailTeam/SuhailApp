import { Logger } from "../utils/logger";

const logger = new Logger("SettingsStore");

export interface AppSettings {
  speechSpeed: number;   // 0.5 - 2.0
  volume: number;        // 0.0 - 1.0
  voicePreset: "default" | "male" | "female";
  language: "ar" | "en";
}

const defaults: AppSettings = {
  speechSpeed: 1.0,
  volume: 0.8,
  voicePreset: "default",
  language: (process.env.DEFAULT_LANGUAGE as "ar" | "en") || "ar",
};

let settings: AppSettings = { ...defaults };

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
  return { ...settings };
}
