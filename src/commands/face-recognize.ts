import type { AppSession } from "@mentra/sdk";
import { speak, speakBilingual } from "../services/tts-service";
import { config } from "../utils/config";
import { AbstractCommandHandler } from "./base-command";

/**
 * Face Recognition command.
 * Captures a photo and identifies all people in front of the user.
 */
export class FaceRecognizeCommand extends AbstractCommandHandler {
  constructor() {
    super("FaceRecognize");
  }

  protected async process(
    session: AppSession,
    photo: string,
    _params: Record<string, string> | undefined,
    sessionId: string | undefined,
  ): Promise<void> {
    const result = await this.ai.recognizeAllFaces(photo);
    this.logger.info(`Multi-face recognition: ${result.totalDetected} detected, ${result.faces.filter(f => f.isKnown).length} known`);

    if (result.totalDetected === 0) {
      await speakBilingual(session, {
        ar: "ما أشوف أحد قدامك.",
        en: "I don't see anyone in front of you.",
      }, sessionId);
      return;
    }

    const known = result.faces.filter(f => f.isKnown && f.name && f.confidence >= config.confidenceThreshold);
    const unknownCount = result.totalDetected - known.length;

    if (config.defaultLanguage === "ar") {
      const parts: string[] = [];
      if (known.length > 0) parts.push(`أشوف ${known.map(f => f.name).join(" و ")}`);
      if (unknownCount === 1) parts.push("شخص واحد ما أعرفه");
      else if (unknownCount > 1) parts.push(`${unknownCount} أشخاص ما أعرفهم`);
      await speak(session, parts.join("، و"), sessionId);
    } else {
      const parts: string[] = [];
      if (known.length > 0) parts.push(`I see ${known.map(f => f.name).join(" and ")}`);
      if (unknownCount === 1) parts.push("one person I don't recognize");
      else if (unknownCount > 1) parts.push(`${unknownCount} people I don't recognize`);
      await speak(session, parts.join(", and "), sessionId);
    }
  }
}
