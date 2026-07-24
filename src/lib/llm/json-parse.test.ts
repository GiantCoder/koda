import { describe, expect, it } from "vitest";
import { extractJsonObject, parseJsonObject } from "./json-parse";

describe("extractJsonObject", () => {
  it("parses fenced JSON", () => {
    const raw = 'Here you go:\n```json\n{"activityType":"BATTING","hasBatterWithBat":true}\n```';
    expect(parseJsonObject(raw)).toEqual({
      activityType: "BATTING",
      hasBatterWithBat: true,
    });
  });

  it("extracts embedded object", () => {
    const raw = 'Sure {"confidence":0.9} thanks';
    expect(extractJsonObject(raw)).toBe('{"confidence":0.9}');
  });
});
