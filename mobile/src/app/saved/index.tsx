import React, { useCallback, useEffect, useState } from "react";
import { Modal, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { BackBar } from "@/components/ui/BackBar";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ApiError } from "@/api/client";
import { getCollections, createCollection, type CollectionSummary } from "@/api/collections";

/**
 * Saved -- Phase 7. This is web's "Saved" nav item, which Phase 7 research
 * confirmed renders the real Collections backend directly (Saved and
 * Collections are the same feature, not two separate ones). Real CRUD,
 * real sharing -- no mocking found anywhere in this area.
 */
export default function SavedScreen() {
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createVisible, setCreateVisible] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setCollections(await getCollections());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load your saved collections");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = useCallback(async () => {
    const name = newName.trim();
    if (!name) {
      setCreateError("Name is required");
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const created = await createCollection({ name, description: newDescription.trim() || undefined });
      setCreateVisible(false);
      setNewName("");
      setNewDescription("");
      void load();
      router.push(`/saved/${created.id}`);
    } catch (e) {
      setCreateError(e instanceof ApiError ? e.message : "Failed to create collection");
    } finally {
      setCreating(false);
    }
  }, [newName, newDescription, load]);

  return (
    <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark" edges={["top", "left", "right"]}>
      <BackBar label="Dashboard" />
      <View className="flex-row items-center justify-between px-6 pt-2">
        <Text className="text-2xl font-bold text-text-primary dark:text-text-primary-dark">Saved</Text>
        <Button size="sm" onPress={() => setCreateVisible(true)}>
          New Collection
        </Button>
      </View>

      <ScrollView
        className="flex-1 px-6 pt-4"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
          />
        }
      >
        {loading ? (
          <Text className="text-sm text-text-secondary dark:text-text-secondary-dark">Loading…</Text>
        ) : error ? (
          <Text className="text-sm text-danger dark:text-danger-dark">{error}</Text>
        ) : collections.length === 0 ? (
          <Card>
            <CardContent>
              <Text className="text-sm text-text-secondary dark:text-text-secondary-dark">
                No saved collections yet. Create one, then save clips to it from any analysed video.
              </Text>
            </CardContent>
          </Card>
        ) : (
          <View className="gap-3 pb-8">
            {collections.map((c) => (
              <Pressable key={c.id} onPress={() => router.push(`/saved/${c.id}`)}>
                <Card>
                  <CardContent>
                    <View className="flex-row items-center justify-between">
                      <Text className="text-base font-semibold text-text-primary dark:text-text-primary-dark">{c.name}</Text>
                      {c.isSharedWithMe ? (
                        <View className="rounded-full bg-surface-secondary dark:bg-surface-secondary-dark px-2 py-0.5">
                          <Text className="text-[10px] font-medium text-text-secondary dark:text-text-secondary-dark">
                            SHARED BY {c.ownerName.toUpperCase()}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    {c.description ? (
                      <Text className="mt-1 text-sm text-text-secondary dark:text-text-secondary-dark" numberOfLines={2}>
                        {c.description}
                      </Text>
                    ) : null}
                    <Text className="mt-1 text-xs text-text-secondary dark:text-text-secondary-dark">
                      {c.clipCount} {c.clipCount === 1 ? "clip" : "clips"}
                      {c.shareCount > 0 ? ` · shared with ${c.shareCount}` : ""}
                    </Text>
                  </CardContent>
                </Card>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={createVisible} animationType="slide" onRequestClose={() => setCreateVisible(false)}>
        <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark">
          <View className="flex-row items-center justify-between px-6 pt-4">
            <Text className="text-xl font-bold text-text-primary dark:text-text-primary-dark">New Collection</Text>
            <Button variant="ghost" size="sm" onPress={() => setCreateVisible(false)}>
              Close
            </Button>
          </View>
          <View className="gap-4 px-6 pt-4">
            <Input label="Name" value={newName} onChangeText={setNewName} placeholder="e.g. Best Cover Drives" />
            <Input
              label="Description (optional)"
              value={newDescription}
              onChangeText={setNewDescription}
              placeholder="What's this collection for?"
              multiline
            />
            {createError ? <Text className="text-sm text-danger dark:text-danger-dark">{createError}</Text> : null}
            <Button onPress={() => void handleCreate()} isLoading={creating}>
              Create Collection
            </Button>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
