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

/** Distinct joint colours — used by the overlay and the on-screen key. */
export const JOINT_STYLE = {
  head: { color: "rgba(255, 255, 255, 0.95)", label: "head" },
  shoulders: { color: "rgba(250, 204, 21, 0.95)", label: "shoulders" },
  elbows: { color: "rgba(251, 146, 60, 0.95)", label: "elbows" },
  wrists: { color: "rgba(244, 63, 94, 0.95)", label: "wrists" },
  hips: { color: "rgba(168, 85, 247, 0.95)", label: "hips" },
  knees: { color: "rgba(34, 211, 238, 0.95)", label: "knees" },
  ankles: { color: "rgba(52, 211, 153, 0.95)", label: "ankles" },
} as const;

export const JOINT_LEGEND = [
  JOINT_STYLE.head,
  JOINT_STYLE.shoulders,
  JOINT_STYLE.elbows,
  JOINT_STYLE.wrists,
  JOINT_STYLE.hips,
  JOINT_STYLE.knees,
  JOINT_STYLE.ankles,
] as const;

const JOINT_COLOUR_BY_NAME: Record<string, string> = {
  nose: JOINT_STYLE.head.color,
  leftEye: JOINT_STYLE.head.color,
  rightEye: JOINT_STYLE.head.color,
  leftEar: JOINT_STYLE.head.color,
  rightEar: JOINT_STYLE.head.color,
  leftShoulder: JOINT_STYLE.shoulders.color,
  rightShoulder: JOINT_STYLE.shoulders.color,
  leftElbow: JOINT_STYLE.elbows.color,
  rightElbow: JOINT_STYLE.elbows.color,
  leftWrist: JOINT_STYLE.wrists.color,
  rightWrist: JOINT_STYLE.wrists.color,
  leftHip: JOINT_STYLE.hips.color,
  rightHip: JOINT_STYLE.hips.color,
  leftKnee: JOINT_STYLE.knees.color,
  rightKnee: JOINT_STYLE.knees.color,
  leftAnkle: JOINT_STYLE.ankles.color,
  rightAnkle: JOINT_STYLE.ankles.color,
};

const JOINT_RADIUS = 2.25;
const WRIST_RADIUS = 2.75;

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

/**
 * Build a normalized (0–1) bbox from the current frame's visible landmarks.
 * Prefer this over the clip-level `batsman_bbox`, which is a single static box
 * (and historically last-MediaPipe-batch-wins) that drifts away from early frames.
 */
export function bboxFromFrameLandmarks(
  frame: FrameLandmarks,
  paddingRatio = 0.12
): { x: number; y: number; w: number; h: number } | null {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const kp of Object.values(frame.keypoints)) {
    if (kp.visibility < 0.2) continue;
    if (!Number.isFinite(kp.x) || !Number.isFinite(kp.y)) continue;
    xs.push(kp.x);
    ys.push(kp.y);
  }
  if (xs.length === 0) return null;

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const padX = Math.max(0.01, (maxX - minX) * paddingRatio);
  const padY = Math.max(0.01, (maxY - minY) * paddingRatio);
  const x = Math.max(0, minX - padX);
  const y = Math.max(0, minY - padY);
  const w = Math.min(1 - x, maxX - minX + 2 * padX);
  const h = Math.min(1 - y, maxY - minY + 2 * padY);
  if (w <= 0 || h <= 0) return null;
  return { x, y, w, h };
}

/**
 * CSS content box of an object-fit:contain video, relative to its offsetParent.
 * Aligning the canvas to this box (instead of inset-0 + manual offsets) avoids
 * systematic drift when the canvas display size fights absolute inset styles.
 */
function getContainedVideoContentBox(videoEl: HTMLVideoElement): {
  left: number;
  top: number;
  width: number;
  height: number;
} | null {
  const sourceWidth = videoEl.videoWidth;
  const sourceHeight = videoEl.videoHeight;
  if (!sourceWidth || !sourceHeight) return null;

  const clientWidth = Math.max(1, videoEl.clientWidth);
  const clientHeight = Math.max(1, videoEl.clientHeight);
  const scale = Math.min(clientWidth / sourceWidth, clientHeight / sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  const left = videoEl.offsetLeft + (clientWidth - width) / 2;
  const top = videoEl.offsetTop + (clientHeight - height) / 2;
  return { left, top, width, height };
}

interface VideoSkeletonOverlayProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  poseData: PoseEstimateResponse | null;
  enabled: boolean;
  /** When true with an active overlay, paint the current video frame under skeleton/bbox. */
  showVideo?: boolean;
  showSkeleton?: boolean;
  showBbox?: boolean;
  className?: string;
}

