import React from "react";
import { Modal, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { VideoView, type VideoPlayer } from "expo-video";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { PoseEstimateResponse } from "@/api/analysis";
import { PressableScale } from "@/components/ui/PressableScale";
import { PoseSkeletonOverlay, type OverlayLayerToggles } from "./PoseSkeletonOverlay";
import { OverlayLayerToggleRow } from "./OverlayLayerToggleRow";

export interface OverlayLayers extends OverlayLayerToggles {
  showVideo: boolean;
}

interface AnalysisVideoStageProps {
  player: VideoPlayer;
  poseData: PoseEstimateResponse | null;
  overlayLayers: OverlayLayers;
  onOverlayLayersChange: (next: OverlayLayers) => void;
  fullscreen: boolean;
  onToggleFullscreen: () => void;
}

/**
 * Native AVPlayer/ExoPlayer fullscreen is a separate surface — RN overlays
 * (the pose skeleton) cannot draw on it. This stage disables that button
 * and expands in-app so the skeleton stays on the clip.
 */
function PlayerChrome({
  player,
  poseData,
  overlayLayers,
  onOverlayLayersChange,
  fullscreen,
  onToggleFullscreen,
}: AnalysisVideoStageProps) {
  const insets = useSafeAreaInsets();
  const topOffset = fullscreen ? Math.max(insets.top, 8) : 8;
  const sideOffset = fullscreen ? Math.max(insets.left, 8) : 8;

  return (
    <View className="flex-1 bg-black">
      <VideoView
        player={player}
        style={{ width: "100%", height: "100%", opacity: overlayLayers.showVideo ? 1 : 0 }}
        contentFit="contain"
        nativeControls
        fullscreenOptions={{ enable: false }}
      />
      {poseData ? <PoseSkeletonOverlay player={player} poseData={poseData} layers={overlayLayers} /> : null}
      {poseData ? (
        <View
          className="absolute gap-1.5 rounded-lg bg-black/60 px-3 py-2"
          style={{ top: topOffset, right: Math.max(sideOffset, 8) }}
          pointerEvents="box-none"
        >
          <OverlayLayerToggleRow
            label="Video"
            checked={overlayLayers.showVideo}
            onToggle={() => onOverlayLayersChange({ ...overlayLayers, showVideo: !overlayLayers.showVideo })}
          />
          <OverlayLayerToggleRow
            label="Skeleton"
            checked={overlayLayers.showSkeleton}
            onToggle={() => onOverlayLayersChange({ ...overlayLayers, showSkeleton: !overlayLayers.showSkeleton })}
          />
          <OverlayLayerToggleRow
            label="Bbox"
            checked={overlayLayers.showBbox}
            onToggle={() => onOverlayLayersChange({ ...overlayLayers, showBbox: !overlayLayers.showBbox })}
          />
        </View>
      ) : null}
      <PressableScale
        onPress={onToggleFullscreen}
        accessibilityLabel={fullscreen ? "Exit full screen" : "Full screen"}
        className="absolute h-9 w-9 items-center justify-center rounded-full bg-black/60"
        style={{ top: topOffset, left: Math.max(sideOffset, 8) }}
        hitSlop={8}
      >
        <Ionicons name={fullscreen ? "contract-outline" : "expand-outline"} size={18} color="#FFFFFF" />
      </PressableScale>
    </View>
  );
}

export function AnalysisVideoStage(props: AnalysisVideoStageProps) {
  const { fullscreen, onToggleFullscreen } = props;

  return (
    <>
      {!fullscreen ? (
        <View style={{ width: "100%", aspectRatio: 16 / 9, backgroundColor: "black" }}>
          <PlayerChrome {...props} />
        </View>
      ) : (
        <View style={{ width: "100%", aspectRatio: 16 / 9, backgroundColor: "black" }} />
      )}
      <Modal
        visible={fullscreen}
        animationType="fade"
        presentationStyle="fullScreen"
        supportedOrientations={["portrait", "landscape-left", "landscape-right"]}
        onRequestClose={onToggleFullscreen}
      >
        <StatusBar hidden />
        <View className="flex-1 bg-black">
          <PlayerChrome {...props} />
        </View>
      </Modal>
    </>
  );
}
