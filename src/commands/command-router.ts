import { Logger } from "../utils/logger";
import type { CommandType, RouteResult } from "../types";

const logger = new Logger("CommandRouter");

/** Route definition for keyword-based matching */
interface Route {
  command: CommandType;
  /** Keywords to match — any match triggers this route */
  keywords: string[];
  /** If provided, ALL of these must match (AND logic) */
  requiredAll?: string[];
  /** Extract extra params from the transcription */
  extractParams?: (text: string) => Record<string, string>;
}

const routes: Route[] = [
  {
    command: "face-enroll",
    keywords: ["enroll", "save face", "remember this person", "سجل", "احفظ"],
  },
  {
    command: "face-recognize",
    keywords: ["who is this", "who is in front", "من هذا", "من قدامي"],
    requiredAll: ["who"],
  },
  {
    command: "scene-summarize",
    keywords: ["describe", "surroundings", "what's around", "وصف", "حولي", "ايش حولي"],
  },
  {
    command: "ocr-read-text",
    keywords: ["read", "text", "اقرأ", "نص"],
  },
  {
    command: "find-object",
    keywords: ["find", "where is", "وين", "ابحث"],
    extractParams: (text: string) => {
      // Try to extract the object name from phrases like "find my keys", "where is the remote"
      const findMatch = text.match(/find\s+(?:my\s+|the\s+)?(.+)/i);
      const whereMatch = text.match(/where\s+is\s+(?:my\s+|the\s+)?(.+)/i);
      const objectName = (findMatch?.[1] || whereMatch?.[1] || "object").trim().replace(/[.,?!]+$/, "");
      return { objectName };
    },
  },
  {
    command: "currency-recognize",
    keywords: ["money", "currency", "bill", "فلوس", "عملة"],
  },
  {
    command: "color-detect",
    keywords: ["color", "colour", "لون"],
  },
];

/**
 * Parses a transcription string and determines which command to execute.
 * Falls back to Visual QA if no specific command matches.
 */
export function routeCommand(transcription: string): RouteResult {
  const text = transcription.toLowerCase().trim();
  logger.info(`Routing transcription: "${text}"`);

  for (const route of routes) {
    // Check requiredAll first (AND logic)
    if (route.requiredAll) {
      const allMatch = route.requiredAll.every((kw) => text.includes(kw));
      if (allMatch) {
        const params = route.extractParams?.(text);
        logger.info(`Matched command: ${route.command} (requiredAll)`);
        return { command: route.command, params, rawText: transcription };
      }
    }

    // Check keywords (OR logic)
    const matched = route.keywords.some((kw) => text.includes(kw));
    if (matched) {
      const params = route.extractParams?.(text);
      logger.info(`Matched command: ${route.command}`);
      return { command: route.command, params, rawText: transcription };
    }
  }

  // Default: treat as visual question answering
  logger.info("No specific command matched — defaulting to Visual QA");
  return {
    command: "visual-qa",
    params: { question: transcription },
    rawText: transcription,
  };
}
