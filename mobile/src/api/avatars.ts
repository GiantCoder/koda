/**
 * Wraps GET /api/avatars -- a real endpoint that lists preset avatar images
 * from the server's public/avatars directory, grouped into categories.
 * There's no per-user "save an avatar" endpoint yet: PUT /api/users/me/avatar
 * exists but is an explicit backend placeholder that accepts a URL and
 * returns 202 without persisting anything. So, same as the web app, the
 * chosen avatar is stored locally only (see ../lib/avatarStore.ts) rather
 * than synced -- this is a deliberate, matched-fidelity choice, not an
 * oversight, per the Phase 2 scoping discussion.
 */
import { apiFetch } from "./client";

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

export async function getAvatarCategories(): Promise<AvatarCategory[]> {
  const data = await apiFetch<{ categories: AvatarCategory[] }>("/api/avatars");
  return data.categories;
}
