import type { AppSession } from "@mentra/sdk";
import { speak, speakBilingual } from "../services/tts-service";
import { AbstractCommandHandler } from "./base-command";

/**
 * Find Object command.
 * Captures a photo and locates a specific object for the user.
 */
export class FindObjectCommand extends AbstractCommandHandler {
  constructor() {
    super("FindObject");
  }

  protected async process(
    session: AppSession,
    photo: string,
    params: Record<string, string> | undefined,
    sessionId: string | undefined,
  ): Promise<void> {
    const objectName = params?.objectName || "object";
    this.logger.info(`Searching for: "${objectName}"`);

    const result = await this.ai.findObject(photo, objectName);
    this.logger.info(`Object detection result: found=${result.found}, location=${result.location}`);

    if (result.found) {
      await speak(session, result.location, sessionId);
    } else {
      await speakBilingual(session, {
        ar: `ما قدرت ألاقي ${objectName} في الصورة.`,
        en: `I couldn't find ${objectName} in the image.`,
      }, sessionId);
    }
  }
}
