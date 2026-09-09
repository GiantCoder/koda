import React, { useMemo, useState } from "react";
import { Image, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { getAccessToken } from "@/api/tokenStore";
import { API_BASE_URL } from "@/api/client";
import type { AnalysisFrame } from "@/api/analysis";

/**
 * Real frame-by-frame gallery (GET /api/analysis/[id]/frames -> per-frame
 * JPEG via /frames/[index]). Each thumbnail is an authenticated <Image> --
 * same {uri, headers: {Authorization}} pattern Phase 3 already established
 * for streaming video, since these routes require a Bearer token the same
 * way. Tap a thumbnail to view it larger in a simple modal.
 */
export function FrameGallery({ frames }: { frames: AnalysisFrame[] }) {
  const [selected, setSelected] = useState<AnalysisFrame | null>(null);
  const headers = useMemo(() => {
    const token = getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : undefined;
  }, []);

  if (frames.length === 0) return null;

  return (
    <Card className="p-0 overflow-hidden">
      <View className="p-6 pb-0">
        <CardHeader>🖼️ Frame Gallery</CardHeader>
      </View>
      <CardContent className="px-6 pb-6">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="gap-2">
          {frames.map((frame) => (
            <Pressable
              key={frame.index}
              onPress={() => setSelected(frame)}
              className="mr-2 overflow-hidden rounded-lg border border-surface-secondary dark:border-surface-secondary-dark"
            >
              <Image
                source={{ uri: `${API_BASE_URL}${frame.url}`, headers }}
                style={{ width: 96, height: 96 }}
                resizeMode="cover"
              />
            </Pressable>
          ))}
        </ScrollView>
      </CardContent>

      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <Pressable
          className="flex-1 items-center justify-center bg-black/90"
          onPress={() => setSelected(null)}
        >
          {selected ? (
            <Image
              source={{ uri: `${API_BASE_URL}${selected.url}`, headers }}
              style={{ width: "92%", aspectRatio: 16 / 9 }}
              resizeMode="contain"
            />
          ) : null}
          <Text className="mt-4 text-sm text-white">Tap to close</Text>
        </Pressable>
      </Modal>
    </Card>
  );
}
