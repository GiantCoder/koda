import { API_BASE_URL } from "@/api/client";

/** Turn a stored path, data URL, or absolute URL into something Image can load. */
export function resolveAssetUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  const value = url.trim();
  if (value.startsWith("data:") || value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }
  if (value.startsWith("/")) return `${API_BASE_URL}${value}`;
  return value;
}

/** Persist gallery picks as site-relative paths so web and mobile both resolve them. */
export function toStoredAvatarUrl(url: string): string {
  if (url.startsWith(API_BASE_URL)) {
    const relative = url.slice(API_BASE_URL.length);
    return relative.startsWith("/") ? relative : url;
  }
  return url;
}
