import type { Meta, StoryObj } from "@storybook/react";
import TechniqueRadarChart from "./TechniqueRadarChart";

const meta: Meta<typeof TechniqueRadarChart> = {
  title: "Analysis/TechniqueRadarChart",
  component: TechniqueRadarChart,
  args: {
    points: [
      { label: "Balance", value: 82 },
      { label: "Timing", value: 76 },
      { label: "Footwork", value: 68 },
      { label: "Head Position", value: 79 },
    ],
  },
};

export default meta;
type Story = StoryObj<typeof TechniqueRadarChart>;

export const Light: Story = {};
export const Dark: Story = { parameters: { backgrounds: { default: "dark" } } };
