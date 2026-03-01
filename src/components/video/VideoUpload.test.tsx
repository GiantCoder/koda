import { fireEvent, render, screen } from "@testing-library/react";
import VideoUpload from "./VideoUpload";

describe("VideoUpload", () => {
  it("shows validation error for invalid file type", () => {
    const { container } = render(<VideoUpload />);
    const input = container.querySelector("input[type='file']") as HTMLInputElement;
    const file = new File(["hello"], "test.txt", { type: "text/plain" });
    fireEvent.change(input, { target: { files: [file] } });
    expect(screen.getByText("Unsupported file format.")).toBeInTheDocument();
  });
});
