import React, { useState } from "react";
import { View, LayoutChangeEvent } from "react-native";
import Svg, { Circle, Line, Polygon } from "react-native-svg";
import { useEvent } from "expo";
import type { VideoPlayer } from "expo-video";
import type { PoseEstimateResponse } from "@/api/analysis";
import {
  POSE_CONNECTIONS,
  JOINT_COLOUR_BY_NAME,
  JOINT_RADIUS,
  WRIST_RADIUS,
  findNearestPoseFrame,
  mapPoint,
  computeWristArrows,
} from "@/lib/poseOverlay";

interface PoseSkeletonOverlayProps {
  player: VideoPlayer;
  poseData: PoseEstimateResponse | null;
}

/**
 * Draws the same skeleton web's <canvas>-based VideoSkeletonOverlay draws,
 * using react-native-svg absolutely positioned over the video. Syncs to
 * playback via expo-video's `timeUpdate` event (fires a few times a second
 * by default) rather than a requestAnimationFrame loop -- RN has no native
 * rAF tied to video frame decode, and this is smooth enough for a coaching
 * review use case (pausing/scrubbing to inspect a position), which is the
 * primary use case here anyway.
 */
export function PoseSkeletonOverlay({ player, poseData }: PoseSkeletonOverlayProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const timeUpdate = useEvent(player, "timeUpdate", {
    currentTime: 0,
    currentLiveTimestamp: 0,
    currentOffsetFromLive: 0,
    bufferedPosition: 0,
  });

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ width, height });
  };

  if (!poseData || poseData.landmarks.length === 0) {
    return <View className="absolute inset-0" onLayout={onLayout} pointerEvents="none" />;
  }

  const { width, height } = size;
  const frame = width > 0 ? findNearestPoseFrame(poseData.landmarks, timeUpdate.currentTime) : null;

  return (
    <View className="absolute inset-0" onLayout={onLayout} pointerEvents="none">
      {frame && width > 0 && height > 0 ? (
        <Svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
          {POSE_CONNECTIONS.map(([from, to], i) => {
            const a = frame.keypoints[from];
            const b = frame.keypoints[to];
            if (!a || !b || a.visibility < 0.2 || b.visibility < 0.2) return null;
            const p1 = mapPoint(a, width, height);
            const p2 = mapPoint(b, width, height);
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
            const p = mapPoint(kp, width, height);
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

          {computeWristArrows(frame, poseData.landmarks, width, height).map((arrow) => {
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
        </Svg>
      ) : null}
    </View>
  );
}
