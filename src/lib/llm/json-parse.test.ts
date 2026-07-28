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

  it("ignores trailing text after a complete object", () => {
    const raw = `{
  "outcome": "LEAVE",
  "confidence": 0.95,
  "reasons": ["Bat held high away from the line"]
}
Additional commentary from the model.`;
    expect(parseJsonObject(raw)).toEqual({
      outcome: "LEAVE",
      confidence: 0.95,
      reasons: ["Bat held high away from the line"],
    });
  });

  it("takes only the first object when two are concatenated", () => {
    const raw = '{"outcome":"PLAYED","confidence":0.8}{"outcome":"LEAVE"}';
    expect(parseJsonObject(raw)).toEqual({
      outcome: "PLAYED",
      confidence: 0.8,
    });
  });

  it("handles braces inside string values", () => {
    const raw = '{"reasons":["bat {raised} away"],"outcome":"LEAVE"} trailing';
    expect(parseJsonObject(raw)).toEqual({
      reasons: ["bat {raised} away"],
      outcome: "LEAVE",
    });
  });

  it("repairs truncated objects missing a closing brace", () => {
    const raw = `{
  "outcome": "PLAYED",
  "confidence": 0.95,
  "reasons": [
    "Batter takes a forward stride",
    "Bat is brought down to intercept the ball"
  ]`;
    expect(parseJsonObject(raw)).toEqual({
      outcome: "PLAYED",
      confidence: 0.95,
      reasons: [
        "Batter takes a forward stride",
        "Bat is brought down to intercept the ball",
      ],
    });
  });

  it("repairs an extra closing bracket before the final brace", () => {
    const raw = `{
  "outcome": "PLAYED",
  "confidence": 0.95,
  "reasons": [
    "A clear bat swing is visible in the early frames",
    "The batter executes a stroke toward the ball"
  ]
]
}`;
    expect(parseJsonObject(raw)).toEqual({
      outcome: "PLAYED",
      confidence: 0.95,
      reasons: [
        "A clear bat swing is visible in the early frames",
        "The batter executes a stroke toward the ball",
      ],
    });
  });
});
