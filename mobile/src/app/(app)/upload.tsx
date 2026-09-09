import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useAppSelector } from "@/store/hooks";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { OptionPicker } from "@/components/ui/OptionPicker";
import { getAssignablePlayers, getRecentUploads, type AssignablePlayer, type RecentUpload } from "@/api/videos";
import { uploadVideo } from "@/api/videoUpload";
import { validateVideoAsset, guessMimeType, formatFileSize } from "@/lib/videoValidation";
import { ApiError } from "@/api/client";

interface PickedVideo {
  uri: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes?: number;
}

function assetToPickedVideo(asset: ImagePicker.ImagePickerAsset): PickedVideo {
  const fileName = asset.fileName ?? asset.uri.split("/").pop() ?? `video-${Date.now()}.mp4`;
  return {
    uri: asset.uri,
    fileName,
    mimeType: guessMimeType(fileName, asset.mimeType),
    fileSizeBytes: asset.fileSize,
  };
}

const STATUS_LABELS: Record<RecentUpload["processingState"], string> = {
  analyzed: "Analyzed",
  processing: "Processing",
  failed: "Failed",
  unsupported: "Not supported",
};

const STATUS_COLORS: Record<RecentUpload["processingState"], string> = {
  analyzed: "bg-green-100 text-green-700",
  processing: "bg-blue-100 text-blue-700",
  failed: "bg-red-100 text-red-700",
  unsupported: "bg-amber-100 text-amber-700",
};

/**
 * Real upload flow against POST /api/video/upload (see src/api/videoUpload.ts
 * for why this needs its own request plumbing). Deliberately narrower than
 * web's upload page per the Phase 3 scoping discussion: single video only
 * (no bulk upload), and no pre-upload "which shots did you play" hints
 * modal -- both are optional extras the backend and this feature work fine
 * without, not functional gaps.
 */
