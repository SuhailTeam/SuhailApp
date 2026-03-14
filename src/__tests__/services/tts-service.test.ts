import { describe, it, expect, beforeEach } from "bun:test";
import { localize, speak, getLastResponse, clearLastResponse } from "../../services/tts-service";
import { updateSettings } from "../../services/settings-store";
import type { BilingualMessage } from "../../types";

// Minimal mock session with a spy-able audio.speak
function createMockSession() {
  return {
    audio: {
      speak: async () => ({ success: true }),
    },
  } as any;
}

const testMessage: BilingualMessage = {
  ar: "مرحبا",
  en: "Hello",
};

describe("tts-service", () => {
  beforeEach(() => {
    // Reset language to default (ar) before each test
    updateSettings({ language: "ar" });
    // Clear any leftover session data
    clearLastResponse("session-1");
    clearLastResponse("session-2");
    clearLastResponse("session-A");
    clearLastResponse("session-B");
  });

  // ── localize ─────────────────────────────────────────────────────

  describe("localize", () => {
    it("returns Arabic text when language is 'ar' (default)", () => {
      const result = localize(testMessage);
      expect(result).toBe("مرحبا");
    });

    it("returns English text when language is updated to 'en'", () => {
      updateSettings({ language: "en" });
      const result = localize(testMessage);
      expect(result).toBe("Hello");
    });
  });

  // ── speak + getLastResponse ──────────────────────────────────────

  describe("speak + getLastResponse", () => {
    it("stores last response retrievable by sessionId after speak", async () => {
      const mockSession = createMockSession();
      await speak(mockSession, "hello", "session-1");
      expect(getLastResponse("session-1")).toBe("hello");
    });

    it("does not store last response when sessionId is omitted", async () => {
      const mockSession = createMockSession();
      await speak(mockSession, "hello");
      // No sessionId was provided, so nothing should be stored
      expect(getLastResponse("session-1")).toBeUndefined();
    });

    it("isolates responses between different sessions", async () => {
      const mockSession = createMockSession();
      await speak(mockSession, "first message", "session-1");
      await speak(mockSession, "second message", "session-2");

      expect(getLastResponse("session-1")).toBe("first message");
      expect(getLastResponse("session-2")).toBe("second message");
    });
  });

  // ── clearLastResponse ────────────────────────────────────────────

  describe("clearLastResponse", () => {
    it("removes the stored response for a session", async () => {
      const mockSession = createMockSession();
      await speak(mockSession, "to be cleared", "session-1");
      expect(getLastResponse("session-1")).toBe("to be cleared");

      clearLastResponse("session-1");
      expect(getLastResponse("session-1")).toBeUndefined();
    });
  });

  // ── Session isolation ────────────────────────────────────────────

  describe("session isolation", () => {
    it("session A speak does not affect session B getLastResponse", async () => {
      const mockSession = createMockSession();
      await speak(mockSession, "session A message", "session-A");

      expect(getLastResponse("session-B")).toBeUndefined();
    });
  });
});
