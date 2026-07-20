import { describe, expect, it } from "vitest";
import {
  INTEREST_SUGGESTIONS,
  SKILL_SUGGESTIONS,
  normalizeTag,
  suggestTags,
} from "./tagSuggestions";

describe("normalizeTag", () => {
  it("maps a known synonym alias to its canonical form", () => {
    expect(normalizeTag("js")).toBe("JavaScript");
  });

  it("trims, collapses whitespace, and canonicalizes casing against the pools", () => {
    expect(normalizeTag("  typescript ")).toBe("TypeScript");
  });

  it("returns the cleaned raw string when nothing matches", () => {
    expect(normalizeTag("Underwater Basket Weaving")).toBe("Underwater Basket Weaving");
  });
});

describe("suggestTags", () => {
  it("returns nothing for an empty query", () => {
    expect(suggestTags("", SKILL_SUGGESTIONS, [])).toEqual([]);
  });

  it("excludes already-selected tags but includes fresh matches", () => {
    const result = suggestTags("java", SKILL_SUGGESTIONS, ["JavaScript"]);
    expect(result).not.toContain("JavaScript");
    expect(result).toContain("Java");
  });

  it("caps results at six", () => {
    expect(suggestTags("a", SKILL_SUGGESTIONS, []).length).toBeLessThanOrEqual(6);
  });

  it("expands synonym keys that start with the query to their canonical target", () => {
    expect(suggestTags("k8", SKILL_SUGGESTIONS, [])).toContain("Kubernetes");
  });

  it("matches interest pool entries case-insensitively via includes", () => {
    expect(suggestTags("tech", INTEREST_SUGGESTIONS, [])).toContain("Climate Tech");
  });
});
