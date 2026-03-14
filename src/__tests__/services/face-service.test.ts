import { describe, it, expect } from "bun:test";

/**
 * These tests verify the pure logic patterns used internally by face-service.ts.
 * Since encodeName, decodeName, and getSimilarityThreshold are private (not exported),
 * we replicate their algorithms here and validate correctness independently.
 */

// Replicate private encodeName from face-service.ts
function encodeName(name: string): string {
  return Buffer.from(name, "utf8").toString("hex");
}

// Replicate private decodeName from face-service.ts
function decodeName(encoded: string): string {
  return Buffer.from(encoded, "hex").toString("utf8");
}

// Replicate private getSimilarityThreshold from face-service.ts
// Accepts configThreshold as a parameter (in the real code it reads from config.confidenceThreshold)
function getSimilarityThreshold(configThreshold: number): number {
  const threshold = Number.isFinite(configThreshold) ? configThreshold : 0.5;
  return threshold <= 1 ? threshold * 100 : threshold;
}

describe("Face Service — Pure Logic", () => {
  describe("name encoding/decoding", () => {
    it("should encode and decode an ASCII name", () => {
      const name = "John";
      const encoded = encodeName(name);
      expect(encoded).not.toBe(name); // hex differs from original
      expect(decodeName(encoded)).toBe(name);
    });

    it("should encode and decode an Arabic name", () => {
      const name = "عبدالله";
      const encoded = encodeName(name);
      expect(decodeName(encoded)).toBe(name);
    });

    it("should encode and decode a mixed Arabic/English name", () => {
      const name = "Abdullah عبدالله";
      const encoded = encodeName(name);
      expect(decodeName(encoded)).toBe(name);
    });

    it("should handle an empty string", () => {
      const encoded = encodeName("");
      expect(encoded).toBe("");
      expect(decodeName(encoded)).toBe("");
    });

    it("should handle a name with spaces", () => {
      const name = "John Doe";
      const encoded = encodeName(name);
      expect(decodeName(encoded)).toBe(name);
    });

    it("should handle special characters", () => {
      const name = "O'Brien-Smith @#$%";
      const encoded = encodeName(name);
      expect(decodeName(encoded)).toBe(name);
    });
  });

  describe("similarity threshold conversion", () => {
    // Equivalence partitions

    it("should convert 0.5 (0-1 scale) to 50 (0-100 scale)", () => {
      expect(getSimilarityThreshold(0.5)).toBe(50);
    });

    it("should convert 0.8 (0-1 scale) to 80 (0-100 scale)", () => {
      expect(getSimilarityThreshold(0.8)).toBeCloseTo(80);
    });

    it("should keep 70 as-is since it is already > 1 (treated as percent)", () => {
      expect(getSimilarityThreshold(70)).toBe(70);
    });

    it("should default NaN to 0.5 and return 50", () => {
      expect(getSimilarityThreshold(NaN)).toBe(50);
    });

    it("should default Infinity to 0.5 and return 50", () => {
      expect(getSimilarityThreshold(Infinity)).toBe(50);
    });

    // Boundary value analysis

    it("should convert 0.0 to 0", () => {
      expect(getSimilarityThreshold(0.0)).toBe(0);
    });

    it("should convert 1.0 to 100 (boundary: <= 1 triggers multiply)", () => {
      expect(getSimilarityThreshold(1.0)).toBe(100);
    });

    it("should keep 1.01 as-is since it is > 1 (treated as percent)", () => {
      expect(getSimilarityThreshold(1.01)).toBe(1.01);
    });

    it("should convert 0.99 to 99", () => {
      expect(getSimilarityThreshold(0.99)).toBeCloseTo(99);
    });
  });
});
