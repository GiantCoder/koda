import { render, screen } from "@testing-library/react";
import Stepper from "./Stepper";

describe("Stepper", () => {
  it("renders all four steps", () => {
    render(<Stepper currentStep={2} />);
    expect(screen.getByText("Role")).toBeInTheDocument();
    expect(screen.getByText("Verify")).toBeInTheDocument();
    expect(screen.getByText("Consent")).toBeInTheDocument();
    expect(screen.getByText("Profile")).toBeInTheDocument();
  });
});
