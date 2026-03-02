import type { AppSession } from "@mentra/sdk";
import type { CommandHandler } from "../types";
import { AIHandler } from "../services/ai-handler";
import { speak, speakBilingual, messages } from "../services/tts-service";
import { capturePhoto } from "../utils/image-utils";
import { Logger } from "../utils/logger";

const logger = new Logger("FaceRecognize");
const ai = new AIHandler();

/**
 * Face Recognition command.
 * Captures a photo and identifies the person in front of the user.
 */
export class FaceRecognizeCommand implements CommandHandler {
  async execute(session: AppSession): Promise<void> {
    logger.info("Executing face recognition...");

    try {
      await speakBilingual(session, messages.processing);

      const photo = await capturePhoto(session);
      if (!photo) {
        await speakBilingual(session, messages.cameraError);
        return;
      }

      const result = await ai.recognizeFace(photo);
      logger.info(`Face recognition result: known=${result.isKnown}, name=${result.name}, confidence=${result.confidence}`);

      if (result.isKnown && result.name) {
        await speakBilingual(session, {
          ar: `هذا ${result.name}`,
          en: `This is ${result.name}`,
        });
      } else {
        await speakBilingual(session, {
          ar: "ما أعرف هذا الشخص. تقدر تسجله بقول 'سجل هذا الشخص'.",
          en: "I don't recognize this person. You can enroll them by saying 'enroll this person'.",
        });
      }
    } catch (error) {
      logger.error("Face recognition failed:", error);
      await speakBilingual(session, messages.generalError);
    }
  }
}
