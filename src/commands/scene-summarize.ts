import type { AppSession } from "@mentra/sdk";
import type { CommandHandler } from "../types";
import { AIHandler } from "../services/ai-handler";
import { speak, speakBilingual, messages } from "../services/tts-service";
import { capturePhoto } from "../utils/image-utils";
import { Logger } from "../utils/logger";

const logger = new Logger("SceneSummarize");
const ai = new AIHandler();

/**
 * Scene Summarization command.
 * Captures a photo and describes the user's surroundings.
 */
export class SceneSummarizeCommand implements CommandHandler {
  async execute(session: AppSession, params?: Record<string, string>): Promise<void> {
    logger.info("Executing scene summarization...");
    const sessionId = params?._sessionId;

    try {
      await speakBilingual(session, messages.processing);

      const photo = await capturePhoto(session);
      if (!photo) {
        await speakBilingual(session, messages.cameraError);
        return;
      }

      const result = await ai.describeScene(photo);
      logger.info(`Scene description (confidence: ${result.confidence}): ${result.description}`);

      await speak(session, result.description, sessionId);
    } catch (error) {
      logger.error("Scene summarization failed:", error);
      await speakBilingual(session, messages.generalError, sessionId);
    }
  }
}