export function VideoSkeletonOverlay({
  videoRef,
  poseData,
  enabled,
  showVideo = true,
  showSkeleton = true,
  showBbox = true,
  className = "",
}: VideoSkeletonOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Canvas must run whenever video is hidden (mask the element) or pose layers are on.
  const overlayActive = enabled && (showSkeleton || showBbox || !showVideo);

  useEffect(() => {
    if (!overlayActive || !videoRef.current || !canvasRef.current) {
      const ctx = canvasRef.current?.getContext("2d", { alpha: true });
      const canvas = canvasRef.current;
      if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    const videoEl = videoRef.current;
    const canvasEl = canvasRef.current;
    const ctx = canvasEl.getContext("2d", { alpha: true });
    if (!ctx) return;
    canvasEl.style.backgroundColor = "transparent";

    let rafId = 0;
    const dpr = window.devicePixelRatio || 1;

    const drawFrame = () => {
      const box = getContainedVideoContentBox(videoEl);
      if (!box) {
        rafId = window.requestAnimationFrame(drawFrame);
        return;
      }

      const { left, top, width: contentWidth, height: contentHeight } = box;
      const bufW = Math.max(1, Math.floor(contentWidth * dpr));
      const bufH = Math.max(1, Math.floor(contentHeight * dpr));

      if (canvasEl.width !== bufW || canvasEl.height !== bufH) {
        canvasEl.width = bufW;
        canvasEl.height = bufH;
      }
      canvasEl.style.left = `${left}px`;
      canvasEl.style.top = `${top}px`;
      canvasEl.style.width = `${contentWidth}px`;
      canvasEl.style.height = `${contentHeight}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, contentWidth, contentHeight);

      // Composite the video onto the canvas so pose layers never obscure it with an
      // opaque canvas backing store. When Video is off, fill black instead.
      if (showVideo && videoEl.readyState >= 2) {
        try {
          ctx.drawImage(videoEl, 0, 0, contentWidth, contentHeight);
        } catch {
          // drawImage can throw if the frame isn't available yet
        }
      } else if (!showVideo) {
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, contentWidth, contentHeight);
      }

      const frame =
        poseData && (showSkeleton || showBbox)
          ? findNearestPoseFrame(poseData.landmarks, videoEl.currentTime)
          : null;
      if (!frame) {
        rafId = window.requestAnimationFrame(drawFrame);
        return;
      }

      const mapPoint = (kp: PoseKeypoint) => ({
        x: kp.x * contentWidth,
        y: kp.y * contentHeight,
      });

      const normalizedBbox = showBbox ? bboxFromFrameLandmarks(frame) : null;
      const legacyPixelBbox =
        showBbox && !normalizedBbox && isValidBbox(poseData?.batsman_bbox)
          ? poseData.batsman_bbox
          : null;

      if (normalizedBbox) {
        const bx = normalizedBbox.x * contentWidth;
        const by = normalizedBbox.y * contentHeight;
        const bw = normalizedBbox.w * contentWidth;
        const bh = normalizedBbox.h * contentHeight;
        ctx.strokeStyle = "rgba(250, 204, 21, 0.95)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(bx, by, bw, bh);
        ctx.setLineDash([]);
        ctx.font = "11px system-ui, sans-serif";
        ctx.fillStyle = "rgba(250, 204, 21, 0.95)";
        ctx.fillText("Tracked subject", bx + 4, Math.max(12, by - 4));
      } else if (legacyPixelBbox) {
        const sourceWidth = videoEl.videoWidth || contentWidth;
        const sourceHeight = videoEl.videoHeight || contentHeight;
        const bx = (legacyPixelBbox.x / sourceWidth) * contentWidth;
        const by = (legacyPixelBbox.y / sourceHeight) * contentHeight;
        const bw = (legacyPixelBbox.w / sourceWidth) * contentWidth;
        const bh = (legacyPixelBbox.h / sourceHeight) * contentHeight;
        ctx.strokeStyle = "rgba(250, 204, 21, 0.95)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(bx, by, bw, bh);
        ctx.setLineDash([]);
        ctx.font = "11px system-ui, sans-serif";
        ctx.fillStyle = "rgba(250, 204, 21, 0.95)";
        ctx.fillText("Tracked subject", bx + 4, Math.max(12, by - 4));
      }

      if (showSkeleton) {
        ctx.lineWidth = 1.75;
        ctx.strokeStyle = "rgba(16, 185, 129, 0.9)";

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

        Object.entries(frame.keypoints).forEach(([name, kp]) => {
          if (kp.visibility < 0.25) return;
          const p = mapPoint(kp);
          const radius =
            name === "leftWrist" || name === "rightWrist" ? WRIST_RADIUS : JOINT_RADIUS;
          ctx.beginPath();
          ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
          ctx.fillStyle = JOINT_COLOUR_BY_NAME[name] ?? JOINT_STYLE.knees.color;
          ctx.fill();
        });

        // Wrist velocity vectors
        const WRIST_JOINTS = ["leftWrist", "rightWrist"] as const;
        const nextFrame = findNearestPoseFrame(
          poseData?.landmarks ?? [],
          videoEl.currentTime + 0.15
        );
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
            if (magnitude < 3) continue;

            const angle = Math.atan2(dy, dx);
            const displayLen = Math.min(36, Math.max(10, magnitude * 2.5));
            const arrowX = p1.x + Math.cos(angle) * displayLen;
            const arrowY = p1.y + Math.sin(angle) * displayLen;

            ctx.save();
            ctx.strokeStyle = JOINT_STYLE.wrists.color;
            ctx.fillStyle = JOINT_STYLE.wrists.color;
            ctx.lineWidth = 2;

            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(arrowX, arrowY);
            ctx.stroke();

            const headLen = 7;
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
      }

      if (showSkeleton || showBbox) {
        ctx.save();
        ctx.font = "10px system-ui, monospace, sans-serif";
        ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
        ctx.fillRect(4, contentHeight - 24, 170, 20);
        ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
        ctx.fillText(
          `pose conf: ${(frame.poseConfidence * 100).toFixed(0)}%  f:${frame.frameIndex}  t:${frame.timestamp.toFixed(2)}s`,
          8,
          contentHeight - 10
        );
        ctx.restore();
      }

      rafId = window.requestAnimationFrame(drawFrame);
    };

    rafId = window.requestAnimationFrame(drawFrame);
    return () => {
      window.cancelAnimationFrame(rafId);
      ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    };
  }, [overlayActive, poseData, showBbox, showSkeleton, showVideo, videoRef]);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none absolute bg-transparent transition-opacity ${
        overlayActive ? "opacity-100" : "opacity-0"
      } ${className}`}
      aria-hidden="true"
    />
  );
}

export interface OverlayLayerToggles {
  showVideo: boolean;
  showSkeleton: boolean;
  showBbox: boolean;
}

interface OverlayLayerControlsProps {
  layers: OverlayLayerToggles;
  onChange: (next: OverlayLayerToggles) => void;
  poseAvailable?: boolean;
}

/** Compact checkboxes for video / skeleton / bbox layers over the player. */
export function OverlayLayerControls({
  layers,
  onChange,
  poseAvailable = true,
}: OverlayLayerControlsProps) {
  const toggle = (key: keyof OverlayLayerToggles) => {
    onChange({ ...layers, [key]: !layers[key] });
  };

  const options: Array<{ key: keyof OverlayLayerToggles; label: string; disabled?: boolean }> = [
    { key: "showVideo", label: "Video" },
    { key: "showSkeleton", label: "Skeleton", disabled: !poseAvailable },
    { key: "showBbox", label: "Bbox", disabled: !poseAvailable },
  ];

  return (
    <div
      className="rounded-lg bg-black/60 px-3 py-2"
      role="group"
      aria-label="Overlay layers"
    >
      <ul className="flex flex-col gap-1.5">
        {options.map(({ key, label, disabled }) => (
          <li key={key}>
            <label
              className={`flex cursor-pointer items-center gap-2 text-xs text-white ${
                disabled ? "cursor-not-allowed opacity-50" : ""
              }`}
            >
              <input
                type="checkbox"
                checked={layers[key]}
                disabled={disabled}
                onChange={() => toggle(key)}
                className="h-3.5 w-3.5 rounded border-white/40 bg-transparent text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0"
              />
              <span>{label}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Compact colour key shown under the skeleton toggle when the overlay is on. */
export function SkeletonJointLegend({ className = "" }: { className?: string }) {
  return (
    <ul
      className={`flex flex-col gap-1 text-[10px] leading-tight text-white ${className}`}
      aria-label="Skeleton joint colour key"
    >
      {JOINT_LEGEND.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: item.color }}
            aria-hidden
          />
          <span>{item.label}</span>
        </li>
      ))}
    </ul>
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
