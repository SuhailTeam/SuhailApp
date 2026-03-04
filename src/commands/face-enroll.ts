import type { AppSession } from "@mentra/sdk";
import type { CommandHandler } from "../types";
import { AIHandler } from "../services/ai-handler";
import { speakBilingual, messages } from "../services/tts-service";
import { capturePhoto } from "../utils/image-utils";
import { Logger } from "../utils/logger";

const logger = new Logger("FaceEnroll");
const ai = new AIHandler();

/** How long to wait for the user to say a name before clearing pending state */
const ENROLLMENT_TIMEOUT_MS = 30_000;

/**
 * Face Enrollment command.
 * Captures a photo, extracts a face embedding, then waits for the user
 * to say the person's name in the next transcription.
 */
export class FaceEnrollCommand implements CommandHandler {
  /** Tracks sessions waiting for a name after enrollment photo */
  private pendingEnrollments = new Map<string, string>();

  /** Timeout handles for auto-clearing stale enrollments */
  private enrollmentTimers = new Map<string, ReturnType<typeof setTimeout>>();

  /** Lock to prevent concurrent enrollment completions per session */
  private processingEnrollments = new Set<string>();

  async execute(session: AppSession, params?: Record<string, string>): Promise<void> {
    logger.info("Executing face enrollment...");

    const sessionId = params?._sessionId;
    if (!sessionId) {
      logger.error("Missing _sessionId — cannot process face enrollment");
      await speakBilingual(session, messages.generalError);
      return;
    }

    try {
      // If we have a pending enrollment and a name was provided, complete it
      const pendingPhoto = this.pendingEnrollments.get(sessionId);
      if (pendingPhoto && params?.name) {
        const raw = params.name.trim();

        // Ignore TTS echo — if the mic picks up the app's own speech, skip it
        const echoPatterns = [
          "photo captured", "please say", "person's name",
          "تم التقاط", "من فضلك", "اسم الشخص",
          "capturing face", "جاري التقاط",
        ];
        const lower = raw.toLowerCase();
        if (echoPatterns.some((p) => lower.includes(p))) {
          logger.info(`Ignoring TTS echo: "${raw}"`);
          return;
        }

        // Prevent concurrent enrollment completions
        if (this.processingEnrollments.has(sessionId)) {
          logger.warn(`[${sessionId}] Enrollment already being processed, ignoring duplicate`);
          return;
        }
        this.processingEnrollments.add(sessionId);

        try {
          const name = raw;
          logger.info(`Completing enrollment for name: ${name}`);
          const success = await ai.enrollFace(name, pendingPhoto);
          this.clearPending(sessionId);

          if (success) {
            await speakBilingual(session, {
              ar: `تم تسجيل ${name} بنجاح.`,
              en: `${name} has been enrolled successfully.`,
            }, sessionId);
          } else {
            await speakBilingual(session, {
              ar: "فشل تسجيل الوجه. حاول مرة ثانية.",
              en: "Face enrollment failed. Please try again.",
            }, sessionId);
          }
        } finally {
          this.processingEnrollments.delete(sessionId);
        }
        return;
      }

      // Step 1: Capture photo
      await speakBilingual(session, {
        ar: "جاري التقاط صورة الوجه...",
        en: "Capturing face photo...",
      });

      const photo = await capturePhoto(session);
      if (!photo) {
        await speakBilingual(session, messages.cameraError);
        return;
      }

      // Step 2: Store photo and ask for name (with timeout)
      this.clearPending(sessionId); // Clear any stale state
      this.pendingEnrollments.set(sessionId, photo);

      const timer = setTimeout(async () => {
        if (this.pendingEnrollments.has(sessionId)) {
          logger.warn(`[${sessionId}] Enrollment timed out — clearing pending state`);
          this.clearPending(sessionId);
          await speakBilingual(session, {
            ar: "انتهت مهلة تسجيل الوجه. حاول مرة ثانية.",
            en: "Face enrollment timed out. Please try again.",
          });
        }
      }, ENROLLMENT_TIMEOUT_MS);
      this.enrollmentTimers.set(sessionId, timer);

      await speakBilingual(session, {
        ar: "تم التقاط الصورة. من فضلك قل اسم الشخص.",
        en: "Photo captured. Please say the person's name.",
      });

      logger.info("Waiting for user to provide the person's name...");
    } catch (error) {
      logger.error("Face enrollment failed:", error);
      this.clearPending(sessionId);
      await speakBilingual(session, messages.generalError);
    }
  }

  /** Check if a session has a pending enrollment (and is not already being processed) */
  hasPendingEnrollment(sessionId: string): boolean {
    return this.pendingEnrollments.has(sessionId) && !this.processingEnrollments.has(sessionId);
  }

  /** Clear all pending state for a session */
  private clearPending(sessionId: string): void {
    this.pendingEnrollments.delete(sessionId);
    const timer = this.enrollmentTimers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this.enrollmentTimers.delete(sessionId);
    }
  }
}
