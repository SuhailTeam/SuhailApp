import { describe, it, expect } from "bun:test";
import {
  isValidTranscription,
  needsScriptNormalization,
} from "../../utils/transcription-filter";

describe("isValidTranscription", () => {
  describe("equivalence partitioning", () => {
    it("returns true for valid English text", () => {
      expect(isValidTranscription("describe the scene", "en")).toBe(true);
    });

    it("returns true for valid Arabic text", () => {
      expect(isValidTranscription("وصف المشهد", "ar")).toBe(true);
    });

    it("returns false for too short text (1 char)", () => {
      expect(isValidTranscription("a", "en")).toBe(false);
    });

    it("returns false for empty string", () => {
      expect(isValidTranscription("", "en")).toBe(false);
    });

    it("returns false for garbled special chars (>40%)", () => {
      // 7 chars total, 5 special = 71%
      expect(isValidTranscription("a!@#$%^", "en")).toBe(false);
    });

    it("returns false for repeated words (4+ total occurrences)", () => {
      // "the" appears 4 times: first word + 3 repeats matches {3,}
      expect(isValidTranscription("the the the the end", "en")).toBe(false);
    });

    it("returns false for Arabic lang with no Arabic chars when text > 3 chars", () => {
      expect(isValidTranscription("hello world", "ar")).toBe(false);
    });

    it("returns true for English lang with Arabic text (allowed for normalizer)", () => {
      expect(isValidTranscription("وصف المشهد", "en")).toBe(true);
    });
  });

  describe("boundary value analysis", () => {
    describe("length boundaries", () => {
      it("returns false for length 0 (empty)", () => {
        expect(isValidTranscription("", "en")).toBe(false);
      });

      it("returns false for length 1", () => {
        expect(isValidTranscription("a", "en")).toBe(false);
      });

      it("returns true for length 2", () => {
        expect(isValidTranscription("ab", "en")).toBe(true);
      });

      it("trims whitespace before checking length", () => {
        expect(isValidTranscription("  a  ", "en")).toBe(false);
        expect(isValidTranscription("  ab  ", "en")).toBe(true);
      });

      it("returns false for whitespace-only input", () => {
        expect(isValidTranscription("   ", "en")).toBe(false);
        expect(isValidTranscription("\t\n", "en")).toBe(false);
      });
    });

    describe("special chars ratio boundary (40%)", () => {
      it("returns true when special chars ratio is below 40%", () => {
        // "abcde!" = 6 chars, 1 special = 16.7%
        expect(isValidTranscription("abcde!", "en")).toBe(true);
      });

      it("returns true when special chars ratio is exactly 40%", () => {
        // "abc!!" = 5 chars, 2 special = 0.4 = 40% exactly
        // The condition is strictly > 0.4, so 40% passes
        expect(isValidTranscription("abc!!", "en")).toBe(true);
      });

      it("returns false when special chars ratio is just above 40%", () => {
        // "ab!!!" = 5 chars, 3 special = 0.6 = 60%
        expect(isValidTranscription("ab!!!", "en")).toBe(false);
      });
    });

    describe("repeated words boundary", () => {
      it("returns true for 3 total repetitions (word + 2 repeats)", () => {
        // "go go go stop" — the backreference group repeats 2 times, below {3,}
        expect(isValidTranscription("go go go stop", "en")).toBe(true);
      });

      it("returns false for 4 total repetitions (word + 3 repeats)", () => {
        // "go go go go stop" — the backreference group repeats 3 times, matches {3,}
        expect(isValidTranscription("go go go go stop", "en")).toBe(false);
      });

      it("returns false for 5+ total repetitions", () => {
        expect(isValidTranscription("go go go go go stop", "en")).toBe(false);
      });

      it("is case-insensitive for repeated words", () => {
        expect(isValidTranscription("Go go Go go end", "en")).toBe(false);
      });
    });

    describe("script check length threshold", () => {
      it("does not apply script check for Arabic lang when trimmed length is 3", () => {
        // "abc" is 3 chars, no Arabic, but length <= 3 so check is skipped
        expect(isValidTranscription("abc", "ar")).toBe(true);
      });

      it("applies script check for Arabic lang when trimmed length is 4", () => {
        // "abcd" is 4 chars, no Arabic, lang=ar -> fails
        expect(isValidTranscription("abcd", "ar")).toBe(false);
      });

      it("passes script check for Arabic lang with Arabic chars at length 4", () => {
        // Arabic text with 4+ chars
        expect(isValidTranscription("مرحب", "ar")).toBe(true);
      });

      it("does not apply script check for English lang regardless of length", () => {
        // Pure Arabic text with lang=en should pass (allowed for normalizer)
        expect(isValidTranscription("مرحبا بك", "en")).toBe(true);
      });
    });

    describe("edge cases", () => {
      it("handles leading and trailing whitespace correctly", () => {
        expect(isValidTranscription("  hello world  ", "en")).toBe(true);
      });

      it("returns true for valid 2-char Arabic command", () => {
        expect(isValidTranscription("من", "ar")).toBe(true);
      });

      it("returns false for single Arabic char", () => {
        expect(isValidTranscription("م", "ar")).toBe(false);
      });
    });
  });
});

