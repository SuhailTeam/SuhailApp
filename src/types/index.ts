import type { AppSession } from "@mentra/sdk";

/** Supported languages */
export type Language = "ar" | "en";

/** Command types available in the app */
export type CommandType =
  | "scene-summarize"
  | "ocr-read-text"
  | "face-recognize"
  | "face-enroll"
  | "find-object"
  | "currency-recognize"
  | "color-detect"
  | "visual-qa";

/** Result from the command router */
export interface RouteResult {
  command: CommandType;
  /** Extra parameters extracted from the transcription (e.g. object name for "find") */
  params?: Record<string, string>;
  /** Original transcription text */
  rawText: string;
}

/** Interface all command handlers must implement */
export interface CommandHandler {
  /** Execute the command for a given session */
  execute(session: AppSession, params?: Record<string, string>): Promise<void>;
}

/** Vision API response */
export interface VisionResponse {
  description: string;
  confidence: number;
}

/** Face recognition result */
export interface FaceRecognitionResult {
  name: string | null;
  confidence: number;
  isKnown: boolean;
}

/** Face enrollment data stored in memory */
export interface FaceRecord {
  name: string;
  descriptor: number[];
}

/** Object detection result */
export interface ObjectDetectionResult {
  objectName: string;
  found: boolean;
  location: string;
  confidence: number;
}

/** Currency detection result */
export interface CurrencyResult {
  denomination: string;
  currency: string;
  confidence: number;
}

/** Color detection result */
export interface ColorResult {
  colorName: string;
  hex: string;
}

/** Button press event types */
export type ButtonSide = "left" | "right";
export type PressType = "single" | "long";

/** Bilingual message pair */
export interface BilingualMessage {
  ar: string;
  en: string;
}

/** Listening session lifecycle states */
export type ListeningState = "idle" | "active" | "processing";
