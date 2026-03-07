import type { AppSession } from "@mentra/sdk";
import type { BilingualMessage, Language } from "../types";
import { config } from "../utils/config";
import { Logger } from "../utils/logger";

const logger = new Logger("TTS");

/** Stores the last spoken response per session for repeat functionality */
const lastResponses = new Map<string, string>();

/**
 * Speaks a bilingual message to the user through the glasses speakers.
 * Selects the appropriate language based on config.
 */
export async function speakBilingual(
  session: AppSession,
  message: BilingualMessage,
  sessionId?: string
): Promise<void> {
  const text = message[config.defaultLanguage];
  await speak(session, text, sessionId);
}

/**
 * Speaks a text string to the user through the glasses speakers.
 * Optionally tracks the response for repeat functionality.
 */
export async function speak(session: AppSession, text: string, sessionId?: string): Promise<void> {
  try {
    logger.info(`Speaking: "${text.substring(0, 80)}${text.length > 80 ? "..." : ""}"`);
    await session.audio.speak(text);
    if (sessionId) {
      lastResponses.set(sessionId, text);
    }
  } catch (error) {
    logger.error("TTS failed:", error);
  }
}

/** Returns the last spoken response for a session, if any */
export function getLastResponse(sessionId: string): string | undefined {
  return lastResponses.get(sessionId);
}

/** Clears the stored last response for a session */
export function clearLastResponse(sessionId: string): void {
  lastResponses.delete(sessionId);
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
  listening: {
    ar: "تفضل",
    en: "Listening",
  },
  received: {
    ar: "حسناً",
    en: "Got it",
  },
  cancelled: {
    ar: "تم الإلغاء",
    en: "Cancelled",
  },
  didntCatch: {
    ar: "لم أسمع، حاول مرة أخرى",
    en: "I didn't catch that, try again",
  },
  listeningTimeout: {
    ar: "انتهت مهلة الاستماع.",
    en: "Listening timed out.",
  },
} satisfies Record<string, BilingualMessage>;
