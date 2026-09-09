import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Modal, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { BackBar } from "@/components/ui/BackBar";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Checkbox } from "@/components/ui/Checkbox";
import { useAppSelector } from "@/store/hooks";
import { ApiError } from "@/api/client";
import { getAssignablePlayers, type AssignablePlayer } from "@/api/videos";
import { getMyCoaches } from "@/api/team";
import {
  getCollection,
  updateCollection,
  deleteCollection,
  removeClipFromCollection,
  getCollectionShares,
  shareCollection,
  unshareCollection,
  type CollectionDetail,
  type CollectionShareEntry,
} from "@/api/collections";

/**
 * Collection detail -- Phase 7. Real clip list + real sharing. Since the
 * backend has no generic "search all users" endpoint, the share picker is
 * scoped to whoever this role already has a real contact list for:
 * coach/admin share with their roster, everyone else shares with their
 * coach (same contact-source split Messages' "New Message" uses).
 */
export default function CollectionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isCoachOrAdmin = useAppSelector(
    (state) => state.auth.user?.role === "COACH" || state.auth.user?.role === "ADMIN"
  );

  const [collection, setCollection] = useState<CollectionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removingClipId, setRemovingClipId] = useState<string | null>(null);

  const [editVisible, setEditVisible] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPublic, setEditPublic] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [shareVisible, setShareVisible] = useState(false);
  const [shares, setShares] = useState<CollectionShareEntry[] | null>(null);
  const [contacts, setContacts] = useState<AssignablePlayer[] | null>(null);
  const [sharingId, setSharingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      setCollection(await getCollection(id));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load collection");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const openEdit = useCallback(() => {
    if (!collection) return;
    setEditName(collection.name);
    setEditDescription(collection.description ?? "");
    setEditPublic(collection.isPublic);
    setEditError(null);
    setEditVisible(true);
  }, [collection]);

  const handleSaveEdit = useCallback(async () => {
    if (!id) return;
    const name = editName.trim();
    if (!name) {
      setEditError("Name is required");
      return;
    }
    setSavingEdit(true);
    setEditError(null);
    try {
      await updateCollection(id, { name, description: editDescription.trim() || null, isPublic: editPublic });
      setEditVisible(false);
      void load();
    } catch (e) {
      setEditError(e instanceof ApiError ? e.message : "Failed to save changes");
    } finally {
      setSavingEdit(false);
    }
  }, [id, editName, editDescription, editPublic, load]);

  const handleDelete = useCallback(async () => {
    if (!id) return;
    setDeleting(true);
    try {
      await deleteCollection(id);
      router.replace("/saved");
    } catch (e) {
      setEditError(e instanceof ApiError ? e.message : "Failed to delete collection");
      setDeleting(false);
    }
  }, [id]);

  const handleRemoveClip = useCallback(
    async (videoId: string) => {
      if (!id) return;
      setRemovingClipId(videoId);
      try {
        await removeClipFromCollection(id, videoId);
        void load();
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Failed to remove clip");
      } finally {
        setRemovingClipId(null);
      }
    },
    [id, load]
  );

  const openShare = useCallback(async () => {
    if (!id) return;
    setShareVisible(true);
    try {
      setShares(await getCollectionShares(id));
    } catch {
      setShares([]);
    }
    if (contacts === null) {
      try {
        setContacts(isCoachOrAdmin ? await getAssignablePlayers() : await getMyCoaches());
      } catch {
        setContacts([]);
      }
    }
  }, [id, contacts, isCoachOrAdmin]);

  const handleShare = useCallback(
    async (userId: string) => {
      if (!id) return;
      setSharingId(userId);
      try {
        await shareCollection(id, userId);
        setShares(await getCollectionShares(id));
        void load();
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Failed to share collection");
      } finally {
        setSharingId(null);
      }
    },
    [id, load]
  );

  const handleUnshare = useCallback(
    async (userId: string) => {
      if (!id) return;
      setSharingId(userId);
      try {
        await unshareCollection(id, userId);
        setShares(await getCollectionShares(id));
        void load();
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Failed to remove share");
      } finally {
        setSharingId(null);
      }
    },
    [id, load]
  );

  const sharedUserIds = useMemo(() => new Set((shares ?? []).map((s) => s.userId)), [shares]);
  const shareCandidates = useMemo(
    () => (contacts ?? []).filter((c) => !sharedUserIds.has(c.id)),
    [contacts, sharedUserIds]
  );

  if (!id) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-surface">
        <Text className="text-text-secondary">No collection specified.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top", "left", "right"]}>
      <BackBar label="Saved" />

      {loading ? (
        <View className="items-center pt-12">
          <ActivityIndicator />
        </View>
      ) : error && !collection ? (
        <Text className="px-6 pt-6 text-sm text-danger">{error}</Text>
      ) : collection ? (
        <ScrollView
          className="flex-1 px-6"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} />}
        >
          <View className="gap-4 pb-10 pt-2">
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-2xl font-bold text-text-primary">{collection.name}</Text>
                {collection.description ? (
                  <Text className="mt-1 text-sm text-text-secondary">{collection.description}</Text>
                ) : null}
                <Text className="mt-1 text-xs text-text-secondary">
                  {collection.canEdit ? "Owned by you" : `Shared by ${collection.ownerName}`}
                  {collection.isPublic ? " · Public" : ""}
                </Text>
              </View>
              {collection.canEdit ? (
                <View className="gap-2">
                  <Button variant="secondary" size="sm" onPress={openEdit}>
                    Edit
                  </Button>
                  <Button variant="secondary" size="sm" onPress={() => void openShare()}>
                    Share
                  </Button>
                </View>
              ) : null}
            </View>

            {collection.clips.length === 0 ? (
              <Card>
                <CardContent>
                  <Text className="text-sm text-text-secondary">
                    No clips saved yet. Open an analysed video and tap "Save to Collection".
                  </Text>
                </CardContent>
              </Card>
            ) : (
              <View className="gap-1">
                {collection.clips.map((clip) => (
                  <Pressable
                    key={clip.id}
                    onPress={() => router.push(`/analysis/${clip.videoId}`)}
                    className="flex-row items-center justify-between rounded-lg border border-surface-secondary p-3"
                  >
                    <View className="flex-1 pr-2">
                      <Text className="text-text-primary" numberOfLines={1}>
                        {clip.filename ?? "Untitled video"}
                      </Text>
                      <Text className="mt-0.5 text-xs text-text-secondary">
                        {clip.analysis?.shotType?.replace(/_/g, " ").toLowerCase() ?? "Unknown shot"}
                        {clip.notes ? ` · ${clip.notes}` : ""}
                      </Text>
                    </View>
                    {clip.analysis?.gradeLetter ? (
                      <View className="mr-2 items-center justify-center rounded-full bg-surface-secondary px-3 py-1">
                        <Text className="text-sm font-bold text-text-primary">{clip.analysis.gradeLetter}</Text>
                      </View>
                    ) : null}
                    {collection.canEdit ? (
                      <Pressable
                        onPress={() => void handleRemoveClip(clip.videoId)}
                        disabled={removingClipId === clip.videoId}
                        hitSlop={8}
                      >
                        <Text className="text-xs text-danger">
                          {removingClipId === clip.videoId ? "…" : "Remove"}
                        </Text>
                      </Pressable>
                    ) : null}
                  </Pressable>
                ))}
              </View>
            )}

            {collection.canEdit ? (
              <View className="border-t border-surface-secondary pt-4">
                <Button variant="danger" onPress={() => void handleDelete()} isLoading={deleting}>
                  Delete Collection
                </Button>
              </View>
            ) : null}
          </View>
        </ScrollView>
      ) : null}

      <Modal visible={editVisible} animationType="slide" onRequestClose={() => setEditVisible(false)}>
        <SafeAreaView className="flex-1 bg-surface">
          <View className="flex-row items-center justify-between px-6 pt-4">
            <Text className="text-xl font-bold text-text-primary">Edit Collection</Text>
            <Button variant="ghost" size="sm" onPress={() => setEditVisible(false)}>
              Close
            </Button>
          </View>
          <View className="gap-4 px-6 pt-4">
            <Input label="Name" value={editName} onChangeText={setEditName} />
            <Input label="Description" value={editDescription} onChangeText={setEditDescription} multiline />
            <Checkbox checked={editPublic} onToggle={setEditPublic} label="Make this collection public" />
            {editError ? <Text className="text-sm text-danger">{editError}</Text> : null}
            <Button onPress={() => void handleSaveEdit()} isLoading={savingEdit}>
              Save Changes
            </Button>
          </View>
        </SafeAreaView>
      </Modal>

      <Modal visible={shareVisible} animationType="slide" onRequestClose={() => setShareVisible(false)}>
        <SafeAreaView className="flex-1 bg-surface">
          <View className="flex-row items-center justify-between px-6 pt-4">
            <Text className="text-xl font-bold text-text-primary">Share Collection</Text>
            <Button variant="ghost" size="sm" onPress={() => setShareVisible(false)}>
              Close
            </Button>
          </View>
          <ScrollView className="flex-1 px-6 pt-4">
            <Text className="mb-2 text-sm font-medium text-text-primary">Shared with</Text>
            {shares === null ? (
              <Text className="text-sm text-text-secondary">Loading…</Text>
            ) : shares.length === 0 ? (
              <Text className="mb-4 text-sm text-text-secondary">Not shared with anyone yet.</Text>
            ) : (
              <View className="mb-4 gap-1">
                {shares.map((share) => (
                  <View key={share.userId} className="flex-row items-center justify-between rounded-lg bg-surface-secondary p-2">
                    <Text className="text-text-primary">{share.displayName}</Text>
                    <Pressable onPress={() => void handleUnshare(share.userId)} disabled={sharingId === share.userId}>
                      <Text className="text-xs text-danger">{sharingId === share.userId ? "…" : "Remove"}</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
            <Text className="mb-2 text-sm font-medium text-text-primary">
              {isCoachOrAdmin ? "Share with a player" : "Share with your coach"}
            </Text>
            {contacts === null ? (
              <Text className="text-sm text-text-secondary">Loading…</Text>
            ) : shareCandidates.length === 0 ? (
              <Text className="text-sm text-text-secondary">No one else available to share with.</Text>
            ) : (
              <View className="gap-1">
                {shareCandidates.map((c) => (
                  <Pressable
                    key={c.id}
                    onPress={() => void handleShare(c.id)}
                    disabled={sharingId === c.id}
                    className="flex-row items-center justify-between rounded-lg p-2"
                  >
                    <Text className="text-text-primary">{c.displayName}</Text>
                    <Text className="text-xs text-primary">{sharingId === c.id ? "Sharing…" : "Share"}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
