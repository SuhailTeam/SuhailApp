import * as fs from "node:fs/promises";
import path from "node:path";
import { config } from "../utils/config";
import { Logger } from "../utils/logger";
import type { FaceRecognitionResult } from "../types";

const logger = new Logger("FaceService");

// Native deps are optional — face features degrade gracefully when unavailable
let faceapi: typeof import("@vladmandic/face-api") | null = null;
let Canvas: any = null;
let Image: any = null;
let ImageData: any = null;
let loadImage: any = null;

try {
  require("@tensorflow/tfjs-node");
  faceapi = require("@vladmandic/face-api");
  const canvas = require("canvas");
  Canvas = canvas.Canvas;
  Image = canvas.Image;
  ImageData = canvas.ImageData;
  loadImage = canvas.loadImage;
  logger.info("Native face recognition dependencies loaded");
} catch {
  logger.warn("Face recognition unavailable — @tensorflow/tfjs-node or canvas not installed");
}

interface FaceRecord {
  name: string;
  descriptor: Float32Array;
}

interface PersistedFaceRecord {
  name: string;
  descriptor: number[];
}

const faceDatabase: FaceRecord[] = [];
const modelsPath = path.resolve(process.cwd(), "models");
const dataDirPath = path.resolve(process.cwd(), "data");
const facesFilePath = path.join(dataDirPath, "faces.json");
const storageKey = "faces";

let storage:
  | {
      get: (key: string) => Promise<string | null | undefined>;
      set: (key: string, value: string) => Promise<void>;
    }
  | null = null;
let envPatched = false;
let modelLoadPromise: Promise<void> | null = null;

function ensureDepsAvailable(): void {
  if (!faceapi) {
    throw new Error("Face recognition is not available — native dependencies not installed");
  }
}

function patchFaceApiEnv(): void {
  if (envPatched) return;
  faceapi!.env.monkeyPatch({
    Canvas: Canvas as unknown as typeof HTMLCanvasElement,
    Image: Image as unknown as typeof HTMLImageElement,
    ImageData: ImageData as unknown as typeof globalThis.ImageData,
  });
  envPatched = true;
}

async function ensureModelsLoaded(): Promise<void> {
  ensureDepsAvailable();
  patchFaceApiEnv();
  if (!modelLoadPromise) {
    modelLoadPromise = (async () => {
      logger.info(`Loading face models from ${modelsPath}`);
      await Promise.all([
        faceapi!.nets.ssdMobilenetv1.loadFromDisk(modelsPath),
        faceapi!.nets.faceLandmark68Net.loadFromDisk(modelsPath),
        faceapi!.nets.faceRecognitionNet.loadFromDisk(modelsPath),
      ]);
      logger.info("Face models loaded");
    })();
  }
  await modelLoadPromise;
}

async function decodeImage(imageBase64: string): Promise<Image> {
  const buffer = Buffer.from(imageBase64, "base64");
  return loadImage(buffer);
}

async function detectDescriptor(imageBase64: string): Promise<Float32Array | null> {
  await ensureModelsLoaded();
  const image = await decodeImage(imageBase64);
  const detection = await faceapi!
    .detectSingleFace(image as unknown as HTMLImageElement)
    .withFaceLandmarks()
    .withFaceDescriptor();

  return detection?.descriptor ?? null;
}

function serializeFaceDatabase(): PersistedFaceRecord[] {
  return faceDatabase.map((face) => ({
    name: face.name,
    descriptor: Array.from(face.descriptor),
  }));
}

function replaceFaceDatabase(records: PersistedFaceRecord[]): void {
  faceDatabase.length = 0;
  for (const record of records) {
    faceDatabase.push({
      name: record.name,
      descriptor: new Float32Array(record.descriptor),
    });
  }
}

async function readFromFile(): Promise<PersistedFaceRecord[]> {
  try {
    const raw = await fs.readFile(facesFilePath, "utf8");
    const parsed = JSON.parse(raw) as PersistedFaceRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return [];
    throw error;
  }
}

async function writeToFile(): Promise<void> {
  await fs.mkdir(dataDirPath, { recursive: true });
  await fs.writeFile(facesFilePath, JSON.stringify(serializeFaceDatabase(), null, 2), "utf8");
}

