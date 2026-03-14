import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { normalizeTranscription } from "../../utils/transcription-normalizer";

// Store the original fetch so we can restore it
const originalFetch = globalThis.fetch;

// Helper to create a successful OpenRouter response
function mockFetchSuccess(normalizedText: string) {
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        choices: [{ message: { content: normalizedText } }],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    )) as unknown as typeof fetch;
}

// Helper to create an HTTP error response
function mockFetchHttpError(status: number) {
  globalThis.fetch = (async () =>
    new Response("error", { status })) as unknown as typeof fetch;
}

// Helper to create a network error
function mockFetchNetworkError() {
  globalThis.fetch = (async () => {
    throw new TypeError("fetch failed");
  }) as unknown as typeof fetch;
}

// Helper to create a response with empty content
function mockFetchEmpty() {
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        choices: [{ message: { content: "" } }],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    )) as unknown as typeof fetch;
}

describe("normalizeTranscription", () => {
  // Save and set the API key so the normalizer doesn't bail out early
  const originalEnv = process.env.OPENROUTER_API_KEY;

  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = "test-key";
    // Restore fetch to original before each test
    globalThis.fetch = originalFetch;
  });

  afterEach(() => {
    // Restore original values
    globalThis.fetch = originalFetch;
    if (originalEnv !== undefined) {
      process.env.OPENROUTER_API_KEY = originalEnv;
    } else {
      delete process.env.OPENROUTER_API_KEY;
    }
  });

  // ── EP: No normalization needed ──────────────────────────────────

  describe("no normalization needed", () => {
    it("returns Latin text unchanged when lang='en' (no API call)", async () => {
      let fetchCalled = false;
      globalThis.fetch = (async () => {
        fetchCalled = true;
        return new Response("", { status: 500 });
      }) as unknown as typeof fetch;

      const result = await normalizeTranscription("describe my surroundings", "en");
      expect(result).toBe("describe my surroundings");
      expect(fetchCalled).toBe(false);
    });

    it("returns any text unchanged when lang='ar' (no API call)", async () => {
      let fetchCalled = false;
      globalThis.fetch = (async () => {
        fetchCalled = true;
        return new Response("", { status: 500 });
      }) as unknown as typeof fetch;

      const result = await normalizeTranscription("واتس ان فرونت أوف مي", "ar");
      expect(result).toBe("واتس ان فرونت أوف مي");
      expect(fetchCalled).toBe(false);
    });

    it("returns short Arabic text (<=3 chars) unchanged when lang='en'", async () => {
      let fetchCalled = false;
      globalThis.fetch = (async () => {
        fetchCalled = true;
        return new Response("", { status: 500 });
      }) as unknown as typeof fetch;

      const result = await normalizeTranscription("من", "en");
      expect(result).toBe("من");
      expect(fetchCalled).toBe(false);
    });
  });

  // ── EP: Normalization triggered (mock fetch) ────────────────────

  describe("normalization triggered", () => {
    it("calls API and returns normalized text for Arabic-only text with lang='en'", async () => {
      mockFetchSuccess("what's in front of me");

      const result = await normalizeTranscription("واتس ان فرونت أوف مي", "en");
      expect(result).toBe("what's in front of me");
    });

    it("returns original text when API returns empty content", async () => {
      mockFetchEmpty();

      const original = "واتس ان فرونت أوف مي";
      const result = await normalizeTranscription(original, "en");
      expect(result).toBe(original);
    });

    it("returns original text when API returns HTTP error", async () => {
      mockFetchHttpError(500);

      const original = "واتس ان فرونت أوف مي";
      const result = await normalizeTranscription(original, "en");
      expect(result).toBe(original);
    });

    it("returns original text when fetch throws a network error", async () => {
      mockFetchNetworkError();

      const original = "واتس ان فرونت أوف مي";
      const result = await normalizeTranscription(original, "en");
      expect(result).toBe(original);
    });
  });

  // ── BVA: Length boundary ─────────────────────────────────────────

  describe("length boundary values", () => {
    it("does NOT normalize 3-char Arabic text with lang='en' (<=3)", async () => {
      let fetchCalled = false;
      globalThis.fetch = (async () => {
        fetchCalled = true;
        return new Response("", { status: 500 });
      }) as unknown as typeof fetch;

      // 3 Arabic characters
      const result = await normalizeTranscription("واتس".slice(0, 3), "en");
      expect(fetchCalled).toBe(false);
      expect(result).toBe("واتس".slice(0, 3));
    });

    it("normalizes 4-char Arabic text with lang='en' (>3)", async () => {
      mockFetchSuccess("wats");

      // 4 Arabic characters
      const input = "واتس";
      expect(input.length).toBe(4);

      const result = await normalizeTranscription(input, "en");
      expect(result).toBe("wats");
    });
  });
});
