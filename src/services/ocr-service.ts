import { config } from "../utils/config";
import { Logger } from "../utils/logger";
import type { OcrResponse } from "../types";

const logger = new Logger("OCRService");

/**
 * Sends a photo to Google Cloud Vision API for text extraction (OCR).
 * TODO: Replace mock with real Google Cloud Vision API call.
 */
export async function extractText(imageBase64: string): Promise<OcrResponse> {
  logger.info("Sending image to OCR service for text extraction...");

  // TODO: Implement real Google Cloud Vision OCR API call
  // const response = await fetch(
  //   `https://vision.googleapis.com/v1/images:annotate?key=${config.googleCloudVisionApiKey}`,
  //   {
  //     method: "POST",
  //     headers: { "Content-Type": "application/json" },
  //     body: JSON.stringify({
  //       requests: [{
  //         image: { content: imageBase64 },
  //         features: [{ type: "TEXT_DETECTION", maxResults: 1 }],
  //       }],
  //     }),
  //   }
  // );
  // const data = await response.json();
  // const text = data.responses?.[0]?.fullTextAnnotation?.text || "";

  logger.info("[MOCK] Returning mock OCR result");
  return {
    text: "This is a sample extracted text from the image. It contains information that would normally be read from a sign, document, or label captured by the glasses camera.",
    confidence: 0.94,
  };
}
