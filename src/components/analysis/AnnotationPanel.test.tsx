import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AnnotationPanel, { type Annotation } from "./AnnotationPanel";

const annotations: Annotation[] = [
  { id: "1", timestampMs: 3000, content: "Later note" },
  { id: "2", timestampMs: 1000, content: "Earlier note", isPrivate: true },
];

describe("AnnotationPanel", () => {
  it("lists annotations sorted by timestamp", () => {
    render(
      <AnnotationPanel
        annotations={annotations}
        role="player"
        selectedTimestampMs={null}
        onSubmit={vi.fn()}
      />
    );

    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Earlier note");
    expect(items[1]).toHaveTextContent("Later note");
  });

  it("does not render the add-comment form for non-coach roles", () => {
    render(
      <AnnotationPanel
        annotations={annotations}
        role="player"
        selectedTimestampMs={null}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.queryByTestId("annotation-submit")).not.toBeInTheDocument();
    expect(screen.queryByTestId("annotation-content")).not.toBeInTheDocument();
  });

  it("renders the form for coaches and pins the selected frame timestamp", () => {
    render(
      <AnnotationPanel
        annotations={[]}
        role="coach"
        selectedTimestampMs={3000}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.getByText("Commenting on 0:03")).toBeInTheDocument();
    expect(screen.getByTestId("annotation-submit")).toBeInTheDocument();
  });

  it("calls onSubmit with the right payload and clears the form", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <AnnotationPanel
        annotations={[]}
        role="coach"
        selectedTimestampMs={1500}
        onSubmit={onSubmit}
      />
    );

    fireEvent.change(screen.getByTestId("annotation-content"), {
      target: { value: "Watch the front foot" },
    });
    fireEvent.click(screen.getByTestId("annotation-private"));
    fireEvent.click(screen.getByTestId("annotation-submit"));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        timestampMs: 1500,
        content: "Watch the front foot",
        isPrivate: true,
      });
    });

    expect(screen.getByTestId("annotation-content")).toHaveValue("");
    expect(screen.getByTestId("annotation-private")).not.toBeChecked();
  });

  it("uses getCurrentPlaybackMs when no frame is selected and no manual timestamp", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <AnnotationPanel
        annotations={[]}
        role="coach"
        selectedTimestampMs={null}
        getCurrentPlaybackMs={() => 4200}
        onSubmit={onSubmit}
      />
    );

    fireEvent.change(screen.getByTestId("annotation-content"), {
      target: { value: "At current playhead" },
    });
    fireEvent.click(screen.getByTestId("annotation-submit"));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        timestampMs: 4200,
        content: "At current playhead",
        isPrivate: false,
      });
    });
  });
});
