import { Logger } from "../utils/logger";
import type { CommandType, RouteResult } from "../types";

const logger = new Logger("CommandRouter");

/**
 * Simple exact-word command routing.
 * Each command is triggered by a single keyword (English or Arabic).
 * The user says the keyword after activating listening mode.
 */
const commandMap: Array<{ words: string[]; command: CommandType }> = [
  { words: ["describe", "وصف"], command: "scene-summarize" },
  { words: ["read", "اقرأ"], command: "ocr-read-text" },
  { words: ["who", "من"], command: "face-recognize" },
  { words: ["enroll", "سجل"], command: "face-enroll" },
  { words: ["find", "وين"], command: "find-object" },
  { words: ["money", "فلوس"], command: "currency-recognize" },
  { words: ["color", "لون"], command: "color-detect" },
];

/**
 * Parses a transcription and determines which command to execute.
 * Matches the first word of the transcription against known trigger words.
 * Falls back to Visual QA if no match is found.
 */
export function routeCommand(transcription: string): RouteResult | null {
  const text = transcription.toLowerCase().trim();
  logger.info(`Routing transcription: "${text}"`);

  if (text.length === 0) {
    logger.info("Empty transcription — ignoring");
    return null;
  }

  const firstWord = text.split(/\s+/)[0];

  for (const entry of commandMap) {
    if (entry.words.includes(firstWord)) {
      logger.info(`Matched command: ${entry.command} (trigger: "${firstWord}")`);

      // Extract remaining text as params for find-object
      let params: Record<string, string> | undefined;
      if (entry.command === "find-object") {
        const rest = text.slice(firstWord.length).trim();
        params = { objectName: rest || "object" };
      }

      return { command: entry.command, params, rawText: transcription };
    }
  }

  // Default: treat as visual question answering
  logger.info("No trigger word matched — defaulting to Visual QA");
  return {
    command: "visual-qa",
    params: { question: transcription },
    rawText: transcription,
  };
}
