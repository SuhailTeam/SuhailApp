import type { AppSession } from "@mentra/sdk";
import type { CommandHandler } from "../types";
import { AIHandler } from "../services/ai-handler";
import { speak, speakBilingual, messages } from "../services/tts-service";
import { capturePhoto } from "../utils/image-utils";
import { Logger } from "../utils/logger";

const logger = new Logger("ColorDetect");
const ai = new AIHandler();

/**
 * Color Detection command.
 * Captures a photo and identifies the dominant color in the center region.
 */
export class ColorDetectCommand implements CommandHandler {
  async execute(session: AppSession, params?: Record<string, string>): Promise<void> {
    logger.info("Executing color detection...");
    const sessionId = params?._sessionId;

    try {
      const photo = await capturePhoto(session);
      if (!photo) {
        await speakBilingual(session, messages.cameraError);
        return;
      }

      const result = await ai.detectColor(photo);
      logger.info(`Color detection result: ${result.colorName} (${result.hex})`);

      await speakBilingual(session, {
        ar: `اللون هو ${result.colorName}`,
        en: `The color is ${result.colorName}`,
      }, sessionId);
    } catch (error) {
      logger.error("Color detection failed:", error);
      await speakBilingual(session, messages.generalError, sessionId);
    }
  }
}
