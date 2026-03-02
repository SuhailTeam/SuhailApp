import { config } from "../utils/config";
import { Logger } from "../utils/logger";
import type { FaceRecord, FaceRecognitionResult } from "../types";

const logger = new Logger("FaceService");

/** In-memory face database. TODO: Replace with SQLite/Firebase later. */
const faceDatabase: FaceRecord[] = [];

/**
 * Recognizes a face in the given image by comparing against stored embeddings.
 * TODO: Replace mock with real Azure Face API call.
 */
export async function recognizeFace(imageBase64: string): Promise<FaceRecognitionResult> {
  logger.info("Sending image to face recognition service...");
  logger.info(`Face database has ${faceDatabase.length} enrolled faces`);

  // TODO: Implement real Azure Face API call
  // 1. Detect face in image → get faceId
  // 2. Compare faceId against stored person group
  // 3. Return match or "unknown"

  if (faceDatabase.length === 0) {
    logger.info("[MOCK] No faces enrolled, returning unknown");
    return {
      name: null,
      confidence: 0,
      isKnown: false,
    };
  }

  // Mock: return the first enrolled face as a "match"
  const mockMatch = faceDatabase[0];
  logger.info(`[MOCK] Returning mock match: ${mockMatch.name}`);
  return {
    name: mockMatch.name,
    confidence: 0.91,
    isKnown: true,
  };
}

/**
 * Extracts a face embedding from an image for enrollment.
 * TODO: Replace mock with real face embedding extraction.
 */
export async function extractFaceEmbedding(imageBase64: string): Promise<number[] | null> {
  logger.info("Extracting face embedding from image...");

  // TODO: Implement real face embedding extraction via Azure Face API

  logger.info("[MOCK] Returning mock face embedding");
  // Return a mock 128-dimensional embedding
  return Array.from({ length: 128 }, () => Math.random());
}

/**
 * Enrolls a new face with a name into the in-memory database.
 */
export async function enrollFace(name: string, imageBase64: string): Promise<boolean> {
  logger.info(`Enrolling face for: ${name}`);

  const embedding = await extractFaceEmbedding(imageBase64);
  if (!embedding) {
    logger.error("Failed to extract face embedding for enrollment");
    return false;
  }

  const record: FaceRecord = {
    id: crypto.randomUUID(),
    name,
    embedding,
    createdAt: new Date(),
  };

  faceDatabase.push(record);
  logger.info(`Face enrolled successfully. Database now has ${faceDatabase.length} faces`);
  return true;
}

/**
 * Returns the number of enrolled faces.
 */
export function getEnrolledCount(): number {
  return faceDatabase.length;
}
