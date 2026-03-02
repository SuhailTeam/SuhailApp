import type { AppSession } from "@mentra/sdk";
import { Logger } from "./logger";

const logger = new Logger("ImageUtils");

/**
 * Validates that a base64 string looks like a valid image.
 */
export function isValidBase64Image(base64: string): boolean {
  if (!base64 || base64.length < 100) {
    return false;
  }
  return true;
}

/**
 * Strips the data URI prefix from a base64 image string if present.
 * e.g. "data:image/jpeg;base64,/9j/4A..." → "/9j/4A..."
 */
export function stripBase64Prefix(base64: string): string {
  const commaIndex = base64.indexOf(",");
  if (commaIndex !== -1 && commaIndex < 50) {
    return base64.substring(commaIndex + 1);
  }
  return base64;
}

/**
 * Gets the MIME type from a base64 data URI, defaults to image/jpeg.
 */
export function getMimeType(base64: string): string {
  const match = base64.match(/^data:(image\/\w+);base64,/);
  return match ? match[1] : "image/jpeg";
}

/**
 * Captures a photo from the session camera with error handling.
 * Returns the base64-encoded image string or null if capture failed.
 */
export async function capturePhoto(session: AppSession): Promise<string | null> {
  try {
    logger.info("Capturing photo from glasses camera...");
    const photoData = await session.camera.requestPhoto();
    if (!photoData || !photoData.buffer) {
      logger.warn("Captured photo is invalid or empty");
      return null;
    }
    const base64 = photoData.buffer.toString("base64");
    logger.info(`Photo captured successfully (${Math.round(photoData.size / 1024)}KB)`);
    return base64;
  } catch (error) {
    logger.error("Failed to capture photo:", error);
    return null;
  }
}
