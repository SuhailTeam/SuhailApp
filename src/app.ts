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
import { AIHandler } from "./services/ai-handler";
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

  private ai = new AIHandler();
  private faceStorageConfigured = false;

  /** Session IDs currently connected (tracked for the mini app UI) */
  private connectedSessions = new Set<string>();

  /** Sessions in listening mode (waiting for next voice command after button press) */
  private listeningSessions = new Map<string, { timer: ReturnType<typeof setTimeout>; activatedAt: number }>();

  /** How long the listening window stays open after button press (ms) */
  private static readonly LISTENING_TIMEOUT_MS = 10_000;

  /** Minimum confidence (0-1) to accept a transcription. Below this is treated as noise. */
  private static readonly MIN_TRANSCRIPTION_CONFIDENCE = 0.4;

  /** Sessions currently speaking (TTS echo guard — ignore transcriptions while speaking) */
  private speakingSessions = new Set<string>();

  /** Extra buffer after TTS finishes to let the mic settle (ms) */
  private static readonly TTS_ECHO_BUFFER_MS = 1_500;

  /** Grace period after activating listening to let the STT pipeline flush old audio (ms) */
  private static readonly LISTENING_GRACE_MS = 2_000;

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

  /** Loads persisted face records before the server starts accepting sessions. */
  async initialize(): Promise<void> {
    await this.ai.loadPersistedFaces();
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

    if (!this.faceStorageConfigured) {
      this.ai.configureFaceStorage(session.simpleStorage);
      await this.ai.loadPersistedFaces();
      this.faceStorageConfigured = true;
    }

    this.connectedSessions.add(sessionId);
    this.logActivity(`جلسة جديدة (${userId})`);

    // Welcome the user
    await speakBilingual(session, messages.welcome);

    // Listen for voice transcriptions locked to the user's preferred language
    const langCode = config.defaultLanguage === "ar" ? "ar-SA" : "en-US";
    logger.info(`[${sessionId}] Transcription language locked to: ${langCode}`);
    session.events.onTranscriptionForLanguage(langCode, async (data) => {
      if (!data.isFinal) return;

      // Filter out low-confidence transcriptions (likely background noise)
      const confidence = data.confidence ?? 1;
      if (confidence < SuhailApp.MIN_TRANSCRIPTION_CONFIDENCE) {
        logger.info(`[${sessionId}] Dropped low-confidence transcription (${confidence.toFixed(2)}): "${data.text}"`);
        return;
      }

      logger.info(`[${sessionId}] Transcription (confidence=${confidence.toFixed(2)}): "${data.text}"`);
      await this.handleTranscription(session, sessionId, data.text);
    });

    // Listen for button presses (log all for debugging)
    session.events.onButtonPress(async (event) => {
      logger.info(`[${sessionId}] Button press: buttonId="${event.buttonId}" pressType="${event.pressType}"`);
      await this.handleButtonPress(session, sessionId, event);
    });

    // Listen for touch/swipe gestures on the swipe pad
    session.events.onTouchEvent(async (event) => {
      logger.info(`[${sessionId}] Touch event: gesture="${event.gesture_name}" device="${event.device_model}"`);
      await this.handleTouchEvent(session, sessionId, event.gesture_name);
    });

    logger.info(`[${sessionId}] Session event listeners registered`);
  }

  /**
   * Called when a session ends. Cleans up tracking state.
   */
  override async onStop(sessionId: string, userId: string, reason: string): Promise<void> {
    this.connectedSessions.delete(sessionId);
    this.deactivateListening(sessionId);
    this.speakingSessions.delete(sessionId);
    clearLastResponse(sessionId);
    this.logActivity(`انتهت الجلسة (${reason})`);
    logger.info(`Session stopped: ${sessionId} (user: ${userId}, reason: ${reason})`);
  }

  /**
   * Handles a voice transcription by routing it to the correct command.
   * Only processes commands when listening mode is active (after left button press)
   * or when a face enrollment is pending.
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

    // TTS echo guard — ignore transcriptions while the app is speaking
    if (this.speakingSessions.has(sessionId)) {
      logger.info(`[${sessionId}] Ignored (TTS echo guard): "${text}"`);
      return;
    }

    try {
      // Check if we're waiting for a name during face enrollment (always active)
      if (this.faceEnrollHandler.hasPendingEnrollment(sessionId)) {
        logger.info(`[${sessionId}] Completing pending face enrollment with name: "${text}"`);
        await this.faceEnrollHandler.execute(session, { name: text, _sessionId: sessionId });
        return;
      }

      // Only process commands when listening mode is active
      const listeningState = this.listeningSessions.get(sessionId);
      if (!listeningState) {
        logger.info(`[${sessionId}] Ignored (not listening): "${text}"`);
        return;
      }

      // Ignore transcriptions that arrive too soon after activation — these are
      // stale audio from before the swipe that the STT pipeline hadn't flushed yet
      const elapsed = Date.now() - listeningState.activatedAt;
      if (elapsed < SuhailApp.LISTENING_GRACE_MS) {
        logger.info(`[${sessionId}] Ignored (stale transcription, ${elapsed}ms after activation): "${text}"`);
        return;
      }

      // Deactivate listening mode — we got a command
      this.deactivateListening(sessionId);

      // Route the transcription to the correct command
      const route = routeCommand(text);
      if (!route) {
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

      // Enable TTS echo guard before the handler speaks, clear after + buffer
      this.speakingSessions.add(sessionId);
      try {
        await handler.execute(session, { ...route.params, _sessionId: sessionId });
      } finally {
        setTimeout(() => {
          this.speakingSessions.delete(sessionId);
          logger.info(`[${sessionId}] TTS echo guard lifted`);
        }, SuhailApp.TTS_ECHO_BUFFER_MS);
      }
    } catch (error) {
      logger.error(`[${sessionId}] Error handling transcription:`, error);
      await speakBilingual(session, messages.generalError, sessionId);
    }
  }

  /**
   * Activates listening mode for a session. The next voice transcription
   * within the timeout window will be processed as a command.
   */
  private activateListening(session: AppSession, sessionId: string): void {
    // Clear any existing listening timer
    this.deactivateListening(sessionId);

    const timer = setTimeout(() => {
      if (this.listeningSessions.has(sessionId)) {
        this.listeningSessions.delete(sessionId);
        logger.info(`[${sessionId}] Listening mode timed out`);
      }
    }, SuhailApp.LISTENING_TIMEOUT_MS);

    this.listeningSessions.set(sessionId, { timer, activatedAt: Date.now() });
    logger.info(`[${sessionId}] Listening mode activated (${SuhailApp.LISTENING_TIMEOUT_MS / 1000}s window)`);
  }

  /**
   * Deactivates listening mode for a session.
   */
  private deactivateListening(sessionId: string): void {
    const state = this.listeningSessions.get(sessionId);
    if (state) {
      clearTimeout(state.timer);
      this.listeningSessions.delete(sessionId);
    }
  }

  /**
   * Handles touch/swipe gestures on the Mentra Live swipe pad.
   *
   * Gesture mapping:
   * - Forward swipe  → Activate listening mode (swipe-to-command)
   * - Backward swipe → Repeat last response
   */
  private async handleTouchEvent(
    session: AppSession,
    sessionId: string,
    gestureName: string
  ): Promise<void> {
    try {
      if (gestureName === "forward_swipe") {
        // TESTING: forward swipe triggers OCR directly
        this.logActivity("سحب للأمام ← قراءة نص");
        this.speakingSessions.add(sessionId);
        try {
          await this.handlers["ocr-read-text"].execute(session, { _sessionId: sessionId });
        } finally {
          setTimeout(() => {
            this.speakingSessions.delete(sessionId);
            logger.info(`[${sessionId}] TTS echo guard lifted`);
          }, SuhailApp.TTS_ECHO_BUFFER_MS);
        }
      } else if (gestureName === "backward_swipe") {
        // TESTING: backward swipe triggers VQA (scene describe)
        this.logActivity("سحب للخلف ← وصف المشهد");
        this.speakingSessions.add(sessionId);
        try {
          await this.handlers["scene-summarize"].execute(session, { _sessionId: sessionId });
        } finally {
          setTimeout(() => {
            this.speakingSessions.delete(sessionId);
            logger.info(`[${sessionId}] TTS echo guard lifted`);
          }, SuhailApp.TTS_ECHO_BUFFER_MS);
        }
      } else {
        logger.info(`[${sessionId}] Unhandled gesture: "${gestureName}"`);
      }
    } catch (error) {
      logger.error(`[${sessionId}] Error handling touch event:`, error);
      await speakBilingual(session, messages.generalError);
    }
  }

  /**
   * Handles physical button presses on the Mentra Live glasses.
   * Left button is used as fallback if swipe pad doesn't work.
   *
   * Button mapping:
   * - Short press (left)  → Activate listening mode
   * - Long press (left)   → Repeat last response
   * - Right/camera button → Reserved (triggers native camera hardware)
   */
  private async handleButtonPress(
    session: AppSession,
    sessionId: string,
    event: { buttonId: string; pressType: "short" | "long" }
  ): Promise<void> {
    try {
      const { buttonId, pressType } = event;

      if (buttonId === "left" && pressType === "short") {
        this.logActivity("زر يسار قصير ← وضع الاستماع");
        this.activateListening(session, sessionId);
        await speakBilingual(session, messages.listening, sessionId);
      } else if (buttonId === "left" && pressType === "long") {
        this.logActivity("زر يسار طويل ← إعادة آخر رد");
        await this.repeatLastResponse(session, sessionId);
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