describe("needsScriptNormalization", () => {
  describe("equivalence partitioning", () => {
    it("returns false when lang is 'ar'", () => {
      expect(needsScriptNormalization("مرحبا بالعالم", "ar")).toBe(false);
    });

    it("returns false for English lang with Latin text", () => {
      expect(needsScriptNormalization("hello world", "en")).toBe(false);
    });

    it("returns true for English lang with Arabic-only text (>3 chars)", () => {
      expect(needsScriptNormalization("ديسكرايب", "en")).toBe(true);
    });

    it("returns false for English lang with mixed Arabic and Latin text", () => {
      expect(needsScriptNormalization("hello مرحبا", "en")).toBe(false);
    });

    it("returns false for English lang with short Arabic text (<=3 chars)", () => {
      expect(needsScriptNormalization("من", "en")).toBe(false);
    });
  });

  describe("boundary value analysis", () => {
    describe("length threshold (3 chars)", () => {
      it("returns false for Arabic text with trimmed length 1", () => {
        expect(needsScriptNormalization("م", "en")).toBe(false);
      });

      it("returns false for Arabic text with trimmed length 2", () => {
        expect(needsScriptNormalization("من", "en")).toBe(false);
      });

      it("returns false for Arabic text with trimmed length exactly 3", () => {
        expect(needsScriptNormalization("منه", "en")).toBe(false);
      });

      it("returns true for Arabic text with trimmed length 4", () => {
        expect(needsScriptNormalization("وصفي", "en")).toBe(true);
      });

      it("trims whitespace before checking length", () => {
        // "من" is 2 chars, with whitespace it's still 2 after trim
        expect(needsScriptNormalization("  من  ", "en")).toBe(false);
        // "وصفي" is 4 chars after trim
        expect(needsScriptNormalization("  وصفي  ", "en")).toBe(true);
      });
    });

    describe("language check", () => {
      it("returns false for Arabic lang even with long Arabic-only text", () => {
        expect(needsScriptNormalization("ديسكرايب ذا سين", "ar")).toBe(false);
      });
    });

    describe("script detection", () => {
      it("returns false when text has at least one Latin character", () => {
        expect(needsScriptNormalization("مرحبا a", "en")).toBe(false);
      });

      it("returns true when text has Arabic chars and no Latin chars", () => {
        expect(needsScriptNormalization("مرحبا بالعالم", "en")).toBe(true);
      });

      it("returns false for text with only digits and spaces (no Arabic)", () => {
        expect(needsScriptNormalization("1234 5678", "en")).toBe(false);
      });

      it("returns true for Arabic text with digits but no Latin", () => {
        expect(needsScriptNormalization("مرحبا 123", "en")).toBe(true);
      });

      it("returns false for empty string", () => {
        expect(needsScriptNormalization("", "en")).toBe(false);
      });
    });
  });
});
