import { config } from "../utils/config";
import { Logger } from "../utils/logger";
import type { VisionResponse } from "../types";

const logger = new Logger("VisionService");

/** Returns the language instruction based on config */
function langInstruction(): string {
  return config.defaultLanguage === "ar"
    ? "Respond in Arabic."
    : "Respond in English.";
}

function langName(): string {
  return config.defaultLanguage === "ar" ? "Arabic" : "English";
}

/**
 * Sends a photo to OpenRouter for a scene description.
 */
export async function describeScene(imageBase64: string): Promise<VisionResponse> {
  logger.info("Sending image to OpenRouter API...");

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.openRouterApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Describe this scene in detail for a visually impaired person. Be concise but informative. ${langInstruction()}`
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API failed with status ${response.status}`);
    }

    const data = await response.json();
    const description = data.choices?.[0]?.message?.content || (config.defaultLanguage === "ar"
      ? "عذرًا، لم أتمكن من الحصول على وصف للصورة."
      : "Sorry, I couldn't get a description of the image.");
    logger.info(`Received scene description: ${description}`);

    return {
      description,
      confidence: 0.90,
    };
  } catch (error) {
    logger.error("Failed to connect to OpenRouter API", error);
    throw error;
  }
}

/**
 * Sends a photo and a question to a vision LLM for visual question answering.
 */
export async function answerVisualQuestion(
  imageBase64: string,
  question: string
): Promise<VisionResponse> {
  logger.info(`Sending image + question to OpenRouter: "${question}"`);

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.openRouterApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `${question}\n\nAnswer the question above based on the image. ${langInstruction()}`
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API failed with status ${response.status}`);
    }

    const data = await response.json();
    const description = data.choices?.[0]?.message?.content || (config.defaultLanguage === "ar"
      ? "عذرًا، لم أتمكن من الإجابة على السؤال."
      : "Sorry, I couldn't answer the question.");
    logger.info(`Received VQA answer: ${description}`);

    return {
      description,
      confidence: 0.90,
    };
  } catch (error) {
    logger.error("Failed to connect to OpenRouter API for VQA", error);
    throw error;
  }
}

/**
 * Sends a photo to OpenRouter for currency/money recognition.
 */
export async function recognizeCurrency(imageBase64: string): Promise<{
  denomination: string;
  currency: string;
  confidence: number;
}> {
  logger.info("Sending image to OpenRouter for currency recognition...");

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.openRouterApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Identify the currency and denomination of the money in this image. Respond ONLY with a raw JSON object (no markdown) containing 'denomination' (string, e.g. '50') and 'currency' (string, e.g. 'SAR')."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API failed with status ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    const cleanedContent = content.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleanedContent);

    return {
      denomination: parsed.denomination || "0",
      currency: parsed.currency || "UNKNOWN",
      confidence: 0.90,
    };
  } catch (error) {
    logger.error("Failed to recognize currency via OpenRouter API", error);
    throw error;
  }
}

/**
 * Sends a photo to OpenRouter for object detection/location.
 */
export async function detectObject(
  imageBase64: string,
  targetObject: string
): Promise<{ found: boolean; location: string; confidence: number }> {
  logger.info(`Searching for "${targetObject}" via OpenRouter...`);

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.openRouterApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Look for "${targetObject}" in this image. Respond ONLY with a raw JSON object (no markdown) containing 'found' (boolean) and 'location' (string, a brief description of where it is in ${langName()}, or empty string if not found).`
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API failed with status ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    const cleanedContent = content.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleanedContent);

    return {
      found: !!parsed.found,
      location: parsed.location || "",
      confidence: 0.90,
    };
  } catch (error) {
    logger.error("Failed to detect object via OpenRouter API", error);
    throw error;
  }
}

/**
 * Analyzes the center region of an image to detect the dominant color.
 */
export async function detectColor(imageBase64: string): Promise<{
  colorName: string;
  hex: string;
}> {
  logger.info("Analyzing image for dominant color via OpenRouter...");

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.openRouterApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Identify the dominant color in the center of this image. Respond ONLY with a raw JSON object (no markdown) containing 'colorName' (the name of the color in ${langName()}) and 'hex' (the hex code of the color).`
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API failed with status ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    const cleanedContent = content.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleanedContent);

    return {
      colorName: parsed.colorName || (config.defaultLanguage === "ar" ? "غير معروف" : "unknown"),
      hex: parsed.hex || "#000000",
    };
  } catch (error) {
    logger.error("Failed to detect color via OpenRouter API", error);
    throw error;
  }
}
