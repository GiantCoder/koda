import type { Meta, StoryObj } from "@storybook/react";
import PlayerCardDisplay from "./PlayerCardDisplay";
import type { PlayerCardDto } from "@/types/player-card";

const baseCard: PlayerCardDto = {
  id: "card_1",
  userId: "user_1",
  displayName: "HARRISON",
  tier: "BRONZE",
  role: "BAT",
  sportIcon: "BAT_ICON",
  statTec: 67,
  statPow: 63,
  statTim: 72,
  statCon: 66,
  statPac: 58,
  statFie: 61,
  profilePhotoUrl: null,
  backgroundUrl: null,
  backgroundMode: "DEFAULT",
  overall: 65,
};

const meta: Meta<typeof PlayerCardDisplay> = {
  title: "Player Card/PlayerCardDisplay",
  component: PlayerCardDisplay,
  parameters: {
    layout: "centered",
  },
};

export default meta;
type Story = StoryObj<typeof PlayerCardDisplay>;

export const BronzeNoPhoto: Story = {
  args: {
    card: baseCard,
    aiBgCss: null,
  },
};

export const GoldWithPhoto: Story = {
  args: {
    card: {
      ...baseCard,
      tier: "GOLD",
      profilePhotoUrl: "https://images.unsplash.com/photo-1521417531039-9f5f2e1f71f0?w=1200&q=80",
      overall: 82,
    },
    aiBgCss: null,
  },
};

export const EliteAiBg: Story = {
  args: {
    card: {
      ...baseCard,
      tier: "ELITE",
      role: "ALL",
      sportIcon: "GLOVES_ICON",
      backgroundMode: "AI",
      overall: 91,
    },
    aiBgCss:
      "radial-gradient(circle at 20% 30%, rgba(125,249,255,0.35), transparent 50%), linear-gradient(155deg, #060b1a 0%, #0c1f38 45%, #081b14 100%)",
  },
};
