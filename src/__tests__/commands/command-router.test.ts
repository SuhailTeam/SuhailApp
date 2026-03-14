import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { routeCommand } from "../../commands/command-router";

// ─── Fetch mock helpers ──────────────────────────────────────────────────

const originalFetch = globalThis.fetch;

/** Replace globalThis.fetch with a function that rejects (forces keyword fallback) */
function mockFetchToFail() {
  globalThis.fetch = (() =>
    Promise.reject(new Error("no network"))) as unknown as typeof fetch;
}

/** Replace globalThis.fetch with a function that returns a valid LLM classification response */
function mockFetchToReturn(intent: string, param?: string) {
  const content = param
    ? JSON.stringify({ intent, param })
    : JSON.stringify({ intent });

  globalThis.fetch = (() =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          choices: [{ message: { content } }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    )) as unknown as typeof fetch;
}

/** Replace globalThis.fetch with a function that returns a non-ok response */
function mockFetchToReturnError(status: number) {
  globalThis.fetch = (() =>
    Promise.resolve(new Response("Internal Server Error", { status }))) as unknown as typeof fetch;
}

/** Replace globalThis.fetch with a function that returns invalid JSON in the LLM content */
function mockFetchToReturnInvalidJson() {
  globalThis.fetch = (() =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: "this is not json at all" } }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    )) as unknown as typeof fetch;
}

