import type { AppSession } from "@mentra/sdk";
import type { CommandHandler } from "../types";
import { AIHandler } from "../services/ai-handler";
import { speak, speakBilingual, messages } from "../services/tts-service";
import { capturePhoto } from "../utils/image-utils";
import { Logger } from "../utils/logger";

const logger = new Logger("FindObject");
const ai = new AIHandler();

/**
 * Find Object command.
 * Captures a photo and locates a specific object for the user.
 */
export class FindObjectCommand implements CommandHandler {
  async execute(session: AppSession, params?: Record<string, string>): Promise<void> {
    const objectName = params?.objectName || "object";
    const sessionId = params?._sessionId;
    logger.info(`Executing find object: "${objectName}"...`);

    try {
      const photo = await capturePhoto(session);
      if (!photo) {
        await speakBilingual(session, messages.cameraError);
        return;
      }

      const result = await ai.findObject(photo, objectName);
      logger.info(`Object detection result: found=${result.found}, location=${result.location}`);

      if (result.found) {
        // The location already contains a full spatial description from the vision model
        await speak(session, result.location, sessionId);
      } else {
        await speakBilingual(session, {
          ar: `ما قدرت ألاقي ${objectName} في الصورة.`,
          en: `I couldn't find ${objectName} in the image.`,
        }, sessionId);
      }
    } catch (error) {
      logger.error("Find object failed:", error);
      await speakBilingual(session, messages.generalError, sessionId);
    }
  }
}
