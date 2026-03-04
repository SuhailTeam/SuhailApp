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
import { speak, speakBilingual, messages, getLastResponse, clearLastResponse } from "./services/tts-service";
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

  /** Session IDs currently connected (tracked for the mini app UI) */
  private connectedSessions = new Set<string>();

  /** Rolling log of the last 20 activity events (served to the mini app UI) */
  private activityLog: Array<{ time: string; event: string }> = [];

  /** Server start time for uptime calculation */
  private readonly startTime = Date.now();

  constructor() {
    super({
      packageName: config.packageName,
      apiKey: config.mentraApiKey,
      port: config.port,
      publicDir: "./public",
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

    this.registerApiRoutes();
    logger.info("SuhailApp initialized with all command handlers");
  }

  /**
   * Registers /api/status and /api/activity routes on the SDK's Express instance.
   * These power the mini app web UI served from /public.
   */
  private registerApiRoutes(): void {
    const expressApp = this.getExpressApp();

    expressApp.get("/api/status", (_req: any, res: any) => {
      res.json({
        online: true,
        sessions: this.connectedSessions.size,
        uptime: Math.floor((Date.now() - this.startTime) / 1000),
      });
    });

    expressApp.get("/api/activity", (_req: any, res: any) => {
      res.json(this.activityLog);
    });

    logger.info("Mini app API routes registered (/api/status, /api/activity)");
  }

  /**
   * Appends an event to the rolling activity log (capped at 20 entries).
   */
  private logActivity(event: string): void {
    this.activityLog.push({ time: new Date().toISOString(), event });
    if (this.activityLog.length > 20) {
      this.activityLog.splice(0, this.activityLog.length - 20);
    }
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

    this.connectedSessions.add(sessionId);
    this.logActivity(`جلسة جديدة (${userId})`);

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
   * Called when a session ends. Cleans up tracking state.
   */
  override async onStop(sessionId: string, userId: string, reason: string): Promise<void> {
    this.connectedSessions.delete(sessionId);
    clearLastResponse(sessionId);
    this.logActivity(`انتهت الجلسة (${reason})`);
    logger.info(`Session stopped: ${sessionId} (user: ${userId}, reason: ${reason})`);
  }

  /**
   * Handles a voice transcription by routing it to the correct command.
   */
  private async handleTranscription(
    session: AppSession,
    sessionId: string,
    text: string
  ): Promise<void> {
    // Ignore empty or whitespace-only transcriptions
    if (!text || text.trim().length === 0) {
      logger.warn(`[${sessionId}] Empty transcription, ignoring`);
      return;
    }

    try {
      // Check if we're waiting for a name during face enrollment
      if (this.faceEnrollHandler.hasPendingEnrollment(sessionId)) {
        logger.info(`[${sessionId}] Completing pending face enrollment with name: "${text}"`);
        await this.faceEnrollHandler.execute(session, { name: text, _sessionId: sessionId });
        return;
      }

      // Route the transcription to the correct command (requires wake word)
      const route = routeCommand(text);
      if (!route) {
        // No wake word detected — ignore this transcription
        return;
      }
      logger.info(`[${sessionId}] Routed to command: ${route.command}`);
      this.logActivity(`أمر صوتي: ${route.command}`);

      const handler = this.handlers[route.command];
      if (!handler) {
        logger.error(`[${sessionId}] No handler found for command: ${route.command}`);
        await speakBilingual(session, messages.generalError);
        return;
      }

      await handler.execute(session, { ...route.params, _sessionId: sessionId });
    } catch (error) {
      logger.error(`[${sessionId}] Error handling transcription:`, error);
      await speakBilingual(session, messages.generalError, sessionId);
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

      if ((buttonId === "right" || buttonId === "camera") && pressType === "short") {
        this.logActivity("زر يمين قصير ← وصف المشهد");
        await this.handlers["scene-summarize"].execute(session, { _sessionId: sessionId });
      } else if ((buttonId === "right" || buttonId === "camera") && pressType === "long") {
        this.logActivity("زر يمين طويل ← التعرف على الوجه");
        await this.handlers["face-recognize"].execute(session, { _sessionId: sessionId });
      } else if (buttonId === "left" && pressType === "short") {
        this.logActivity("زر يسار قصير ← قراءة النص");
        await this.handlers["ocr-read-text"].execute(session, { _sessionId: sessionId });
      } else if (buttonId === "left" && pressType === "long") {
        this.logActivity("زر يسار طويل ← إعادة آخر رد");
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
    const lastResponse = getLastResponse(sessionId);
    if (lastResponse) {
      logger.info(`[${sessionId}] Repeating last response`);
      await speak(session, lastResponse, sessionId);
    } else {
      await speakBilingual(session, messages.repeatNoHistory, sessionId);
    }
  }
}
