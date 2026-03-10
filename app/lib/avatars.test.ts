import { beforeEach, describe, expect, it, vi } from "vitest";

const readdirMock = vi.fn();

vi.mock("fs/promises", () => ({
  readdir: readdirMock,
}));

function createDirectoryEntry(name: string) {
  return {
    name,
    isDirectory: () => true,
    isFile: () => false,
  };
}

function createFileEntry(name: string) {
  return {
    name,
    isDirectory: () => false,
    isFile: () => true,
  };
}

describe("resolveAvatarCategories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds categories from folder names under public/avatars", async () => {
    readdirMock
      .mockResolvedValueOnce([createDirectoryEntry("zebra-team"), createDirectoryEntry("cricket")])
      .mockResolvedValueOnce([createFileEntry("cricket_02.png"), createFileEntry("readme.txt"), createFileEntry("cricket_01.png")])
      .mockResolvedValueOnce([createFileEntry("zebra_02.webp"), createFileEntry("zebra_01.jpg")]);

    const { resolveAvatarCategories } = await import("./avatars");
    const categories = await resolveAvatarCategories();

    expect(categories).toEqual([
      {
        key: "cricket",
        label: "Cricket",
        avatars: [
          {
            id: "cricket/cricket_01.png",
            name: "cricket_01.png",
            url: "/avatars/cricket/cricket_01.png",
          },
          {
            id: "cricket/cricket_02.png",
            name: "cricket_02.png",
            url: "/avatars/cricket/cricket_02.png",
          },
        ],
      },
      {
        key: "zebra-team",
        label: "Zebra Team",
        avatars: [
          {
            id: "zebra-team/zebra_01.jpg",
            name: "zebra_01.jpg",
            url: "/avatars/zebra-team/zebra_01.jpg",
          },
          {
            id: "zebra-team/zebra_02.webp",
            name: "zebra_02.webp",
            url: "/avatars/zebra-team/zebra_02.webp",
          },
        ],
      },
    ]);
  });

  it("filters out categories that have no image files", async () => {
    readdirMock
      .mockResolvedValueOnce([createDirectoryEntry("documents"), createDirectoryEntry("cricket")])
      .mockResolvedValueOnce([createFileEntry("notes.md")])
      .mockResolvedValueOnce([createFileEntry("cricket_01.png")]);

    const { resolveAvatarCategories } = await import("./avatars");
    const categories = await resolveAvatarCategories();

    expect(categories).toEqual([
      {
        key: "cricket",
        label: "Cricket",
        avatars: [
          {
            id: "cricket/cricket_01.png",
            name: "cricket_01.png",
            url: "/avatars/cricket/cricket_01.png",
          },
        ],
      },
    ]);
  });
});
