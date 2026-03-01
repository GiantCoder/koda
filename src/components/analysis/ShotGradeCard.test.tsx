import { render, screen } from "@testing-library/react";
import ShotGradeCard from "./ShotGradeCard";

describe("ShotGradeCard", () => {
  it("renders grade and score", () => {
    render(<ShotGradeCard grade="A" score={91} />);
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("91")).toBeInTheDocument();
  });
});
