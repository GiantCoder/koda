import type { Meta, StoryObj } from "@storybook/react";
import React, { useEffect, useState } from "react";
import FrameGallery, { type GalleryAnnotation } from "./FrameGallery";

const ANALYSIS_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

const mockFrames = [
  { index: 0, timestampMs: 0, url: "https://placehold.co/112x80/1a1a1a/fff?text=0%3A00" },
  { index: 1, timestampMs: 1000, url: "https://placehold.co/112x80/1a1a1a/fff?text=0%3A01" },
  { index: 2, timestampMs: 2000, url: "https://placehold.co/112x80/1a1a1a/fff?text=0%3A02" },
  { index: 3, timestampMs: 3000, url: "https://placehold.co/112x80/1a1a1a/fff?text=0%3A03" },
];

const mockAnnotations: GalleryAnnotation[] = [
  { id: "a1", timestampMs: 2050, content: "Good head position" },
];

function installFetchMock(mode: "ready" | "loading" | "empty") {
  const original = globalThis.fetch;
  globalThis.fetch = ((input: RequestInfo | URL) => {
    const url = String(input);
    if (!url.includes("/frames")) {
      return original(input);
    }
    if (mode === "loading") {
      return new Promise<Response>(() => {
        /* never resolves */
      });
    }
    if (mode === "empty") {
      return Promise.resolve(
        new Response(
          JSON.stringify({ error: "Frame gallery unavailable for this analysis" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        )
      );
    }
    return Promise.resolve(
      new Response(JSON.stringify({ analysisId: ANALYSIS_ID, frames: mockFrames }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
  }) as typeof fetch;
  return () => {
    globalThis.fetch = original;
  };
}

function GalleryDemo({
  mode,
  annotations = [],
}: {
  mode: "ready" | "loading" | "empty";
  annotations?: GalleryAnnotation[];
}) {
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => installFetchMock(mode), [mode]);

  return (
    <div className="max-w-2xl p-4">
      <FrameGallery
        analysisId={ANALYSIS_ID}
        annotations={annotations}
        onFrameSelect={(ts) => setSelected(ts)}
      />
      {selected != null ? (
        <p className="mt-2 text-xs text-neutral-500">Selected: {selected}ms</p>
      ) : null}
    </div>
  );
}

const meta: Meta<typeof FrameGallery> = {
  title: "Analysis/FrameGallery",
  component: FrameGallery,
};

export default meta;
type Story = StoryObj<typeof FrameGallery>;

export const Loaded: Story = {
  render: () => <GalleryDemo mode="ready" annotations={mockAnnotations} />,
};

export const Loading: Story = {
  render: () => <GalleryDemo mode="loading" />,
};

export const Unavailable: Story = {
  render: () => <GalleryDemo mode="empty" />,
};
