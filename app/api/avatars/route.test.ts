import { describe, expect, it, vi } from "vitest";

const resolveAvatarCategoriesMock = vi.fn();

vi.mock("@/app/lib/avatars", () => ({
  resolveAvatarCategories: resolveAvatarCategoriesMock,
}));

describe("GET /api/avatars", () => {
  it("returns dynamic categories from the avatar resolver", { timeout: 15000 }, async () => {
    resolveAvatarCategoriesMock.mockResolvedValueOnce([
      {
        key: "cricket",
        label: "Cricket",
        avatars: [{ id: "cricket/avatar-1.png", name: "avatar-1.png", url: "/avatars/cricket/avatar-1.png" }],
      },
    ]);

    const { GET } = await import("./route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      categories: [
        {
          key: "cricket",
          label: "Cricket",
          avatars: [{ id: "cricket/avatar-1.png", name: "avatar-1.png", url: "/avatars/cricket/avatar-1.png" }],
        },
      ],
    });
  });

  it("returns an empty safe fallback when resolver fails", async () => {
    resolveAvatarCategoriesMock.mockRejectedValueOnce(new Error("directory missing"));

    const { GET } = await import("./route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      categories: [],
      error: "Avatar directory not found",
    });
  });
});
