"use client";

import React, { useEffect, useMemo, useRef } from "react";
import type {
  FrameLandmarks,
  PoseEstimateResponse,
  PoseKeypoint,
} from "@/src/lib/analysis/mediapipe-types";

const POSE_CONNECTIONS: Array<[string, string]> = [
  ["leftShoulder", "rightShoulder"],
  ["leftShoulder", "leftElbow"],
  ["leftElbow", "leftWrist"],
  ["rightShoulder", "rightElbow"],
  ["rightElbow", "rightWrist"],
  ["leftShoulder", "leftHip"],
  ["rightShoulder", "rightHip"],
  ["leftHip", "rightHip"],
  ["leftHip", "leftKnee"],
  ["leftKnee", "leftAnkle"],
  ["rightHip", "rightKnee"],
  ["rightKnee", "rightAnkle"],
];

export function findNearestPoseFrame(
  frames: FrameLandmarks[],
  currentTimeSeconds: number
): FrameLandmarks | null {
  if (frames.length === 0) return null;
  let nearest = frames[0];
  let nearestDistance = Math.abs(nearest.timestamp - currentTimeSeconds);
  for (let i = 1; i < frames.length; i++) {
    const distance = Math.abs(frames[i].timestamp - currentTimeSeconds);
    if (distance < nearestDistance) {
      nearest = frames[i];
      nearestDistance = distance;
    }
  }
  return nearest;
}

function isValidBbox(
  value: Record<string, unknown> | null | undefined
): value is { x: number; y: number; w: number; h: number } {
  return Boolean(
    value &&
      typeof value.x === "number" &&
      typeof value.y === "number" &&
      typeof value.w === "number" &&
      typeof value.h === "number" &&
      value.w > 0 &&
      value.h > 0
  );
}

interface VideoSkeletonOverlayProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  poseData: PoseEstimateResponse | null;
  enabled: boolean;
  showBbox?: boolean;
  className?: string;
}

