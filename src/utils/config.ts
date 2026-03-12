import type { Language } from "../types";

/** App configuration loaded from environment variables */
export const config = {
  /** MentraOS package name */
  packageName: process.env.PACKAGE_NAME || "com.suhail.assistant",

  /** MentraOS API key */
  mentraApiKey: process.env.MENTRAOS_API_KEY || "",

  /** Server port */
  port: parseInt(process.env.PORT || "3000", 10),

  /** OpenRouter API key */
  openRouterApiKey: process.env.OPENROUTER_API_KEY || "",

  /** Vision LLM model (used for scene description, VQA, currency, object, color, OCR) */
  visionModel: process.env.VISION_MODEL || "google/gemini-2.5-flash-lite",

  /** Classification LLM model (used for intent classification and transcription normalization) */
  classificationModel: process.env.CLASSIFICATION_MODEL || "google/gemini-2.5-flash-lite",

  /** AWS region for Rekognition (e.g. us-east-1) */
  awsRegion: process.env.AWS_REGION || "us-east-1",

  /** AWS Rekognition collection ID used for face enrollment and matching */
  awsRekognitionCollectionId: process.env.AWS_REKOGNITION_COLLECTION_ID || "suhail-faces",

  /** Default language for responses */
  defaultLanguage: (process.env.DEFAULT_LANGUAGE || "ar") as Language,

  /** Confidence threshold for recognition results.
   * If <=1, interpreted as ratio (0-1). If >1, interpreted as percent (0-100). */
  confidenceThreshold: parseFloat(process.env.CONFIDENCE_THRESHOLD || "0.5"),

  /** Minimum transcription confidence to accept (0-1). Below this is treated as noise. */
  minTranscriptionConfidence: parseFloat(process.env.MIN_CONFIDENCE || "0.55"),
} as const;
