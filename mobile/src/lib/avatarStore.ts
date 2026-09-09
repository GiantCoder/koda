/**
 * Local-only selected-avatar URL, matching the web app's localStorage-based
 * avatar selection. There's no real backend for this yet -- PUT
 * /api/users/me/avatar exists but is an explicit MVP placeholder that
 * doesn't persist anything server-side (see ../api/avatars.ts) -- so, like
 * onboardingStore.ts, this is SecureStore purely for consistency with the
 * rest of the app's local storage, not because the value is sensitive.
 * Doesn't sync across devices; that's a known, deliberate limitation until
 * the backend grows real avatar storage.
 */
import * as SecureStore from "expo-secure-store";

const SELECTED_AVATAR_KEY = "koda_selected_avatar_url";

export async function getSelectedAvatarUrl(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(SELECTED_AVATAR_KEY);
  } catch (err) {
    console.warn("[avatarStore] Failed to read selected avatar:", err);
    return null;
  }
}

export async function setSelectedAvatarUrl(url: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(SELECTED_AVATAR_KEY, url);
  } catch (err) {
    console.warn("[avatarStore] Failed to persist selected avatar:", err);
  }
}
