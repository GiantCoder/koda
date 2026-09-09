import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { BackBar } from "@/components/ui/BackBar";
import { OptionPicker, type Option } from "@/components/ui/OptionPicker";
import { ApiError } from "@/api/client";
import { getExploreClips, type ExploreClipSummary } from "@/api/explore";

/**
 * Explore -- Phase 7, built per the user's explicit decision to match
 * web's current behavior rather than withhold it (see api/explore.ts for
 * the real privacy gap this surfaces, and the roadmap doc for the full
 * flag). No thumbnails are shown -- the thumbnail endpoint this data
 * references doesn't exist anywhere in the app, web included.
 */

const SORT_OPTIONS: Option[] = [
  { value: "recent", label: "Recent" },
  { value: "top_rated", label: "Top Rated" },
];

export default function ExploreScreen() {
  const [clips, setClips] = useState<ExploreClipSummary[]>([]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"recent" | "top_rated">("recent");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (query: string, sortBy: "recent" | "top_rated") => {
    setLoading(true);
    setError(null);
    try {
      const result = await getExploreClips({ search: query || undefined, sort: sortBy, limit: 20, offset: 0 });
      setClips(result.clips);
      setHasMore(result.hasMore);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load Explore");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(search, sort);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const result = await getExploreClips({ search: search || undefined, sort, limit: 20, offset: clips.length });
      setClips((prev) => [...prev, ...result.clips]);
      setHasMore(result.hasMore);
    } catch {
      // silent
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, search, sort, clips.length]);

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top", "left", "right"]}>
      <BackBar label="Dashboard" />
      <Text className="px-6 pt-2 text-2xl font-bold text-text-primary">Explore</Text>

      <View className="gap-3 px-6 pt-3">
        <TextInput
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => void load(search, sort)}
          placeholder="Search clips…"
          placeholderTextColor="#9CA3AF"
          className="rounded-lg border border-surface-secondary px-4 py-3 text-base text-text-primary"
        />
        <OptionPicker options={SORT_OPTIONS} value={sort} onChange={(v) => setSort(v as "recent" | "top_rated")} />
      </View>

      {loading ? (
        <View className="items-center pt-12">
          <ActivityIndicator />
        </View>
      ) : error ? (
        <Text className="px-6 pt-6 text-sm text-danger">{error}</Text>
      ) : (
        <FlatList
          data={clips}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 24 }}
          onEndReached={() => void loadMore()}
          onEndReachedThreshold={0.4}
          ListFooterComponent={loadingMore ? <ActivityIndicator className="py-4" /> : null}
          ListEmptyComponent={<Text className="text-sm text-text-secondary">No clips found.</Text>}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/explore/${item.id}`)}
              className="mb-2 rounded-lg border border-surface-secondary p-3"
            >
              <View className="flex-row items-center justify-between">
                <Text className="flex-1 pr-2 font-semibold text-text-primary" numberOfLines={1}>
                  {item.title}
                </Text>
                {item.grade !== "N/A" ? (
                  <View className="items-center justify-center rounded-full bg-surface-secondary px-3 py-1">
                    <Text className="text-sm font-bold text-text-primary">{item.grade}</Text>
                  </View>
                ) : null}
              </View>
              <Text className="mt-0.5 text-sm text-text-secondary" numberOfLines={1}>
                {item.description}
              </Text>
              <Text className="mt-1 text-xs text-text-secondary">by {item.uploadedBy}</Text>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}
