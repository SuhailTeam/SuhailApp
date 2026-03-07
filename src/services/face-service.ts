import {
  CreateCollectionCommand,
  DescribeCollectionCommand,
  IndexFacesCommand,
  RekognitionClient,
  ResourceAlreadyExistsException,
  SearchFacesByImageCommand,
} from "@aws-sdk/client-rekognition";
import { config } from "../utils/config";
import { Logger } from "../utils/logger";
import type { FaceRecognitionResult } from "../types";

const logger = new Logger("FaceService");

const collectionId = config.awsRekognitionCollectionId;
const region = config.awsRegion;
const rekognition = new RekognitionClient({ region });
let collectionReadyPromise: Promise<void> | null = null;

function getSimilarityThreshold(): number {
  const threshold = Number.isFinite(config.confidenceThreshold) ? config.confidenceThreshold : 0.5;
  return threshold <= 1 ? threshold * 100 : threshold;
}

async function ensureCollectionReady(): Promise<void> {
  if (collectionReadyPromise) {
    await collectionReadyPromise;
    return;
  }

  collectionReadyPromise = (async () => {
    try {
      await rekognition.send(new DescribeCollectionCommand({ CollectionId: collectionId }));
      logger.info(`Rekognition collection "${collectionId}" is ready`);
    } catch (error: any) {
      if (error?.name === "ResourceNotFoundException") {
        logger.warn(`Rekognition collection "${collectionId}" not found. Creating it now...`);
        try {
          await rekognition.send(new CreateCollectionCommand({ CollectionId: collectionId }));
          logger.info(`Rekognition collection "${collectionId}" created`);
        } catch (createError: any) {
          if (!(createError instanceof ResourceAlreadyExistsException)) {
            throw createError;
          }
        }
        return;
      }
      throw error;
    }
  })();

  await collectionReadyPromise;
}

/**
 * Kept for compatibility. Face data persistence is handled by AWS Rekognition collection.
 */
export function configureSimpleStorage(
  _simpleStorage?: { get: (key: string) => Promise<string | null | undefined>; set: (key: string, value: string) => Promise<void> }
): void {
  logger.info("configureSimpleStorage called (ignored for Rekognition-backed face service)");
}

/**
 * Ensures the Rekognition collection exists and is reachable.
 */
export async function loadPersistedFaces(): Promise<void> {
  try {
    await ensureCollectionReady();
  } catch (error) {
    logger.error("Failed to initialize Rekognition collection:", error);
    throw error;
  }
}

/**
 * Recognizes a face in the given image by searching the Rekognition collection.
 */
export async function recognizeFace(imageBase64: string): Promise<FaceRecognitionResult> {
  await ensureCollectionReady();
  const threshold = getSimilarityThreshold();

  const response = await rekognition.send(new SearchFacesByImageCommand({
    CollectionId: collectionId,
    Image: { Bytes: Buffer.from(imageBase64, "base64") },
    MaxFaces: 1,
    FaceMatchThreshold: threshold,
  }));

  const bestMatch = response.FaceMatches?.[0];
  if (!bestMatch || !bestMatch.Face) {
    logger.info("No matching face found in Rekognition");
    return { name: null, confidence: 0, isKnown: false };
  }

  const confidence = (bestMatch.Similarity ?? 0) / 100;
  const name = bestMatch.Face.ExternalImageId || null;
  logger.info(`Matched ${name ?? "unknown"} with similarity=${(bestMatch.Similarity ?? 0).toFixed(2)}%`);
  return { name, confidence, isKnown: Boolean(name) };
}

/**
 * Enrolls a new face into the Rekognition collection with the provided name.
 */
export async function enrollFace(name: string, imageBase64: string): Promise<boolean> {
  await ensureCollectionReady();
  const cleanedName = name.trim();
  if (!cleanedName) throw new Error("Name is required for face enrollment");

  logger.info(`Enrolling face for "${cleanedName}" into Rekognition collection "${collectionId}"`);

  const response = await rekognition.send(new IndexFacesCommand({
    CollectionId: collectionId,
    Image: { Bytes: Buffer.from(imageBase64, "base64") },
    ExternalImageId: cleanedName,
    DetectionAttributes: [],
  }));

  const indexed = response.FaceRecords?.length ?? 0;
  if (indexed === 0) {
    const reasons = (response.UnindexedFaces ?? [])
      .flatMap((face) => face.Reasons ?? [])
      .join(", ");
    throw new Error(reasons ? `Face could not be indexed: ${reasons}` : "No face detected in the provided image");
  }

  logger.info(`Face enrolled successfully. Indexed faces count=${indexed}`);
  return true;
}

/**
 * Returns the number of enrolled faces.
 * Not queried from AWS to avoid extra API calls on hot paths.
 */
export function getEnrolledCount(): number {
  return 0;
}
