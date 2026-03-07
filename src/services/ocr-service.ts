import { Logger } from "../utils/logger";
import * as visionService from "./vision-service";

const logger = new Logger("OCRService");

/**
 * Extracts text from an image using the vision LLM (via OpenRouter).
 * Azure OCR is disabled for now — kept below for reference.
 */
export async function extractText(imageBase64: string): Promise<string> {
  logger.info("Routing OCR to vision LLM for text extraction...");
  return visionService.extractText(imageBase64);
}

// =============================================================================
// AZURE OCR (disabled) — uncomment and switch back if needed
// =============================================================================
//
// import { config } from "../utils/config";
//
// export async function extractTextAzure(imageBase64: string): Promise<string> {
//   logger.info("Sending image to Azure OCR service for text extraction...");
//
//   try {
//     const imageBuffer = Buffer.from(imageBase64, "base64");
//     const analyzeUrl = `${config.azureOcrEndpoint}/vision/v3.2/read/analyze`;
//     logger.info(`Submitting image to ${analyzeUrl}`);
//
//     const submitResponse = await fetch(analyzeUrl, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/octet-stream",
//         "Ocp-Apim-Subscription-Key": config.azureOcrKey,
//       },
//       body: imageBuffer,
//     });
//
//     if (!submitResponse.ok) {
//       throw new Error(
//         `Azure OCR submit failed: ${submitResponse.status} ${submitResponse.statusText}`,
//       );
//     }
//
//     const operationLocation = submitResponse.headers.get("operation-location");
//     if (!operationLocation) {
//       throw new Error("No operation-location header in Azure OCR response");
//     }
//
//     logger.info(`Operation location: ${operationLocation}`);
//
//     let result;
//     while (true) {
//       logger.info("Polling for OCR results...");
//       const pollResponse = await fetch(operationLocation, {
//         headers: {
//           "Ocp-Apim-Subscription-Key": config.azureOcrKey,
//         },
//       });
//
//       if (!pollResponse.ok) {
//         throw new Error(
//           `Azure OCR poll failed: ${pollResponse.status} ${pollResponse.statusText}`,
//         );
//       }
//
//       result = await pollResponse.json();
//
//       if (result.status === "succeeded") {
//         break;
//       } else if (result.status === "failed") {
//         throw new Error("Azure OCR analysis failed");
//       }
//
//       await new Promise((resolve) => setTimeout(resolve, 1000));
//     }
//
//     const textLines: string[] = [];
//     if (result.analyzeResult && result.analyzeResult.readResults) {
//       for (const readResult of result.analyzeResult.readResults) {
//         if (readResult.lines) {
//           for (const line of readResult.lines) {
//             if (line.text) {
//               textLines.push(line.text);
//             }
//           }
//         }
//       }
//     }
//
//     const extractedText = textLines.join(" ");
//     logger.info(`Extracted text: ${extractedText.substring(0, 100)}...`);
//
//     return extractedText;
//   } catch (error) {
//     logger.error("Azure OCR failed:", error);
//     throw error;
//   }
// }
