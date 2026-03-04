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

  /** Default language for responses */
  defaultLanguage: (process.env.DEFAULT_LANGUAGE || "ar") as Language,

  /** Confidence threshold for recognition results */
  confidenceThreshold: parseFloat(process.env.CONFIDENCE_THRESHOLD || "0.5"),
} as const;
