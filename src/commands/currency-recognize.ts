import type { AppSession } from "@mentra/sdk";
import { speakBilingual } from "../services/tts-service";
import { AbstractCommandHandler } from "./base-command";

/**
 * Currency Recognition command.
 * Captures a photo and identifies the denomination of money.
 */
export class CurrencyRecognizeCommand extends AbstractCommandHandler {
  constructor() {
    super("CurrencyRecognize");
  }

  protected async process(
    session: AppSession,
    photo: string,
    _params: Record<string, string> | undefined,
    sessionId: string | undefined,
  ): Promise<void> {
    const result = await this.ai.recognizeCurrency(photo);
    this.logger.info(`Currency result: ${result.denomination} ${result.currency} (confidence: ${result.confidence})`);

    await speakBilingual(session, {
      ar: `هذي ورقة ${result.denomination} ${result.currency === "SAR" ? "ريال" : result.currency}`,
      en: `This is a ${result.denomination} ${result.currency} bill`,
    }, sessionId);
  }
}
