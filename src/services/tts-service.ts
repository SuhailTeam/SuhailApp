import type { AppSession } from "@mentra/sdk";
import type { BilingualMessage, Language } from "../types";
import { config } from "../utils/config";
import { Logger } from "../utils/logger";

const logger = new Logger("TTS");

/**
 * Speaks a bilingual message to the user through the glasses speakers.
 * Selects the appropriate language based on config.
 */
export async function speakBilingual(
  session: AppSession,
  message: BilingualMessage
): Promise<void> {
  const text = message[config.defaultLanguage];
  await speak(session, text);
}

/**
 * Speaks a text string to the user through the glasses speakers.
 */
export async function speak(session: AppSession, text: string): Promise<void> {
  try {
    logger.info(`Speaking: "${text.substring(0, 80)}${text.length > 80 ? "..." : ""}"`);
    await session.audio.speak(text);
  } catch (error) {
    logger.error("TTS failed:", error);
  }
}

/**
 * Returns the localized string for the current language setting.
 */
export function localize(message: BilingualMessage): string {
  return message[config.defaultLanguage];
}

/** Common bilingual messages used across the app */
export const messages = {
  welcome: {
    ar: "سهيل جاهز. كيف أقدر أساعدك؟",
    en: "Suhail is ready. How can I help you?",
  },
  processing: {
    ar: "جاري المعالجة...",
    en: "Processing your request...",
  },
  cameraError: {
    ar: "الكاميرا غير متوفرة. حاول مرة ثانية.",
    en: "Camera not available. Please try again.",
  },
  generalError: {
    ar: "عذراً، ما قدرت أعالج طلبك. حاول مرة ثانية.",
    en: "Sorry, I couldn't process that. Please try again.",
  },
  noResult: {
    ar: "ما قدرت ألاقي نتيجة.",
    en: "I couldn't find a result.",
  },
  repeatNoHistory: {
    ar: "ما فيه رد سابق أعيده.",
    en: "There is no previous response to repeat.",
  },
} satisfies Record<string, BilingualMessage>;
