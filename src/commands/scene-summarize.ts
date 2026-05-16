import type { AppSession } from "@mentra/sdk";
import { speak } from "../services/tts-service";
import { getSettings } from "../services/settings-store";
import { config } from "../utils/config";
import { mark } from "../utils/timeline";
import { AbstractCommandHandler } from "./base-command";

const MAX_SCENE_CHARS = 180;

const truncationSuffix = { ar: " وغيره. اسحب للأمام للإيقاف.", en: " ...and more. Swipe forward to stop." };

function namesPrefix(names: string[]): string {
  if (names.length === 0) return "";
  return getSettings().language === "ar"
    ? `${names.join("، ")}. `
    : `${names.join(", ")}. `;
}

function truncateAtBoundary(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const slice = text.slice(0, maxChars);
  const lastBoundary = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf("? "), slice.lastIndexOf("! "));
  if (lastBoundary > maxChars * 0.5) return slice.slice(0, lastBoundary + 1).trim();
  const lastSpace = slice.lastIndexOf(" ");
  return slice.slice(0, lastSpace > maxChars * 0.6 ? lastSpace : maxChars).trim();
}

/**
 * Scene Summarization command.
 * Captures a photo, identifies known faces, and describes the user's surroundings
 * using recognized names for a more personal description.
 */
export class SceneSummarizeCommand extends AbstractCommandHandler {
  constructor() {
    super("SceneSummarize");
  }

  protected async process(
    session: AppSession,
    photo: string,
    _params: Record<string, string> | undefined,
    sessionId: string | undefined,
  ): Promise<void> {
    // Run face recognition and the bare scene description in parallel — both
    // consume the same photo and there's no dependency between them. We compose
    // the final utterance by prepending recognized names to the scene text.
    mark(sessionId, "face_recognize_start");
    mark(sessionId, "vision_start");
    const facePromise = this.ai.recognizeAllFaces(photo).finally(() => mark(sessionId, "face_recognize_done"));
    const scenePromise = this.ai.describeScene(photo).finally(() => mark(sessionId, "vision_done"));
    const [faceSettled, sceneSettled] = await Promise.allSettled([facePromise, scenePromise]);

    let knownNames: string[] = [];
    if (faceSettled.status === "fulfilled") {
      knownNames = faceSettled.value.faces
        .filter(f => f.isKnown && f.name && f.confidence >= config.confidenceThreshold)
        .map(f => f.name!);
      if (knownNames.length > 0) {
        this.logger.info(`Recognized faces in scene: ${knownNames.join(", ")}`);
      }
    } else {
      this.logger.warn("Face recognition failed during scene describe, continuing without names", faceSettled.reason);
    }

    if (sceneSettled.status !== "fulfilled") {
      throw sceneSettled.reason;
    }

    const rawDescription = `${namesPrefix(knownNames)}${sceneSettled.value.description}`;
    const description = rawDescription.length > MAX_SCENE_CHARS
      ? truncateAtBoundary(rawDescription, MAX_SCENE_CHARS) + truncationSuffix[getSettings().language]
      : rawDescription;

    this.logger.info(`Scene description (${rawDescription.length}→${description.length} chars, confidence: ${sceneSettled.value.confidence}): ${description}`);
    await speak(session, description, sessionId);
  }
}
