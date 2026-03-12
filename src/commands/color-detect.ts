import type { AppSession } from "@mentra/sdk";
import { speakBilingual } from "../services/tts-service";
import { AbstractCommandHandler } from "./base-command";

/**
 * Color Detection command.
 * Captures a photo and identifies the dominant color in the center region.
 */
export class ColorDetectCommand extends AbstractCommandHandler {
  constructor() {
    super("ColorDetect");
  }

  protected async process(
    session: AppSession,
    photo: string,
    _params: Record<string, string> | undefined,
    sessionId: string | undefined,
  ): Promise<void> {
    const result = await this.ai.detectColor(photo);
    this.logger.info(`Color detection result: ${result.colorName} (${result.hex})`);

    await speakBilingual(session, {
      ar: `اللون هو ${result.colorName}`,
      en: `The color is ${result.colorName}`,
    }, sessionId);
  }
}
