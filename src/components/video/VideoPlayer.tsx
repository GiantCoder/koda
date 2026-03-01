"use client";

import { useRef } from "react";

interface VideoPlayerProps {
  src: string;
}

export default function VideoPlayer({ src }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-800 bg-black">
      <video ref={videoRef} src={src} controls className="aspect-video w-full" />
    </div>
  );
}
