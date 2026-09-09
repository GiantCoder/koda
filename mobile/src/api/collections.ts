/**
 * Wraps the real, working Collections backend (GET/POST /api/collections,
 * GET/PUT/DELETE /api/collections/[id], POST /api/collections/[id]/clips,
 * DELETE .../clips/[videoId], GET/POST /api/collections/[id]/shares,
 * DELETE .../shares/[userId]). Phase 7 research confirmed this is fully
 * real -- no mocking anywhere -- and is what web's "Saved" nav item
 * actually renders (Collections *is* Saved, not a separate feature).
 *
 * A Collection is a named folder of saved analysed clips, owned by any
 * user, optionally shareable with specific other users by id. There's no
 * generic "search all users" endpoint on the backend, so the share picker
 * here is scoped to whoever a role already has a real contact list for:
 * coach/admin share with their roster (getAssignablePlayers), everyone
 * else shares with their coach (getMyCoaches, from Phase 6).
 */
import { apiFetch } from "./client";

export interface CollectionSummary {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  clipCount: number;
  shareCount: number;
  ownerId: string;
  ownerName: string;
  canEdit: boolean;
  isSharedWithMe: boolean;
  thumbnails: { videoId: string; filename: string; cdnUrl: string | null }[];
  createdAt: string;
  updatedAt: string;
}

export async function getCollections(): Promise<CollectionSummary[]> {
  const data = await apiFetch<{ collections: CollectionSummary[] }>("/api/collections");
  return data.collections;
}

export interface CreateCollectionInput {
  name: string;
  description?: string;
  isPublic?: boolean;
}

export async function createCollection(
  input: CreateCollectionInput
): Promise<{ id: string; name: string; description: string | null; isPublic: boolean }> {
  const data = await apiFetch<{ collection: { id: string; name: string; description: string | null; isPublic: boolean } }>(
    "/api/collections",
    { method: "POST", body: input }
  );
  return data.collection;
}

export interface UpdateCollectionInput {
  name?: string;
  description?: string | null;
  isPublic?: boolean;
}

export async function updateCollection(id: string, input: UpdateCollectionInput): Promise<void> {
  await apiFetch(`/api/collections/${id}`, { method: "PUT", body: input });
}

export async function deleteCollection(id: string): Promise<void> {
  await apiFetch(`/api/collections/${id}`, { method: "DELETE" });
}

export interface CollectionClip {
  id: string;
  videoId: string;
  filename: string | null;
  cdnUrl: string | null;
  durationSeconds: number | null;
  uploadedAt: string;
  savedAt: string;
  notes: string | null;
  analysis: { shotType: string | null; gradeLetter: string | null; gradeOverall: number | null } | null;
}

export interface CollectionDetail {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  ownerId: string;
  ownerName: string;
  canEdit: boolean;
  shareCount: number;
  isSharedWithMe: boolean;
  createdAt: string;
  updatedAt: string;
  clips: CollectionClip[];
}

export async function getCollection(id: string): Promise<CollectionDetail> {
  const data = await apiFetch<{ collection: CollectionDetail }>(`/api/collections/${id}`);
  return data.collection;
}

export async function addClipToCollection(collectionId: string, videoId: string, notes?: string): Promise<void> {
  await apiFetch(`/api/collections/${collectionId}/clips`, { method: "POST", body: { videoId, notes } });
}

export async function removeClipFromCollection(collectionId: string, videoId: string): Promise<void> {
  await apiFetch(`/api/collections/${collectionId}/clips/${videoId}`, { method: "DELETE" });
}

export interface CollectionShareEntry {
  userId: string;
  displayName: string;
  email: string;
  role: string;
  createdAt: string;
}

export async function getCollectionShares(collectionId: string): Promise<CollectionShareEntry[]> {
  const data = await apiFetch<{ shares: CollectionShareEntry[] }>(`/api/collections/${collectionId}/shares`);
  return data.shares;
}

export async function shareCollection(collectionId: string, userId: string): Promise<void> {
  await apiFetch(`/api/collections/${collectionId}/shares`, { method: "POST", body: { userId } });
}

export async function unshareCollection(collectionId: string, userId: string): Promise<void> {
  await apiFetch(`/api/collections/${collectionId}/shares/${userId}`, { method: "DELETE" });
}
