import type { AppSession } from "@mentra/sdk";
import type { CommandHandler } from "../types";
import { AIHandler } from "../services/ai-handler";
import { speak, speakBilingual, messages } from "../services/tts-service";
import { capturePhoto } from "../utils/image-utils";
import { Logger } from "../utils/logger";

const logger = new Logger("VisualQA");
const ai = new AIHandler();

/**
 * Visual Question Answering command.
 * Captures a photo and answers the user's question about what the camera sees.
 */
export class VisualQACommand implements CommandHandler {
  async execute(session: AppSession, params?: Record<string, string>): Promise<void> {
    const question = params?.question || "What do you see?";
    const sessionId = params?._sessionId;
    logger.info(`Executing Visual QA: "${question}"`);

    try {
      const photo = params?._preCapture || await capturePhoto(session);
      if (!photo) {
        await speakBilingual(session, messages.cameraError);
        return;
      }

      const result = await ai.answerVisualQuestion(photo, question);
      logger.info(`VQA result (confidence: ${result.confidence}): ${result.description}`);

      await speak(session, result.description, sessionId);
    } catch (error) {
      logger.error("Visual QA failed:", error);
      await speakBilingual(session, messages.generalError, sessionId);
    }
  }
}
