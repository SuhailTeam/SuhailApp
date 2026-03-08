import type { Language } from "../types";

/** App configuration loaded from environment variables */
export const config = {
  /** MentraOS package name */
  packageName: process.env.PACKAGE_NAME || "com.suhail.assistant",

  /** MentraOS API key */
  mentraApiKey: process.env.MENTRAOS_API_KEY || "",

  /** Server port */
  port: parseInt(process.env.PORT || "3000", 10),

  /** OpenAI API key for GPT-4o vision */
  openaiApiKey: process.env.OPENAI_API_KEY || "",

  /** OpenRouter API key for Qwen3-VL */
  openRouterApiKey: process.env.OPENROUTER_API_KEY || "",

  /** Google Cloud Vision API key for OCR */
  googleCloudVisionApiKey: process.env.GOOGLE_CLOUD_VISION_API_KEY || "",

  /** Azure OCR API key */
  azureOcrKey: process.env.AZURE_OCR_KEY || "",

  /** Azure OCR endpoint */
  azureOcrEndpoint: process.env.AZURE_OCR_ENDPOINT || "",

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
