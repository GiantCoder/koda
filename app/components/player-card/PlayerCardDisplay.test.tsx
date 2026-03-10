import { render, screen } from "@testing-library/react";
import PlayerCardDisplay from "./PlayerCardDisplay";
import type { PlayerCardDto } from "@/types/player-card";

const baseCard: PlayerCardDto = {
  id: "card_1",
  userId: "2298d34b-321a-4200-af3e-0159dd1594ec",
  displayName: "HARRISON",
  tier: "GOLD",
  role: "BAT",
  sportIcon: "BAT_ICON",
  statTec: 87,
  statPow: 82,
  statTim: 91,
  statCon: 79,
  statPac: 85,
  statFie: 88,
  profilePhotoUrl: null,
  backgroundUrl: null,
  backgroundMode: "DEFAULT",
  overall: 85,
};

describe("PlayerCardDisplay", () => {
  it("renders player name", () => {
    render(<PlayerCardDisplay card={baseCard} aiBgCss={null} interactive={false} />);
    expect(screen.getByText("HARRISON")).toBeInTheDocument();
  });

  it("renders correct overall score", () => {
    render(<PlayerCardDisplay card={baseCard} aiBgCss={null} interactive={false} />);
    expect(screen.getByText("85")).toBeInTheDocument();
  });

  it("renders tier accent colour for gold", () => {
    render(<PlayerCardDisplay card={baseCard} aiBgCss={null} interactive={false} />);
    const scoreElement = screen.getByText("85");
    expect(scoreElement).toHaveStyle({ color: "#ffd700" });
  });

  it("shows sport icon when no profile photo", () => {
    render(<PlayerCardDisplay card={baseCard} aiBgCss={null} interactive={false} />);
    expect(screen.getByText("🏏")).toBeInTheDocument();
  });

  it("hides sport icon when profile photo is provided", () => {
    render(
      <PlayerCardDisplay
        card={{ ...baseCard, profilePhotoUrl: "https://example.com/photo.jpg" }}
        aiBgCss={null}
        interactive={false}
      />
    );
    expect(screen.queryByText("🏏")).not.toBeInTheDocument();
  });
});
