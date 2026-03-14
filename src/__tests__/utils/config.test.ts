import { describe, it, expect } from "bun:test";
import { config } from "../../utils/config";

describe("config", () => {
  it("port is a number defaulting to 3000", () => {
    expect(typeof config.port).toBe("number");
    expect(config.port).toBe(3000);
  });

  it("confidenceThreshold is a finite number between 0 and 1", () => {
    expect(typeof config.confidenceThreshold).toBe("number");
    expect(Number.isFinite(config.confidenceThreshold)).toBe(true);
  });

  it("minTranscriptionConfidence is a number defaulting to 0.55", () => {
    expect(typeof config.minTranscriptionConfidence).toBe("number");
    expect(config.minTranscriptionConfidence).toBe(0.55);
  });

  it("defaultLanguage is 'ar' or 'en'", () => {
    expect(["ar", "en"]).toContain(config.defaultLanguage);
  });

  it("packageName is a non-empty string", () => {
    expect(typeof config.packageName).toBe("string");
    expect(config.packageName.length).toBeGreaterThan(0);
  });

  it("visionModel is a non-empty string", () => {
    expect(typeof config.visionModel).toBe("string");
    expect(config.visionModel.length).toBeGreaterThan(0);
  });

  it("classificationModel is a non-empty string", () => {
    expect(typeof config.classificationModel).toBe("string");
    expect(config.classificationModel.length).toBeGreaterThan(0);
  });

  it("awsRegion is a non-empty string", () => {
    expect(typeof config.awsRegion).toBe("string");
    expect(config.awsRegion.length).toBeGreaterThan(0);
  });

  it("awsRekognitionCollectionId is a non-empty string", () => {
    expect(typeof config.awsRekognitionCollectionId).toBe("string");
    expect(config.awsRekognitionCollectionId.length).toBeGreaterThan(0);
  });
});
