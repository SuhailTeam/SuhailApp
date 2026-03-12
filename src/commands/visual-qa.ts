import type { AppSession } from "@mentra/sdk";
import { speak } from "../services/tts-service";
import { AbstractCommandHandler } from "./base-command";

/**
 * Visual Question Answering command.
 * Captures a photo and answers the user's question about what the camera sees.
 */
export class VisualQACommand extends AbstractCommandHandler {
  constructor() {
    super("VisualQA");
  }

  protected async process(
    session: AppSession,
    photo: string,
    params: Record<string, string> | undefined,
    sessionId: string | undefined,
  ): Promise<void> {
    const question = params?.question || "What do you see?";
    this.logger.info(`Visual QA: "${question}"`);

    const result = await this.ai.answerVisualQuestion(photo, question);
    this.logger.info(`VQA result (confidence: ${result.confidence}): ${result.description}`);
    await speak(session, result.description, sessionId);
  }
}
