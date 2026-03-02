import type { AppSession } from "@mentra/sdk";
import type { CommandHandler } from "../types";
import { AIHandler } from "../services/ai-handler";
import { speak, speakBilingual, messages } from "../services/tts-service";
import { capturePhoto } from "../utils/image-utils";
import { Logger } from "../utils/logger";

const logger = new Logger("FaceEnroll");
const ai = new AIHandler();

/**
 * Face Enrollment command.
 * Captures a photo, extracts a face embedding, then waits for the user
 * to say the person's name in the next transcription.
 */
export class FaceEnrollCommand implements CommandHandler {
  /** Tracks sessions waiting for a name after enrollment photo */
  private pendingEnrollments = new Map<string, string>();

  async execute(session: AppSession, params?: Record<string, string>): Promise<void> {
    logger.info("Executing face enrollment...");
    const sessionId = (session as any).id || "default";

    try {
      // If we have a pending enrollment and a name was provided, complete it
      const pendingPhoto = this.pendingEnrollments.get(sessionId);
      if (pendingPhoto && params?.name) {
        const name = params.name;
        logger.info(`Completing enrollment for name: ${name}`);
        const success = await ai.enrollFace(name, pendingPhoto);
        this.pendingEnrollments.delete(sessionId);

        if (success) {
          await speakBilingual(session, {
            ar: `تم تسجيل ${name} بنجاح.`,
            en: `${name} has been enrolled successfully.`,
          });
        } else {
          await speakBilingual(session, {
            ar: "فشل تسجيل الوجه. حاول مرة ثانية.",
            en: "Face enrollment failed. Please try again.",
          });
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

      // Step 2: Store photo and ask for name
      this.pendingEnrollments.set(sessionId, photo);

      await speakBilingual(session, {
        ar: "تم التقاط الصورة. من فضلك قل اسم الشخص.",
        en: "Photo captured. Please say the person's name.",
      });

      // The next transcription will be handled by the app to complete enrollment
      logger.info("Waiting for user to provide the person's name...");
    } catch (error) {
      logger.error("Face enrollment failed:", error);
      this.pendingEnrollments.delete(sessionId);
      await speakBilingual(session, messages.generalError);
    }
  }

  /** Check if a session has a pending enrollment */
  hasPendingEnrollment(sessionId: string): boolean {
    return this.pendingEnrollments.has(sessionId);
  }
}
