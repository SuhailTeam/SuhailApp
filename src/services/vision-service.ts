import { config } from "../utils/config";
import { Logger } from "../utils/logger";
import type { VisionResponse } from "../types";

const logger = new Logger("VisionService");

/**
 * Sends a photo to a vision LLM (GPT-4o) for scene description.
 * TODO: Replace mock with real OpenAI API call.
 */
export async function describeScene(imageBase64: string): Promise<VisionResponse> {
  logger.info("Sending image to vision AI service for scene description...");

  try {
    const response = await fetch("http://localhost:8000/describe-scene", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image_base64: imageBase64,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI service failed with status ${response.status}`);
    }

    const data = await response.json();
    logger.info(`Received scene description: ${data.description}`);

    return {
      description: data.description,
      confidence: data.confidence,
    };
  } catch (error) {
    logger.error("Failed to connect to AI vision service", error);
    throw error;
  }
}

/**
 * Sends a photo and a question to a vision LLM for visual question answering.
 * TODO: Replace mock with real OpenAI API call.
 */
export async function answerVisualQuestion(
  imageBase64: string,
  question: string
): Promise<VisionResponse> {
  logger.info(`Sending image + question to vision LLM: "${question}"`);

  // TODO: Implement real OpenAI GPT-4o vision API call with the user's question
  // Similar to describeScene but with the user's question as the text prompt

  logger.info("[MOCK] Returning mock VQA answer");
  return {
    description: `Based on the image, the answer to "${question}" is: Yes, the area appears clear and safe to walk through.`,
    confidence: 0.88,
  };
}

/**
 * Sends a photo to a vision LLM for currency/money recognition.
 * TODO: Replace mock with real API call.
 */
export async function recognizeCurrency(imageBase64: string): Promise<{
  denomination: string;
  currency: string;
  confidence: number;
}> {
  logger.info("Sending image to vision LLM for currency recognition...");

  // TODO: Implement real API call for currency recognition

  logger.info("[MOCK] Returning mock currency result");
  return {
    denomination: "50",
    currency: "SAR",
    confidence: 0.95,
  };
}

/**
 * Sends a photo to a vision LLM for object detection/location.
 * TODO: Replace mock with real API call.
 */
export async function detectObject(
  imageBase64: string,
  targetObject: string
): Promise<{ found: boolean; location: string; confidence: number }> {
  logger.info(`Searching for "${targetObject}" in image...`);

  // TODO: Implement real object detection API call

  logger.info("[MOCK] Returning mock object detection result");
  return {
    found: true,
    location: "to your right, on the table",
    confidence: 0.87,
  };
}

/**
 * Analyzes the center region of an image to detect the dominant color.
 * TODO: Replace mock with real color analysis (can be done client-side or via API).
 */
export async function detectColor(imageBase64: string): Promise<{
  colorName: string;
  hex: string;
}> {
  logger.info("Analyzing image for dominant color...");

  // TODO: Implement real color detection
  // This could use a simple image processing library or a vision API

  logger.info("[MOCK] Returning mock color result");
  return {
    colorName: "Navy Blue",
    hex: "#000080",
  };
}
