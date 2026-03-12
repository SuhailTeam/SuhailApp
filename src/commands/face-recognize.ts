import type { AppSession } from "@mentra/sdk";
import { speakBilingual } from "../services/tts-service";
import { config } from "../utils/config";
import { AbstractCommandHandler } from "./base-command";

/**
 * Face Recognition command.
 * Captures a photo and identifies the person in front of the user.
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
    const result = await this.ai.recognizeFace(photo);
    this.logger.info(`Face recognition result: known=${result.isKnown}, name=${result.name}, confidence=${result.confidence}`);

    if (result.isKnown && result.name && result.confidence >= config.confidenceThreshold) {
      await speakBilingual(session, {
        ar: `هذا ${result.name}`,
        en: `This is ${result.name}`,
      }, sessionId);
    } else {
      await speakBilingual(session, {
        ar: "ما أعرف هذا الشخص. تقدر تسجله بقول 'سجل هذا الشخص'.",
        en: "I don't recognize this person. You can enroll them by saying 'enroll this person'.",
      }, sessionId);
    }
  }
}
