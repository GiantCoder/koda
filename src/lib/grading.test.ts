import { describe, expect, it } from "vitest";
import { calculateBowlingGrade, calculateGrade } from "./grading";

describe("calculateBowlingGrade", () => {
  it("averages scores and applies delivery weights", () => {
    const scores = [80, 80, 80, 80, 80, 80, 80, 80];
    const yorker = calculateBowlingGrade("YORKER", scores);
    const unknown = calculateBowlingGrade("UNKNOWN", scores);
    expect(yorker.score).toBeGreaterThan(unknown.score);
    expect(yorker.letter).toBe("A");
    expect(unknown.score).toBe(80);
    expect(unknown.letter).toBe("B+");
  });

  it("uses the same letter bands as batting grades", () => {
    expect(calculateBowlingGrade("GOOD_LENGTH", [90, 90, 90, 90, 90, 90, 90, 90]).letter).toBe("A");
    expect(calculateBowlingGrade("UNKNOWN", [70, 70, 70, 70, 70, 70, 70, 70]).letter).toBe("B");
    expect(calculateBowlingGrade("UNKNOWN", [50, 50, 50, 50, 50, 50, 50, 50]).letter).toBe("C");
  });

  it("does not alter batting calculateGrade", () => {
    const batting = calculateGrade("COVER_DRIVE", [80, 80, 80, 80, 80, 80, 80, 80]);
    expect(batting.score).toBe(88);
    expect(batting.letter).toBe("A");
  });
});