export function VideoSkeletonOverlay({
  videoRef,
  poseData,
  enabled,
  showBbox = true,
  className = "",
}: VideoSkeletonOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!enabled || !poseData || !videoRef.current || !canvasRef.current) {
      const ctx = canvasRef.current?.getContext("2d");
      const canvas = canvasRef.current;
      if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    const videoEl = videoRef.current;
    const canvasEl = canvasRef.current;
    const ctx = canvasEl.getContext("2d");
    if (!ctx) return;

    let rafId = 0;
    const dpr = window.devicePixelRatio || 1;

    const drawFrame = () => {
      const displayWidth = Math.max(1, videoEl.clientWidth);
      const displayHeight = Math.max(1, videoEl.clientHeight);
      if (
        canvasEl.width !== Math.floor(displayWidth * dpr) ||
        canvasEl.height !== Math.floor(displayHeight * dpr)
      ) {
        canvasEl.width = Math.floor(displayWidth * dpr);
        canvasEl.height = Math.floor(displayHeight * dpr);
        canvasEl.style.width = `${displayWidth}px`;
        canvasEl.style.height = `${displayHeight}px`;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, displayWidth, displayHeight);

      const sourceWidth = videoEl.videoWidth || displayWidth;
      const sourceHeight = videoEl.videoHeight || displayHeight;
      const scale = Math.min(displayWidth / sourceWidth, displayHeight / sourceHeight);
      const fittedWidth = sourceWidth * scale;
      const fittedHeight = sourceHeight * scale;
      const offsetX = (displayWidth - fittedWidth) / 2;
      const offsetY = (displayHeight - fittedHeight) / 2;

      const bbox = isValidBbox(poseData.batsman_bbox) ? poseData.batsman_bbox : null;

      if (showBbox && bbox) {
        const bx = offsetX + (bbox.x / sourceWidth) * fittedWidth;
        const by = offsetY + (bbox.y / sourceHeight) * fittedHeight;
        const bw = (bbox.w / sourceWidth) * fittedWidth;
        const bh = (bbox.h / sourceHeight) * fittedHeight;
        ctx.strokeStyle = "rgba(250, 204, 21, 0.95)";
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(bx, by, bw, bh);
        ctx.setLineDash([]);
        ctx.font = "11px system-ui, sans-serif";
        ctx.fillStyle = "rgba(250, 204, 21, 0.95)";
        ctx.fillText("Tracked subject", bx + 4, Math.max(12, by - 4));
      }

      const frame = findNearestPoseFrame(poseData.landmarks, videoEl.currentTime);
      if (!frame) {
        rafId = window.requestAnimationFrame(drawFrame);
        return;
      }

      const mapPoint = (kp: PoseKeypoint) => ({
        x: offsetX + kp.x * fittedWidth,
        y: offsetY + kp.y * fittedHeight,
      });

      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(16, 185, 129, 0.95)";

      for (const [from, to] of POSE_CONNECTIONS) {
        const fromPoint = frame.keypoints[from];
        const toPoint = frame.keypoints[to];
        if (!fromPoint || !toPoint) continue;
        if (fromPoint.visibility < 0.2 || toPoint.visibility < 0.2) continue;
        const p1 = mapPoint(fromPoint);
        const p2 = mapPoint(toPoint);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }

      // Joint group colours for visual clarity
      const JOINT_COLOURS: Record<string, string> = {
        nose: "rgba(255, 255, 255, 0.9)", // head: white
        leftEye: "rgba(255, 255, 255, 0.7)",
        rightEye: "rgba(255, 255, 255, 0.7)",
        leftEar: "rgba(255, 255, 255, 0.7)",
        rightEar: "rgba(255, 255, 255, 0.7)",
        leftShoulder: "rgba(250, 204, 21, 0.9)", // torso: yellow
        rightShoulder: "rgba(250, 204, 21, 0.9)",
        leftHip: "rgba(250, 204, 21, 0.9)",
        rightHip: "rgba(250, 204, 21, 0.9)",
        leftElbow: "rgba(251, 146, 60, 0.95)", // arms: orange
        rightElbow: "rgba(251, 146, 60, 0.95)",
        leftWrist: "rgba(251, 146, 60, 0.95)",
        rightWrist: "rgba(251, 146, 60, 0.95)",
      };
      const DEFAULT_JOINT_COLOUR = "rgba(34, 211, 238, 0.85)"; // legs/feet: cyan

      Object.entries(frame.keypoints).forEach(([name, kp]) => {
        if (kp.visibility < 0.25) return;
        const p = mapPoint(kp);
        const radius = name === "leftWrist" || name === "rightWrist" ? 5 : 3.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = JOINT_COLOURS[name] ?? DEFAULT_JOINT_COLOUR;
        ctx.fill();
      });

      // Draw wrist velocity vectors (orange arrows showing direction of wrist movement)
      const WRIST_JOINTS = ["leftWrist", "rightWrist"] as const;
      const nextFrame = findNearestPoseFrame(poseData.landmarks, videoEl.currentTime + 0.15);
      if (nextFrame) {
        for (const joint of WRIST_JOINTS) {
          const currKp = frame.keypoints[joint];
          const nextKp = nextFrame.keypoints[joint];
          if (!currKp || !nextKp) continue;
          if (currKp.visibility < 0.25 || nextKp.visibility < 0.25) continue;

          const p1 = mapPoint(currKp);
          const p2 = mapPoint(nextKp);
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const magnitude = Math.sqrt(dx * dx + dy * dy);

          // Only draw if there is meaningful movement (> 3px)
          if (magnitude < 3) continue;

          const angle = Math.atan2(dy, dx);
          // Scale arrow — amplify small movements for visibility, cap very large ones
          const displayLen = Math.min(40, Math.max(12, magnitude * 2.5));
          const arrowX = p1.x + Math.cos(angle) * displayLen;
          const arrowY = p1.y + Math.sin(angle) * displayLen;

          ctx.save();
          ctx.strokeStyle = "rgba(251, 146, 60, 0.95)"; // orange
          ctx.fillStyle = "rgba(251, 146, 60, 0.95)";
          ctx.lineWidth = 2.5;

          // Arrow shaft
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(arrowX, arrowY);
          ctx.stroke();

          // Arrowhead
          const headLen = 8;
          ctx.beginPath();
          ctx.moveTo(arrowX, arrowY);
          ctx.lineTo(
            arrowX - headLen * Math.cos(angle - 0.45),
            arrowY - headLen * Math.sin(angle - 0.45)
          );
          ctx.lineTo(
            arrowX - headLen * Math.cos(angle + 0.45),
            arrowY - headLen * Math.sin(angle + 0.45)
          );
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      }

      // Confidence and frame info HUD
      ctx.save();
      ctx.font = "11px system-ui, monospace, sans-serif";
      ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
      ctx.fillRect(4, displayHeight - 28, 180, 22);
      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      ctx.fillText(
        `pose conf: ${(frame.poseConfidence * 100).toFixed(0)}%  frame: ${frame.frameIndex}  t: ${frame.timestamp.toFixed(2)}s`,
        8,
        displayHeight - 12
      );
      ctx.restore();

      rafId = window.requestAnimationFrame(drawFrame);
    };

    rafId = window.requestAnimationFrame(drawFrame);
    return () => {
      window.cancelAnimationFrame(rafId);
      ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    };
  }, [enabled, poseData, showBbox, videoRef]);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none absolute inset-0 transition-opacity ${
        enabled ? "opacity-100" : "opacity-0"
      } ${className}`}
      aria-hidden="true"
    />
  );
}

export function useOverlayStatusText(
  enabled: boolean,
  isLoading: boolean,
  error: string | null,
  poseData: PoseEstimateResponse | null
): string | null {
  return useMemo(() => {
    if (!enabled) return null;
    if (isLoading) return "Loading pose overlay…";
    if (error) return error;
    if (!poseData || poseData.landmarks.length === 0) {
      return "Pose overlay unavailable — foreground coach/bowler was masked; distant batter too small to track.";
    }
    return `Pose overlay: ${poseData.landmarks.length} frames`;
  }, [enabled, isLoading, error, poseData]);
}
