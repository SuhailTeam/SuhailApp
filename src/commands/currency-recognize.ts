import type { AppSession } from "@mentra/sdk";
import type { CommandHandler } from "../types";
import { AIHandler } from "../services/ai-handler";
import { speak, speakBilingual, messages } from "../services/tts-service";
import { capturePhoto } from "../utils/image-utils";
import { Logger } from "../utils/logger";

const logger = new Logger("CurrencyRecognize");
const ai = new AIHandler();

/**
 * Currency Recognition command.
 * Captures a photo and identifies the denomination of money.
 */
export class CurrencyRecognizeCommand implements CommandHandler {
  async execute(session: AppSession): Promise<void> {
    logger.info("Executing currency recognition...");

    try {
      await speakBilingual(session, messages.processing);

      const photo = await capturePhoto(session);
      if (!photo) {
        await speakBilingual(session, messages.cameraError);
        return;
      }

      const result = await ai.recognizeCurrency(photo);
      logger.info(`Currency result: ${result.denomination} ${result.currency} (confidence: ${result.confidence})`);

      await speakBilingual(session, {
        ar: `هذي ورقة ${result.denomination} ${result.currency === "SAR" ? "ريال" : result.currency}`,
        en: `This is a ${result.denomination} ${result.currency} bill`,
      });
    } catch (error) {
      logger.error("Currency recognition failed:", error);
      await speakBilingual(session, messages.generalError);
    }
  }
}