export default function UploadScreen() {
  const user = useAppSelector((state) => state.auth.user);
  const isCoach = user?.role === "COACH";
  const isParent = user?.role === "PARENT";
  const needsAssigneePicker = isCoach || isParent;

  const [picked, setPicked] = useState<PickedVideo | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);

  const [players, setPlayers] = useState<AssignablePlayer[] | null>(null);
  const [assigneeUserId, setAssigneeUserId] = useState<string | null>(null);
  const [playersError, setPlayersError] = useState<string | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [recentUploads, setRecentUploads] = useState<RecentUpload[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!needsAssigneePicker) return;
    getAssignablePlayers()
      .then((list) => {
        setPlayers(list);
        if (isParent && list.length === 1) {
          setAssigneeUserId(list[0].id);
        }
      })
      .catch((err) => {
        console.error("[upload] Failed to load assignable players:", err);
        setPlayersError("Couldn't load your players right now.");
      });
  }, [needsAssigneePicker, isParent]);

  const loadRecentUploads = useCallback(async () => {
    try {
      const uploads = await getRecentUploads(8);
      setRecentUploads(uploads);
    } catch (err) {
      console.error("[upload] Failed to load recent uploads:", err);
    }
  }, []);

  useEffect(() => {
    void loadRecentUploads();
  }, [loadRecentUploads]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRecentUploads();
    setRefreshing(false);
  }, [loadRecentUploads]);

  const applyAsset = (asset: ImagePicker.ImagePickerAsset) => {
    const video = assetToPickedVideo(asset);
    const validation = validateVideoAsset(video.fileName, video.fileSizeBytes);
    if (!validation.valid) {
      setPickError(validation.error ?? "That video can't be uploaded.");
      return;
    }
    setPickError(null);
    setUploadError(null);
    setPicked(video);
  };

  const handleRecord = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setPickError("Camera access is needed to record a video.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["videos"] });
    if (!result.canceled && result.assets[0]) {
      applyAsset(result.assets[0]);
    }
  };

  const handleChooseFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setPickError("Photo library access is needed to choose a video.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["videos"] });
    if (!result.canceled && result.assets[0]) {
      applyAsset(result.assets[0]);
    }
  };

  const needsParentSelection = isParent && (players?.length ?? 0) > 1 && !assigneeUserId;
  const noAssignablePlayers = isParent && players != null && players.length === 0;
  const canUpload = !!picked && !isUploading && !needsParentSelection && !noAssignablePlayers;

  const handleUpload = async () => {
    if (!picked) return;
    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);
    try {
      const result = await uploadVideo({
        fileUri: picked.uri,
        fileName: picked.fileName,
        mimeType: picked.mimeType,
        assigneeUserId: assigneeUserId ?? undefined,
        onProgress: setUploadProgress,
      });
      setPicked(null);
      setUploadProgress(0);
      void loadRecentUploads();
      router.push(`/analysis/${result.id}/processing`);
    } catch (err) {
      console.error("[upload] Upload failed:", err);
      setUploadError(err instanceof ApiError ? err.message : "Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top", "left", "right"]}>
      <ScrollView
        className="flex-1 px-6 pt-6"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text className="mb-6 text-2xl font-bold text-text-primary">Upload a Video</Text>

        <Card className="mb-6">
          <CardHeader>New Upload</CardHeader>
          <CardContent>
            {picked ? (
              <View className="rounded-lg border border-surface-secondary p-4">
                <Text className="font-medium text-text-primary" numberOfLines={1}>
                  {picked.fileName}
                </Text>
                {picked.fileSizeBytes ? (
                  <Text className="mt-1 text-xs text-text-secondary">{formatFileSize(picked.fileSizeBytes)}</Text>
                ) : null}
                {!isUploading ? (
                  <Button variant="ghost" size="sm" className="mt-3 self-start" onPress={() => setPicked(null)}>
                    Choose a different video
                  </Button>
                ) : null}
              </View>
            ) : (
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Button variant="primary" onPress={handleRecord}>
                    Record video
                  </Button>
                </View>
                <View className="flex-1">
                  <Button variant="secondary" onPress={handleChooseFromLibrary}>
                    Choose existing
                  </Button>
                </View>
              </View>
            )}
            {pickError ? <Text className="mt-3 text-sm text-danger">{pickError}</Text> : null}

            {needsAssigneePicker ? (
              <View className="mt-4">
                {playersError ? (
                  <Text className="text-sm text-danger">{playersError}</Text>
                ) : players === null ? (
                  <ActivityIndicator className="py-2" />
                ) : noAssignablePlayers ? (
                  <Text className="text-sm text-text-secondary">
                    {isParent
                      ? "No child player is linked to your account yet."
                      : "No players in your squad yet."}
                  </Text>
                ) : (isParent && players.length > 1) || (isCoach && players.length > 0) ? (
                  <OptionPicker
                    label={isParent ? "Which child is this for?" : "Assign to a player (optional)"}
                    options={players.map((p) => ({ value: p.id, label: p.displayName }))}
                    value={assigneeUserId}
                    onChange={setAssigneeUserId}
                  />
                ) : null}
              </View>
            ) : null}

            {isUploading ? (
              <View className="mt-4">
                <View className="h-2 overflow-hidden rounded-full bg-surface-secondary">
                  <View className="h-2 rounded-full bg-primary" style={{ width: `${uploadProgress}%` }} />
                </View>
                <Text className="mt-2 text-xs text-text-secondary">Uploading… {uploadProgress}%</Text>
              </View>
            ) : null}

            {uploadError ? <Text className="mt-3 text-sm text-danger">{uploadError}</Text> : null}

            <Button className="mt-4" onPress={handleUpload} disabled={!canUpload} isLoading={isUploading}>
              Upload
            </Button>
          </CardContent>
        </Card>

        <Card className="mb-10">
          <CardHeader>Recent Uploads</CardHeader>
          <CardContent>
            {recentUploads === null ? (
              <ActivityIndicator className="py-4" />
            ) : recentUploads.length === 0 ? (
              <Text className="text-sm text-text-secondary">No uploads yet.</Text>
            ) : (
              <View className="gap-3">
                {recentUploads.map((upload) => (
                  <Button
                    key={upload.id}
                    variant="ghost"
                    className="flex-row items-center justify-between px-0 py-2"
                    onPress={() =>
                      router.push(
                        upload.processingState === "analyzed"
                          ? `/analysis/${upload.id}`
                          : `/analysis/${upload.id}/processing`
                      )
                    }
                  >
                    <View className="flex-1 flex-row items-center justify-between">
                      <Text className="flex-1 pr-2 text-sm text-text-primary" numberOfLines={1}>
                        {upload.filename}
                      </Text>
                      <Text className={`overflow-hidden rounded-full px-2 py-1 text-xs font-medium ${STATUS_COLORS[upload.processingState]}`}>
                        {STATUS_LABELS[upload.processingState]}
                      </Text>
                    </View>
                  </Button>
                ))}
              </View>
            )}
          </CardContent>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
