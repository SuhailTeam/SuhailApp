import { describe, it, expect, beforeEach } from "bun:test";
import { getSettings, updateSettings } from "../../services/settings-store";

// Reset state before each test. Module-level `let settings` persists across tests,
// so we restore defaults manually. With no DEFAULT_LANGUAGE env var, language defaults to "ar".
beforeEach(() => {
  updateSettings({
    speechSpeed: 1.0,
    volume: 0.8,
    voicePreset: "default",
    language: "ar",
  });
});

describe("getSettings", () => {
  it("returns default values initially", () => {
    const settings = getSettings();
    expect(settings).toEqual({
      speechSpeed: 1.0,
      volume: 0.8,
      voicePreset: "default",
      language: "ar",
    });
  });

  it("returns a defensive copy (mutating returned object does not affect store)", () => {
    const settings = getSettings();
    settings.speechSpeed = 999;
    settings.volume = 999;
    settings.voicePreset = "male";
    settings.language = "en";

    const fresh = getSettings();
    expect(fresh.speechSpeed).toBe(1.0);
    expect(fresh.volume).toBe(0.8);
    expect(fresh.voicePreset).toBe("default");
    expect(fresh.language).toBe("ar");
  });
});

describe("updateSettings", () => {
  describe("speechSpeed", () => {
    // Equivalence partitions
    it("accepts a valid value (1.0)", () => {
      const result = updateSettings({ speechSpeed: 1.0 });
      expect(result.speechSpeed).toBe(1.0);
    });

    it("clamps below-min value (0.3) to 0.5", () => {
      const result = updateSettings({ speechSpeed: 0.3 });
      expect(result.speechSpeed).toBe(0.5);
    });

    it("clamps above-max value (3.0) to 2.0", () => {
      const result = updateSettings({ speechSpeed: 3.0 });
      expect(result.speechSpeed).toBe(2.0);
    });

    // Boundary value analysis
    it("clamps 0.49 to 0.5", () => {
      const result = updateSettings({ speechSpeed: 0.49 });
      expect(result.speechSpeed).toBe(0.5);
    });

    it("accepts 0.5 as-is", () => {
      const result = updateSettings({ speechSpeed: 0.5 });
      expect(result.speechSpeed).toBe(0.5);
    });

    it("accepts 0.51 as-is", () => {
      const result = updateSettings({ speechSpeed: 0.51 });
      expect(result.speechSpeed).toBe(0.51);
    });

    it("accepts 1.99 as-is", () => {
      const result = updateSettings({ speechSpeed: 1.99 });
      expect(result.speechSpeed).toBe(1.99);
    });

    it("accepts 2.0 as-is", () => {
      const result = updateSettings({ speechSpeed: 2.0 });
      expect(result.speechSpeed).toBe(2.0);
    });

    it("clamps 2.01 to 2.0", () => {
      const result = updateSettings({ speechSpeed: 2.01 });
      expect(result.speechSpeed).toBe(2.0);
    });
  });

  describe("volume", () => {
    // Equivalence partitions
    it("accepts a valid value (0.5)", () => {
      const result = updateSettings({ volume: 0.5 });
      expect(result.volume).toBe(0.5);
    });

    it("clamps below-min value (-0.1) to 0.0", () => {
      const result = updateSettings({ volume: -0.1 });
      expect(result.volume).toBe(0.0);
    });

    it("clamps above-max value (1.5) to 1.0", () => {
      const result = updateSettings({ volume: 1.5 });
      expect(result.volume).toBe(1.0);
    });

    // Boundary value analysis
    it("clamps -0.01 to 0.0", () => {
      const result = updateSettings({ volume: -0.01 });
      expect(result.volume).toBe(0.0);
    });

    it("accepts 0.0 as-is", () => {
      const result = updateSettings({ volume: 0.0 });
      expect(result.volume).toBe(0.0);
    });

    it("accepts 0.01 as-is", () => {
      const result = updateSettings({ volume: 0.01 });
      expect(result.volume).toBe(0.01);
    });

    it("accepts 0.99 as-is", () => {
      const result = updateSettings({ volume: 0.99 });
      expect(result.volume).toBe(0.99);
    });

    it("accepts 1.0 as-is", () => {
      const result = updateSettings({ volume: 1.0 });
      expect(result.volume).toBe(1.0);
    });

    it("clamps 1.01 to 1.0", () => {
      const result = updateSettings({ volume: 1.01 });
      expect(result.volume).toBe(1.0);
    });
  });

  describe("voicePreset", () => {
    it('accepts "default"', () => {
      updateSettings({ voicePreset: "male" }); // change away from default first
      const result = updateSettings({ voicePreset: "default" });
      expect(result.voicePreset).toBe("default");
    });

    it('accepts "male"', () => {
      const result = updateSettings({ voicePreset: "male" });
      expect(result.voicePreset).toBe("male");
    });

    it('accepts "female"', () => {
      const result = updateSettings({ voicePreset: "female" });
      expect(result.voicePreset).toBe("female");
    });

    it('ignores invalid value "robot" and keeps previous value', () => {
      updateSettings({ voicePreset: "female" });
      const result = updateSettings({ voicePreset: "robot" as any });
      expect(result.voicePreset).toBe("female");
    });
  });

  describe("language", () => {
    it('accepts "ar"', () => {
      updateSettings({ language: "en" }); // change away first
      const result = updateSettings({ language: "ar" });
      expect(result.language).toBe("ar");
    });

    it('accepts "en"', () => {
      const result = updateSettings({ language: "en" });
      expect(result.language).toBe("en");
    });

    it('ignores invalid value "fr" and keeps previous value', () => {
      updateSettings({ language: "en" });
      const result = updateSettings({ language: "fr" as any });
      expect(result.language).toBe("en");
    });
  });

  describe("partial updates", () => {
    it("updating only speechSpeed leaves other fields unchanged", () => {
      const result = updateSettings({ speechSpeed: 1.5 });
      expect(result).toEqual({
        speechSpeed: 1.5,
        volume: 0.8,
        voicePreset: "default",
        language: "ar",
      });
    });

    it("empty object changes nothing", () => {
      const before = getSettings();
      const result = updateSettings({});
      expect(result).toEqual(before);
    });
  });
});
