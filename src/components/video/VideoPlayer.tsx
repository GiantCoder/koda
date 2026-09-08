"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";

interface VideoPlayerProps {
  src: string;
}

export interface VideoPlayerHandle {
  seekTo: (seconds: number) => void;
  getCurrentTime: () => number;
}

const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(function VideoPlayer(
  { src },
  ref
) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useImperativeHandle(ref, () => ({
    seekTo(seconds: number) {
      if (videoRef.current) {
        videoRef.current.currentTime = Math.max(0, seconds);
      }
    },
    getCurrentTime() {
      return videoRef.current?.currentTime ?? 0;
    },
  }));

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-800 bg-black">
      <video ref={videoRef} src={src} controls className="aspect-video w-full" />
    </div>
  );
});

export default VideoPlayer;
