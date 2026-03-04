import type { AppSession } from "@mentra/sdk";
import type { CommandHandler } from "../types";
import { AIHandler } from "../services/ai-handler";
import { speak, speakBilingual, messages } from "../services/tts-service";
import { capturePhoto } from "../utils/image-utils";
import { Logger } from "../utils/logger";

const logger = new Logger("OCRReadText");
const ai = new AIHandler();

/**
 * OCR / Read Text command.
 * Captures a photo and extracts text using OCR.
 */
export class OcrReadTextCommand implements CommandHandler {
  async execute(session: AppSession, params?: Record<string, string>): Promise<void> {
    logger.info("Executing OCR text reading...");
    const sessionId = params?._sessionId;

    try {
      await speakBilingual(session, messages.processing);

      const photo = await capturePhoto(session);
      if (!photo) {
        await speakBilingual(session, messages.cameraError);
        return;
      }

      const result = await ai.readText(photo);
      logger.info(`OCR result (confidence: ${result.confidence}): ${result.text.substring(0, 100)}...`);

      if (!result.text || result.text.trim().length === 0) {
        await speakBilingual(session, {
          ar: "ما قدرت ألاقي نص في الصورة.",
          en: "I couldn't find any text in the image.",
        }, sessionId);
        return;
      }

      await speak(session, result.text, sessionId);
    } catch (error) {
      logger.error("OCR reading failed:", error);
      await speakBilingual(session, messages.generalError, sessionId);
    }
  }
}
