import type { CardTier } from "@prisma/client";

export interface TierTheme {
  label: string;
  border: string;
  overlay: string;
  defaultBg: string;
  accent: string;
  glow: string;
  text: string;
}

export const TIER_THEMES: Record<CardTier, TierTheme> = {
  BRONZE: {
    label: "Bronze",
    border: "linear-gradient(135deg,#cd7f32,#8b4513,#cd7f32,#a0522d,#cd7f32)",
    overlay:
      "linear-gradient(180deg,rgba(61,31,0,0.45) 0%,rgba(92,46,5,0.75) 55%,rgba(20,8,0,0.97) 100%)",
    defaultBg: "linear-gradient(160deg,#3d1f00 0%,#7a4010 40%,#5c2e05 100%)",
    accent: "#cd7f32",
    glow: "rgba(205,127,50,0.55)",
    text: "#f5deb3",
  },
  SILVER: {
    label: "Silver",
    border: "linear-gradient(135deg,#e8e8e8,#888,#e8e8e8,#aaa,#c0c0c0)",
    overlay:
      "linear-gradient(180deg,rgba(26,26,46,0.4) 0%,rgba(40,40,70,0.78) 58%,rgba(10,10,22,0.97) 100%)",
    defaultBg: "linear-gradient(160deg,#1a1a2e 0%,#3a3a5c 40%,#252540 100%)",
    accent: "#c0c0c0",
    glow: "rgba(192,192,192,0.45)",
    text: "#e8e8ff",
  },
  GOLD: {
    label: "Gold",
    border: "linear-gradient(135deg,#ffd700,#b8860b,#ffd700,#daa520,#ffd700)",
    overlay:
      "linear-gradient(180deg,rgba(13,43,13,0.38) 0%,rgba(26,92,26,0.72) 55%,rgba(5,18,5,0.97) 100%)",
    defaultBg: "linear-gradient(160deg,#0d2b0d 0%,#1a5c1a 40%,#0f3d0f 100%)",
    accent: "#ffd700",
    glow: "rgba(255,215,0,0.5)",
    text: "#fff8dc",
  },
  ELITE: {
    label: "Elite ◆",
    border: "linear-gradient(135deg,#b9f2ff,#7df9ff,#ffffff,#00bfff,#b9f2ff)",
    overlay:
      "linear-gradient(180deg,rgba(10,10,26,0.35) 0%,rgba(26,10,58,0.7) 55%,rgba(4,4,18,0.97) 100%)",
    defaultBg: "linear-gradient(160deg,#0a0a1a 0%,#1a0a3a 30%,#0d1a35 60%,#0a1a0a 100%)",
    accent: "#7df9ff",
    glow: "rgba(125,249,255,0.55)",
    text: "#e0f7ff",
  },
};
