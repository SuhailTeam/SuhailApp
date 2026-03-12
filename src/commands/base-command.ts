import type { AppSession } from "@mentra/sdk";
import type { CommandHandler } from "../types";
import { AIHandler } from "../services/ai-handler";
import { speakBilingual, messages } from "../services/tts-service";
import { capturePhoto } from "../utils/image-utils";
import { Logger } from "../utils/logger";

/**
 * Base class for photo-based command handlers.
 * Handles the common boilerplate: logging, error handling, photo capture
 * with pre-capture fallback, and camera-error feedback.
 *
 * Subclasses implement only the `process()` method with their specific logic.
 *
 * NOTE: FaceEnrollCommand is stateful (2-step flow) and does NOT extend this class.
 */
export abstract class AbstractCommandHandler implements CommandHandler {
  protected readonly logger: Logger;
  protected readonly ai = new AIHandler();

  constructor(tag: string) {
    this.logger = new Logger(tag);
  }

  async execute(session: AppSession, params?: Record<string, string>): Promise<void> {
    const sessionId = params?._sessionId;
    try {
      const photo = params?._preCapture || await capturePhoto(session);
      if (!photo) {
        await speakBilingual(session, messages.cameraError, sessionId);
        return;
      }
      await this.process(session, photo, params, sessionId);
    } catch (error) {
      this.logger.error("Command failed:", error);
      await speakBilingual(session, messages.generalError, sessionId);
    }
  }

  /**
   * Subclass-specific processing logic.
   * Called after photo capture succeeds. Errors are caught by the base class.
   */
  protected abstract process(
    session: AppSession,
    photo: string,
    params: Record<string, string> | undefined,
    sessionId: string | undefined,
  ): Promise<void>;
}
