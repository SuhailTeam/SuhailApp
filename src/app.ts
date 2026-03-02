import { AppServer, type AppSession } from "@mentra/sdk";
import { routeCommand } from "./commands/command-router";
import { SceneSummarizeCommand } from "./commands/scene-summarize";
import { OcrReadTextCommand } from "./commands/ocr-read-text";
import { FaceRecognizeCommand } from "./commands/face-recognize";
import { FaceEnrollCommand } from "./commands/face-enroll";
import { FindObjectCommand } from "./commands/find-object";
import { CurrencyRecognizeCommand } from "./commands/currency-recognize";
import { VisualQACommand } from "./commands/visual-qa";
import { ColorDetectCommand } from "./commands/color-detect";
import { speak, speakBilingual, messages } from "./services/tts-service";
import { config } from "./utils/config";
import { Logger } from "./utils/logger";
import type { CommandHandler, CommandType } from "./types";

const logger = new Logger("SuhailApp");

/**
 * Main Suhail application server.
 * Handles MentraOS sessions, routes voice commands, and manages button presses.
 */
export class SuhailApp extends AppServer {
  /** Registry of command handlers */
  private handlers: Record<CommandType, CommandHandler>;

  /** Face enrollment handler (needs special access for pending state) */
  private faceEnrollHandler: FaceEnrollCommand;

  /** Last spoken response per session, for "repeat" functionality */
  private lastResponses = new Map<string, string>();

  constructor() {
    super({
      packageName: config.packageName,
      apiKey: config.mentraApiKey,
      port: config.port,
    });

    this.faceEnrollHandler = new FaceEnrollCommand();

    this.handlers = {
      "scene-summarize": new SceneSummarizeCommand(),
      "ocr-read-text": new OcrReadTextCommand(),
      "face-recognize": new FaceRecognizeCommand(),
      "face-enroll": this.faceEnrollHandler,
      "find-object": new FindObjectCommand(),
      "currency-recognize": new CurrencyRecognizeCommand(),
      "visual-qa": new VisualQACommand(),
      "color-detect": new ColorDetectCommand(),
    };

    logger.info("SuhailApp initialized with all command handlers");
  }

  /**
   * Called when a new user session connects.
   * Sets up event listeners for voice and button input.
   */
  override async onSession(
    session: AppSession,
    sessionId: string,
    userId: string
  ): Promise<void> {
    logger.info(`New session started: ${sessionId} (user: ${userId})`);

    // Welcome the user
    await speakBilingual(session, messages.welcome);

    // Listen for voice transcriptions
    session.events.onTranscription(async (data) => {
      if (!data.isFinal) return; // Only process final transcriptions
      logger.info(`[${sessionId}] Transcription: "${data.text}"`);
      await this.handleTranscription(session, sessionId, data.text);
    });

    // Listen for button presses
    session.events.onButtonPress(async (event) => {
      logger.info(`[${sessionId}] Button press: ${event.buttonId} ${event.pressType}`);
      await this.handleButtonPress(session, sessionId, event);
    });

    logger.info(`[${sessionId}] Session event listeners registered`);
  }

  /**
   * Handles a voice transcription by routing it to the correct command.
   */
  private async handleTranscription(
    session: AppSession,
    sessionId: string,
    text: string
  ): Promise<void> {
    try {
      // Check if we're waiting for a name during face enrollment
      if (this.faceEnrollHandler.hasPendingEnrollment(sessionId)) {
        logger.info(`[${sessionId}] Completing pending face enrollment with name: "${text}"`);
        await this.faceEnrollHandler.execute(session, { name: text });
        return;
      }

      // Route the transcription to the correct command
      const route = routeCommand(text);
      logger.info(`[${sessionId}] Routed to command: ${route.command}`);

      const handler = this.handlers[route.command];
      if (!handler) {
        logger.error(`[${sessionId}] No handler found for command: ${route.command}`);
        await speakBilingual(session, messages.generalError);
        return;
      }

      await handler.execute(session, route.params);
    } catch (error) {
      logger.error(`[${sessionId}] Error handling transcription:`, error);
      await speakBilingual(session, messages.generalError);
    }
  }

  /**
   * Handles physical button presses on the Mentra Live glasses.
   *
   * Button mapping:
   * - Short press (right) → Scene Summarization
   * - Long press (right)  → Face Recognition
   * - Short press (left)  → OCR / Read Text
   * - Long press (left)   → Repeat last response
   */
  private async handleButtonPress(
    session: AppSession,
    sessionId: string,
    event: { buttonId: string; pressType: "short" | "long" }
  ): Promise<void> {
    try {
      const { buttonId, pressType } = event;

      logger.info(`[${sessionId}] Button: ${buttonId} ${pressType}`);

      if (buttonId === "right" && pressType === "short") {
        await this.handlers["scene-summarize"].execute(session);
      } else if (buttonId === "right" && pressType === "long") {
        await this.handlers["face-recognize"].execute(session);
      } else if (buttonId === "left" && pressType === "short") {
        await this.handlers["ocr-read-text"].execute(session);
      } else if (buttonId === "left" && pressType === "long") {
        await this.repeatLastResponse(session, sessionId);
      } else {
        logger.warn(`[${sessionId}] Unknown button event: ${buttonId} ${pressType}`);
      }
    } catch (error) {
      logger.error(`[${sessionId}] Error handling button press:`, error);
      await speakBilingual(session, messages.generalError);
    }
  }

  /**
   * Repeats the last spoken response for a session.
   */
  private async repeatLastResponse(session: AppSession, sessionId: string): Promise<void> {
    const lastResponse = this.lastResponses.get(sessionId);
    if (lastResponse) {
      logger.info(`[${sessionId}] Repeating last response`);
      await speak(session, lastResponse);
    } else {
      await speakBilingual(session, messages.repeatNoHistory);
    }
  }
}
