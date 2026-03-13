import type { AppSession } from "@mentra/sdk";
import { speak } from "../services/tts-service";
import { config } from "../utils/config";
import { AbstractCommandHandler } from "./base-command";

/**
 * Scene Summarization command.
 * Captures a photo, identifies known faces, and describes the user's surroundings
 * using recognized names for a more personal description.
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
    // Run face recognition first to extract known names
    let knownNames: string[] = [];
    try {
      const faceResult = await this.ai.recognizeAllFaces(photo);
      knownNames = faceResult.faces
        .filter(f => f.isKnown && f.name && f.confidence >= config.confidenceThreshold)
        .map(f => f.name!);
      if (knownNames.length > 0) {
        this.logger.info(`Recognized faces in scene: ${knownNames.join(", ")}`);
      }
    } catch (err) {
      this.logger.warn("Face recognition failed during scene describe, continuing without names", err);
    }

    // Describe scene with known names injected into prompt
    const result = await this.ai.describeSceneWithFaces(photo, knownNames);
    this.logger.info(`Scene description (confidence: ${result.confidence}): ${result.description}`);
    await speak(session, result.description, sessionId);
  }
}
