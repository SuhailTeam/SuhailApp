import type { AppSession } from "@mentra/sdk";
import type { BilingualMessage, Language } from "../types";
import { config } from "../utils/config";
import { Logger } from "../utils/logger";
import { getSettings } from "./settings-store";

const logger = new Logger("TTS");

/** Stores the last spoken response per session for repeat functionality */
const lastResponses = new Map<string, string>();

/** Maps voice preset names to ElevenLabs voice IDs */
function getVoiceId(preset: string): string | undefined {
  const voiceMap: Record<string, string> = {
    // These are placeholder ElevenLabs voice IDs — replace with actual IDs from the ElevenLabs dashboard
    male: "pNInz6obpgDQGcFmaJgB",    // "Adam"
    female: "21m00Tcm4TlvDq8ikWAM",  // "Rachel"
  };
  return voiceMap[preset]; // undefined for "default" — uses SDK default
}

/**
 * Speaks a bilingual message to the user through the glasses speakers.
 * Selects the appropriate language based on settings.
 */
export async function speakBilingual(
  session: AppSession,
  message: BilingualMessage,
  sessionId?: string
): Promise<void> {
  const settings = getSettings();
  const text = message[settings.language];
  await speak(session, text, sessionId);
}

/**
 * Speaks a text string to the user through the glasses speakers.
 * Optionally tracks the response for repeat functionality.
 */
export async function speak(session: AppSession, text: string, sessionId?: string): Promise<void> {
  try {
    logger.info(`Speaking: "${text.substring(0, 80)}${text.length > 80 ? "..." : ""}"`);
    const settings = getSettings();
    await session.audio.speak(text, {
      voice_id: getVoiceId(settings.voicePreset),
      voice_settings: {
        speed: settings.speechSpeed,
      },
      volume: settings.volume,
      trackId: 2,
    });
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
  const settings = getSettings();
  return message[settings.language];
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
  unknownCommand: {
    ar: "لم أفهم طلبك. يمكنني وصف المحيط، قراءة النصوص، التعرف على الوجوه، البحث عن أشياء، معرفة العملات، أو تحديد الألوان.",
    en: "I didn't understand that. I can describe your surroundings, read text, recognize faces, find objects, identify currency, or detect colors.",
  },
  interruptedListening: {
    ar: "تمت المقاطعة. عدنا لوضع الاستماع.",
    en: "Interrupted. Back to listening mode.",
  },
  permissionError: {
    ar: "يرجى تفعيل صلاحيات الكاميرا والميكروفون في تطبيق منترا.",
    en: "Please enable camera and microphone permissions in the Mentra app.",
  },
} satisfies Record<string, BilingualMessage>;
