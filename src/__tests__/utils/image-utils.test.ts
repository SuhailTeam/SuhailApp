import { describe, it, expect } from "bun:test";
import { stripBase64Prefix, getMimeType } from "../../utils/image-utils";

describe("stripBase64Prefix", () => {
  // --- Equivalence Partitioning ---

  it("strips JPEG data URI prefix", () => {
    const input = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
    expect(stripBase64Prefix(input)).toBe("/9j/4AAQSkZJRg==");
  });

  it("strips PNG data URI prefix", () => {
    const input = "data:image/png;base64,iVBORw0KGgo=";
    expect(stripBase64Prefix(input)).toBe("iVBORw0KGgo=");
  });

  it("returns raw base64 as-is when no prefix present", () => {
    const input = "/9j/4AAQSkZJRgABAQAAAQABAAD";
    expect(stripBase64Prefix(input)).toBe("/9j/4AAQSkZJRgABAQAAAQABAAD");
  });

  it("returns empty string as-is", () => {
    expect(stripBase64Prefix("")).toBe("");
  });

  // --- Boundary Value Analysis ---

  it("strips when comma is at position 49 (< 50)", () => {
    // 49 characters before the comma
    const prefix = "a".repeat(49);
    const input = `${prefix},CONTENT`;
    expect(stripBase64Prefix(input)).toBe("CONTENT");
  });

  it("returns as-is when comma is at position 50 (not < 50)", () => {
    // 50 characters before the comma
    const prefix = "a".repeat(50);
    const input = `${prefix},CONTENT`;
    expect(stripBase64Prefix(input)).toBe(input);
  });

  it("strips if comma is before position 50 even without data URI scheme", () => {
    const input = "not-a-real-scheme,somebase64data";
    expect(stripBase64Prefix(input)).toBe("somebase64data");
  });
});

describe("getMimeType", () => {
  // --- Equivalence Partitioning ---

  it("returns image/jpeg for JPEG data URI", () => {
    expect(getMimeType("data:image/jpeg;base64,/9j/4A==")).toBe("image/jpeg");
  });

  it("returns image/png for PNG data URI", () => {
    expect(getMimeType("data:image/png;base64,iVBOR")).toBe("image/png");
  });

  it("returns default image/jpeg when no prefix present", () => {
    expect(getMimeType("/9j/4AAQSkZJRg==")).toBe("image/jpeg");
  });

  it("returns default image/jpeg for invalid format", () => {
    expect(getMimeType("data:text/plain;base64,abc")).toBe("image/jpeg");
  });
});
