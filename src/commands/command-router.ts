import { Logger } from "../utils/logger";
import type { CommandType, RouteResult } from "../types";

const logger = new Logger("CommandRouter");

/** Wake words that must appear at the start of a transcription to activate a command */
const WAKE_WORDS = ["hey assistant"];

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

/**
 * Checks if the transcription starts with a wake word.
 * Returns the text after the wake word (trimmed), or null if no wake word found.
 */
function stripWakeWord(text: string): string | null {
  const lower = text.toLowerCase().trim();
  for (const wake of WAKE_WORDS) {
    if (lower.startsWith(wake)) {
      return lower.slice(wake.length).trim();
    }
  }
  return null;
}

/** Checks if a keyword matches in text, using word boundaries for short English words */
function keywordMatches(text: string, keyword: string): boolean {
  // Multi-word phrases and Arabic keywords: use simple includes
  if (keyword.includes(" ") || /[\u0600-\u06FF]/.test(keyword)) {
    return text.includes(keyword);
  }
  // Short single English words: use word boundaries to avoid false positives
  const regex = new RegExp(`\\b${keyword}\\b`, "i");
  return regex.test(text);
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
      // Try English patterns
      const findMatch = text.match(/\bfind\s+(?:my\s+|the\s+)?(.+)/i);
      const whereMatch = text.match(/\bwhere\s+is\s+(?:my\s+|the\s+)?(.+)/i);
      // Try Arabic patterns
      const weinMatch = text.match(/وين\s+(.+)/);
      const abhathMatch = text.match(/ابحث\s+(?:عن\s+)?(.+)/);
      const objectName = (
        findMatch?.[1] || whereMatch?.[1] || weinMatch?.[1] || abhathMatch?.[1] || "object"
      ).trim().replace(/[.,?!؟]+$/, "");
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
 * Requires a wake word ("suhail" / "سهيل") at the start.
 * Returns null if no wake word is found (transcription is ignored).
 * Falls back to Visual QA if wake word is present but no specific command matches.
 */
export function routeCommand(transcription: string): RouteResult | null {
  const raw = transcription.toLowerCase().trim();
  logger.info(`Routing transcription: "${raw}"`);

  // Require wake word — ignore transcriptions without it
  const text = stripWakeWord(raw);
  if (text === null) {
    logger.info("No wake word detected — ignoring transcription");
    return null;
  }

  if (text.length === 0) {
    logger.info("Wake word only, no command — ignoring");
    return null;
  }

  for (const route of routes) {
    // Check requiredAll first (AND logic)
    if (route.requiredAll) {
      const allMatch = route.requiredAll.every((kw) => keywordMatches(text, kw));
      if (allMatch) {
        const params = route.extractParams?.(text);
        logger.info(`Matched command: ${route.command} (requiredAll)`);
        return { command: route.command, params, rawText: transcription };
      }
    }

    // Check keywords (OR logic)
    const matched = route.keywords.some((kw) => keywordMatches(text, kw));
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
