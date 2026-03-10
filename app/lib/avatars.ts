import { readdir } from "fs/promises";
import path from "path";

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"]);

export interface AvatarItem {
  id: string;
  name: string;
  url: string;
}

export interface AvatarCategory {
  key: string;
  label: string;
  avatars: AvatarItem[];
}

function isImageFile(fileName: string): boolean {
  const extension = path.extname(fileName).toLowerCase();
  return IMAGE_EXTENSIONS.has(extension);
}

function formatCategoryName(category: string): string {
  return category
    .split(/[-_]/g)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export async function resolveAvatarCategories(): Promise<AvatarCategory[]> {
  const avatarsRoot = path.join(process.cwd(), "public", "avatars");
  const categoryEntries = await readdir(avatarsRoot, { withFileTypes: true });

  const categories = await Promise.all(
    categoryEntries
      .filter((entry) => entry.isDirectory())
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(async (categoryEntry) => {
        const categoryPath = path.join(avatarsRoot, categoryEntry.name);
        const fileEntries = await readdir(categoryPath, { withFileTypes: true });

        const avatars = fileEntries
          .filter((entry) => entry.isFile() && isImageFile(entry.name))
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((entry) => ({
            id: `${categoryEntry.name}/${entry.name}`,
            name: entry.name,
            url: `/avatars/${categoryEntry.name}/${entry.name}`,
          }));

        return {
          key: categoryEntry.name,
          label: formatCategoryName(categoryEntry.name),
          avatars,
        };
      })
  );

  return categories.filter((category) => category.avatars.length > 0);
}
