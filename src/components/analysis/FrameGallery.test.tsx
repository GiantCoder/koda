import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import FrameGallery from "./FrameGallery";

const ANALYSIS_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

const mockFrames = [
  { index: 0, timestampMs: 0, url: `/api/analysis/${ANALYSIS_ID}/frames/0` },
  { index: 1, timestampMs: 1250, url: `/api/analysis/${ANALYSIS_ID}/frames/1` },
  { index: 2, timestampMs: 3000, url: `/api/analysis/${ANALYSIS_ID}/frames/2` },
];

describe("FrameGallery", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("shows skeleton thumbnails while loading", () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(
      () => new Promise(() => {
        /* pending */
      })
    );

    render(
      <FrameGallery
        analysisId={ANALYSIS_ID}
        annotations={[]}
        onFrameSelect={vi.fn()}
      />
    );

    expect(screen.getByTestId("frame-gallery-skeleton")).toBeInTheDocument();
  });

  it("renders frames and calls onFrameSelect with the frame timestamp", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ analysisId: ANALYSIS_ID, frames: mockFrames }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const onFrameSelect = vi.fn();
    render(
      <FrameGallery
        analysisId={ANALYSIS_ID}
        annotations={[{ id: "a1", timestampMs: 1200, content: "note" }]}
        onFrameSelect={onFrameSelect}
      />
    );

    const frameBtn = await screen.findByRole("option", { name: /Frame at 0:01/i });
    expect(frameBtn).toBeInTheDocument();
    // Badge for annotation within ±500ms of frame 1 (1250)
    expect(screen.getByLabelText("1 comment")).toBeInTheDocument();

    fireEvent.click(frameBtn);
    expect(onFrameSelect).toHaveBeenCalledWith(1250);
  });

  it("shows unavailable message on 404", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "Frame gallery unavailable for this analysis" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    );

    render(
      <FrameGallery
        analysisId={ANALYSIS_ID}
        annotations={[]}
        onFrameSelect={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Frame gallery isn't available for this analysis/i)
      ).toBeInTheDocument();
    });
  });
});
