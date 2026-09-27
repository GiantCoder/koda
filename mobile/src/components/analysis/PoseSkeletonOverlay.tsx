import React, { useEffect, useState } from "react";
import { View, LayoutChangeEvent } from "react-native";
import Svg, { Circle, Line, Polygon, Rect, Text as SvgText } from "react-native-svg";
import { useEvent } from "expo";
import type { VideoPlayer } from "expo-video";
import type { PoseEstimateResponse } from "@/api/analysis";
import {
  POSE_CONNECTIONS,
  JOINT_COLOUR_BY_NAME,
  JOINT_RADIUS,
  WRIST_RADIUS,
  findNearestPoseFrame,
  getContainedVideoContentBox,
  mapPoint,
  resolveBboxRect,
  computeWristArrows,
} from "@/lib/poseOverlay";

export interface OverlayLayerToggles {
  showSkeleton: boolean;
  showBbox: boolean;
}

interface PoseSkeletonOverlayProps {
  player: VideoPlayer;
  poseData: PoseEstimateResponse | null;
  layers: OverlayLayerToggles;
}

/**
 * Draws the same skeleton web's <canvas>-based VideoSkeletonOverlay draws,
 * using react-native-svg absolutely positioned over the video. Syncs to
 * playback via expo-video's `timeUpdate` event. That event is off by
 * default (`timeUpdateEventInterval` is 0), so we enable it here --
 * otherwise the overlay stays on the first pose frame forever.
 *
 * Phase 8: points are now mapped through the video's actual visible
 * content box (see lib/poseOverlay.ts), not the raw container -- the
 * parent screen must render its VideoView with contentFit="contain" for
 * this to line up (see analysis/[videoId]/index.tsx). Also added the
 * tracked-subject bbox layer, toggleable alongside the skeleton.
 */
export function PoseSkeletonOverlay({ player, poseData, layers }: PoseSkeletonOverlayProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [currentTime, setCurrentTime] = useState(() => player.currentTime);
  const trackChange = useEvent(player, "videoTrackChange", { videoTrack: player.videoTrack });
  const sourceWidth = trackChange.videoTrack?.size.width ?? 0;
  const sourceHeight = trackChange.videoTrack?.size.height ?? 0;

  useEffect(() => {
    player.timeUpdateEventInterval = 0.05;
    const syncTime = (seconds?: number) => {
      setCurrentTime(typeof seconds === "number" ? seconds : player.currentTime);
    };
    let poll: ReturnType<typeof setInterval> | null = null;
    const startPoll = () => {
      if (poll) return;
      poll = setInterval(() => syncTime(), 50);
    };
    const stopPoll = () => {
      if (!poll) return;
      clearInterval(poll);
      poll = null;
    };

    const timeSub = player.addListener("timeUpdate", (event) => syncTime(event.currentTime));
    const playSub = player.addListener("playingChange", ({ isPlaying }) => {
      syncTime();
      if (isPlaying) startPoll();
      else stopPoll();
    });
    if (player.playing) startPoll();

    return () => {
      timeSub.remove();
      playSub.remove();
      stopPoll();
    };
  }, [player]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ width, height });
  };

  if (!poseData || poseData.landmarks.length === 0) {
    return <View className="absolute inset-0" onLayout={onLayout} pointerEvents="none" />;
  }

  const { width, height } = size;
  const box =
    width > 0 && height > 0
      ? getContainedVideoContentBox(width, height, sourceWidth, sourceHeight)
      : null;
  const frame = box ? findNearestPoseFrame(poseData.landmarks, currentTime) : null;

  return (
    <View className="absolute inset-0" onLayout={onLayout} pointerEvents="none">
      {frame && box ? (
        <Svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
          {layers.showBbox
            ? (() => {
                const rect = resolveBboxRect(frame, poseData, box, sourceWidth, sourceHeight);
                if (!rect) return null;
                return (
                  <React.Fragment>
                    <Rect
                      x={rect.x}
                      y={rect.y}
                      width={rect.w}
                      height={rect.h}
                      stroke="rgba(250, 204, 21, 0.95)"
                      strokeWidth={1.5}
                      strokeDasharray="6,4"
                      fill="none"
                    />
                    <SvgText
                      x={rect.x + 4}
                      y={Math.max(12, rect.y - 4)}
                      fontSize={11}
                      fill="rgba(250, 204, 21, 0.95)"
                    >
                      Tracked subject
                    </SvgText>
                  </React.Fragment>
                );
              })()
            : null}

          {layers.showSkeleton ? (
            <React.Fragment>
              {POSE_CONNECTIONS.map(([from, to], i) => {
                const a = frame.keypoints[from];
                const b = frame.keypoints[to];
                if (!a || !b || a.visibility < 0.2 || b.visibility < 0.2) return null;
                const p1 = mapPoint(a, box);
                const p2 = mapPoint(b, box);
                return (
                  <Line
                    key={i}
                    x1={p1.x}
                    y1={p1.y}
                    x2={p2.x}
                    y2={p2.y}
                    stroke="rgba(16, 185, 129, 0.9)"
                    strokeWidth={2}
                  />
                );
              })}

              {Object.entries(frame.keypoints).map(([name, kp]) => {
                if (kp.visibility < 0.25) return null;
                const p = mapPoint(kp, box);
                const isWrist = name === "leftWrist" || name === "rightWrist";
                return (
                  <Circle
                    key={name}
                    cx={p.x}
                    cy={p.y}
                    r={isWrist ? WRIST_RADIUS : JOINT_RADIUS}
                    fill={JOINT_COLOUR_BY_NAME[name] ?? "#22D3EE"}
                  />
                );
              })}

              {computeWristArrows(frame, poseData.landmarks, box).map((arrow) => {
                const angle = Math.atan2(arrow.to.y - arrow.from.y, arrow.to.x - arrow.from.x);
                const headLen = 8;
                const p1 = arrow.to;
                const leftWing = {
                  x: p1.x - headLen * Math.cos(angle - 0.45),
                  y: p1.y - headLen * Math.sin(angle - 0.45),
                };
                const rightWing = {
                  x: p1.x - headLen * Math.cos(angle + 0.45),
                  y: p1.y - headLen * Math.sin(angle + 0.45),
                };
                return (
                  <React.Fragment key={arrow.joint}>
                    <Line
                      x1={arrow.from.x}
                      y1={arrow.from.y}
                      x2={arrow.to.x}
                      y2={arrow.to.y}
                      stroke="#F43F5E"
                      strokeWidth={2}
                    />
                    <Polygon
                      points={`${p1.x},${p1.y} ${leftWing.x},${leftWing.y} ${rightWing.x},${rightWing.y}`}
                      fill="#F43F5E"
                    />
                  </React.Fragment>
                );
              })}
            </React.Fragment>
          ) : null}
        </Svg>
      ) : null}
    </View>
  );
}