// ─── Tests ───────────────────────────────────────────────────────────────

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("routeCommand", () => {
  // ── 1. Empty / whitespace input ──────────────────────────────────────

  describe("empty/whitespace input", () => {
    it("returns null for empty string", async () => {
      const result = await routeCommand("");
      expect(result).toBeNull();
    });

    it("returns null for whitespace-only string", async () => {
      const result = await routeCommand("   ");
      expect(result).toBeNull();
    });
  });

  // ── 2. Keyword routing (LLM unavailable) ────────────────────────────

  describe("keyword routing (LLM unavailable)", () => {
    beforeEach(() => {
      mockFetchToFail();
    });

    describe("English keywords", () => {
      it('"describe my surroundings" -> scene-summarize', async () => {
        const result = await routeCommand("describe my surroundings");
        expect(result).not.toBeNull();
        expect(result!.command).toBe("scene-summarize");
      });

      it('"read this text" -> ocr-read-text', async () => {
        const result = await routeCommand("read this text");
        expect(result).not.toBeNull();
        expect(result!.command).toBe("ocr-read-text");
      });

      it('"who is this" -> face-recognize', async () => {
        const result = await routeCommand("who is this");
        expect(result).not.toBeNull();
        expect(result!.command).toBe("face-recognize");
      });

      it('"enroll this person" -> face-enroll', async () => {
        const result = await routeCommand("enroll this person");
        expect(result).not.toBeNull();
        expect(result!.command).toBe("face-enroll");
      });

      it('"find my keys" -> find-object with objectName param', async () => {
        const result = await routeCommand("find my keys");
        expect(result).not.toBeNull();
        expect(result!.command).toBe("find-object");
        expect(result!.params?.objectName).toBe("my keys");
      });

      it('"money" -> currency-recognize', async () => {
        const result = await routeCommand("money");
        expect(result).not.toBeNull();
        expect(result!.command).toBe("currency-recognize");
      });

      it('"color of this" -> color-detect', async () => {
        const result = await routeCommand("color of this");
        expect(result).not.toBeNull();
        expect(result!.command).toBe("color-detect");
      });

      it('"what is on the table" -> visual-qa with question param', async () => {
        const result = await routeCommand("what is on the table");
        expect(result).not.toBeNull();
        expect(result!.command).toBe("visual-qa");
        expect(result!.params?.question).toContain("what is on the table");
      });
    });

    describe("Arabic keywords", () => {
      it('"وصف المحيط" -> scene-summarize', async () => {
        const result = await routeCommand("وصف المحيط");
        expect(result).not.toBeNull();
        expect(result!.command).toBe("scene-summarize");
      });

      it('"اقرأ النص" -> ocr-read-text', async () => {
        const result = await routeCommand("اقرأ النص");
        expect(result).not.toBeNull();
        expect(result!.command).toBe("ocr-read-text");
      });

      it('"من هذا" -> face-recognize', async () => {
        const result = await routeCommand("من هذا");
        expect(result).not.toBeNull();
        expect(result!.command).toBe("face-recognize");
      });

      it('"سجل هذا الشخص" -> face-enroll', async () => {
        const result = await routeCommand("سجل هذا الشخص");
        expect(result).not.toBeNull();
        expect(result!.command).toBe("face-enroll");
      });

      it('"وين المفاتيح" -> find-object', async () => {
        const result = await routeCommand("وين المفاتيح");
        expect(result).not.toBeNull();
        expect(result!.command).toBe("find-object");
      });

      it('"فلوس" -> currency-recognize', async () => {
        const result = await routeCommand("فلوس");
        expect(result).not.toBeNull();
        expect(result!.command).toBe("currency-recognize");
      });

      it('"لون" -> color-detect', async () => {
        const result = await routeCommand("لون");
        expect(result).not.toBeNull();
        expect(result!.command).toBe("color-detect");
      });
    });

    describe("default fallback", () => {
      it('"hello world" -> visual-qa', async () => {
        const result = await routeCommand("hello world");
        expect(result).not.toBeNull();
        expect(result!.command).toBe("visual-qa");
      });
    });
  });

  // ── 3. LLM classification (mock fetch to return valid responses) ─────

  describe("LLM classification", () => {
    it("routes to scene-summarize when LLM returns scene_summarize", async () => {
      mockFetchToReturn("scene_summarize");
      const result = await routeCommand("what's around me");
      expect(result).not.toBeNull();
      expect(result!.command).toBe("scene-summarize");
    });

    it("routes to find-object with objectName param when LLM returns find_object", async () => {
      mockFetchToReturn("find_object", "keys");
      const result = await routeCommand("where are my keys");
      expect(result).not.toBeNull();
      expect(result!.command).toBe("find-object");
      expect(result!.params?.objectName).toBe("keys");
    });

    it("routes to visual-qa with question param when LLM returns visual_qa", async () => {
      mockFetchToReturn("visual_qa", "what is on the table");
      const result = await routeCommand("what is on the table");
      expect(result).not.toBeNull();
      expect(result!.command).toBe("visual-qa");
      expect(result!.params?.question).toBe("what is on the table");
    });

    it('returns command "unknown" when LLM returns unknown intent', async () => {
      mockFetchToReturn("unknown");
      const result = await routeCommand("tell me a joke");
      expect(result).not.toBeNull();
      expect(result!.command).toBe("unknown" as any);
      expect(result!.rawText).toBe("tell me a joke");
    });
  });

  // ── 4. LLM fallback scenarios (fetch fails in various ways) ──────────

  describe("LLM fallback scenarios", () => {
    it("falls back to keyword when fetch throws", async () => {
      mockFetchToFail();
      const result = await routeCommand("describe the room");
      expect(result).not.toBeNull();
      expect(result!.command).toBe("scene-summarize");
    });

    it("falls back to keyword when response is not ok (500)", async () => {
      mockFetchToReturnError(500);
      const result = await routeCommand("read the sign");
      expect(result).not.toBeNull();
      expect(result!.command).toBe("ocr-read-text");
    });

    it("falls back to keyword when LLM returns invalid JSON", async () => {
      mockFetchToReturnInvalidJson();
      const result = await routeCommand("who is standing there");
      expect(result).not.toBeNull();
      expect(result!.command).toBe("face-recognize");
    });
  });

  // ── 5. Parameter extraction for find-object keyword ──────────────────

  describe("find-object parameter extraction (keyword mode)", () => {
    beforeEach(() => {
      mockFetchToFail();
    });

    it('"find keys" -> params.objectName is "keys"', async () => {
      const result = await routeCommand("find keys");
      expect(result).not.toBeNull();
      expect(result!.command).toBe("find-object");
      expect(result!.params?.objectName).toBe("keys");
    });

    it('"find" alone -> params.objectName defaults to "object"', async () => {
      const result = await routeCommand("find");
      expect(result).not.toBeNull();
      expect(result!.command).toBe("find-object");
      expect(result!.params?.objectName).toBe("object");
    });
  });
});