async function persistFaceDatabase(): Promise<void> {
  const payload = JSON.stringify(serializeFaceDatabase());

  if (storage) {
    await storage.set(storageKey, payload);
    logger.info(`Saved ${faceDatabase.length} enrolled faces to simple storage`);
    return;
  }

  await writeToFile();
  logger.info(`Saved ${faceDatabase.length} enrolled faces to ${facesFilePath}`);
}

function createMatcher(): faceapi.FaceMatcher | null {
  if (faceDatabase.length === 0) return null;

  const byName = new Map<string, Float32Array[]>();
  for (const face of faceDatabase) {
    const descriptors = byName.get(face.name) || [];
    descriptors.push(face.descriptor);
    byName.set(face.name, descriptors);
  }

  const labeled = Array.from(byName.entries()).map(
    ([name, descriptors]) => new faceapi!.LabeledFaceDescriptors(name, descriptors)
  );
  return new faceapi!.FaceMatcher(labeled, config.confidenceThreshold);
}

/**
 * Optionally allows per-session persistent storage via Mentra simple storage.
 * Falls back to local file persistence when not provided.
 */
export function configureSimpleStorage(
  simpleStorage?: { get: (key: string) => Promise<string | null | undefined>; set: (key: string, value: string) => Promise<void> }
): void {
  if (!simpleStorage) return;
  storage = simpleStorage;
}

/**
 * Loads persisted enrolled faces into memory.
 */
export async function loadPersistedFaces(): Promise<void> {
  try {
    if (storage) {
      const raw = await storage.get(storageKey);
      const records = raw ? (JSON.parse(raw) as PersistedFaceRecord[]) : [];
      replaceFaceDatabase(Array.isArray(records) ? records : []);
      logger.info(`Loaded ${faceDatabase.length} enrolled faces from simple storage`);
      return;
    }

    const fileRecords = await readFromFile();
    replaceFaceDatabase(fileRecords);
    logger.info(`Loaded ${faceDatabase.length} enrolled faces from ${facesFilePath}`);
  } catch (error) {
    logger.error("Failed to load persisted faces:", error);
    faceDatabase.length = 0;
  }
}

/**
 * Recognizes a face in the given image by comparing against stored descriptors.
 */
export async function recognizeFace(imageBase64: string): Promise<FaceRecognitionResult> {
  logger.info(`Running face recognition against ${faceDatabase.length} enrolled faces`);

  if (faceDatabase.length === 0) {
    return { name: null, confidence: 0, isKnown: false };
  }

  const queryDescriptor = await detectDescriptor(imageBase64);
  if (!queryDescriptor) {
    logger.warn("No face detected in recognition image");
    return { name: null, confidence: 0, isKnown: false };
  }

  const matcher = createMatcher();
  if (!matcher) {
    return { name: null, confidence: 0, isKnown: false };
  }

  const bestMatch = matcher.findBestMatch(queryDescriptor);
  if (bestMatch.label === "unknown" || bestMatch.distance > config.confidenceThreshold) {
    logger.info(`No matching face found. Best distance=${bestMatch.distance.toFixed(4)}`);
    return { name: null, confidence: 0, isKnown: false };
  }

  const confidence = Math.max(0, 1 - bestMatch.distance);
  logger.info(`Matched ${bestMatch.label} with confidence=${confidence.toFixed(4)}`);
  return { name: bestMatch.label, confidence, isKnown: true };
}

/**
 * Extracts a face descriptor from an image for enrollment.
 */
export async function extractFaceEmbedding(imageBase64: string): Promise<number[] | null> {
  const descriptor = await detectDescriptor(imageBase64);
  return descriptor ? Array.from(descriptor) : null;
}

/**
 * Enrolls a new face with a name into the in-memory database and persists it.
 */
export async function enrollFace(name: string, imageBase64: string): Promise<boolean> {
  logger.info(`Enrolling face for "${name}"`);

  const descriptor = await detectDescriptor(imageBase64);
  if (!descriptor) {
    throw new Error("No face detected in the provided image");
  }

  faceDatabase.push({ name, descriptor });
  await persistFaceDatabase();

  logger.info(`Face enrolled successfully. Database now has ${faceDatabase.length} faces`);
  return true;
}

/**
 * Returns the number of enrolled faces.
 */
export function getEnrolledCount(): number {
  return faceDatabase.length;
}
