import type { AppSession } from "@mentra/sdk";
import { speak } from "../services/tts-service";
import { AbstractCommandHandler } from "./base-command";

/**
 * Scene Summarization command.
 * Captures a photo and describes the user's surroundings.
 */
export class SceneSummarizeCommand extends AbstractCommandHandler {
  constructor() {
    super("SceneSummarize");
  }

  protected async process(
    session: AppSession,
    photo: string,
    _params: Record<string, string> | undefined,
    sessionId: string | undefined,
  ): Promise<void> {
    const result = await this.ai.describeScene(photo);
    this.logger.info(`Scene description (confidence: ${result.confidence}): ${result.description}`);
    await speak(session, result.description, sessionId);
  }
}
