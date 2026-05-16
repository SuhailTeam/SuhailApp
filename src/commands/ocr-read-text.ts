import type { AppSession } from "@mentra/sdk";
import { speak, speakBilingual } from "../services/tts-service";
import { getSettings } from "../services/settings-store";
import { AbstractCommandHandler } from "./base-command";

const OCR_MAX_CHARS = 400;

const truncationSuffix = { ar: " وغيره. اسحب للأمام للإيقاف.", en: " ...and more. Swipe forward to stop." };

/**
 * OCR / Read Text command.
 * Captures a photo and extracts text using OCR.
 */
export class OcrReadTextCommand extends AbstractCommandHandler {
  constructor() {
    super("OCRReadText");
  }

  protected async process(
    session: AppSession,
    photo: string,
    params: Record<string, string> | undefined,
    sessionId: string | undefined,
  ): Promise<void> {
    const raw = await this.ai.readText(photo, params?.context);
    // Replace newlines with spaces so TTS reads it as continuous text
    const result = raw.replace(/\n+/g, " ").replace(/\s{2,}/g, " ").trim();
    this.logger.info(`OCR result (${result.length} chars): ${result.substring(0, 100)}...`);

    if (!result || result.length === 0) {
      await speakBilingual(session, {
        ar: "ما قدرت ألاقي نص في الصورة.",
        en: "I couldn't find any text in the image.",
      }, sessionId);
      return;
    }

    // Long OCR results can lock the user into 30s+ of dictation. Cap to keep the
    // response actionable; user can swipe forward at any time to stop and retry.
    const spoken = result.length > OCR_MAX_CHARS
      ? result.slice(0, OCR_MAX_CHARS).trim() + truncationSuffix[getSettings().language]
      : result;

    await speak(session, spoken, sessionId);
  }
}
