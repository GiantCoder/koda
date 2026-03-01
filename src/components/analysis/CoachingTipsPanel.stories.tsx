import type { Meta, StoryObj } from "@storybook/react";
import CoachingTipsPanel from "./CoachingTipsPanel";

const meta: Meta<typeof CoachingTipsPanel> = {
  title: "Analysis/CoachingTipsPanel",
  component: CoachingTipsPanel,
  args: {
    tips: [
      { type: "strength", title: "Stable head", description: "Great head alignment at release." },
      { type: "improvement", title: "Front foot", description: "Land slightly earlier for balance." },
    ],
  },
};

export default meta;
type Story = StoryObj<typeof CoachingTipsPanel>;

export const Light: Story = {};
export const Dark: Story = { parameters: { backgrounds: { default: "dark" } } };
