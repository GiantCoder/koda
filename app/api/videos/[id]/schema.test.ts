import { describe, expect, it } from "vitest";
import { parseVideoTags, patchVideoSchema } from "./schema";

describe("parseVideoTags", () => {
  it("returns empty array for non-arrays", () => {
    expect(parseVideoTags(null)).toEqual([]);
    expect(parseVideoTags({ foo: 1 })).toEqual([]);
  });

  it("filters to non-empty strings", () => {
    expect(parseVideoTags(["nets", "", 3, "pace"])).toEqual(["nets", "pace"]);
  });
});

describe("patchVideoSchema", () => {
  it("accepts assigneeUserId null for unassigned", () => {
    const parsed = patchVideoSchema.safeParse({ assigneeUserId: null });
    expect(parsed.success).toBe(true);
  });

  it("accepts tags array", () => {
    const parsed = patchVideoSchema.safeParse({ tags: ["front-foot", "nets"] });
    expect(parsed.success).toBe(true);
  });

  it("accepts filename rename", () => {
    const parsed = patchVideoSchema.safeParse({ filename: "Cover drive nets" });
    expect(parsed.success).toBe(true);
  });

  it("rejects empty filename", () => {
    const parsed = patchVideoSchema.safeParse({ filename: "   " });
    expect(parsed.success).toBe(false);
  });

  it("rejects empty patch", () => {
    const parsed = patchVideoSchema.safeParse({});
    expect(parsed.success).toBe(false);
  });
});
