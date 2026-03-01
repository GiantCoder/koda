import type { Meta, StoryObj } from "@storybook/react";
import TagStrip from "./TagStrip";

const meta: Meta<typeof TagStrip> = {
  title: "Analysis/TagStrip",
  component: TagStrip,
  args: {
    tags: [
      { label: "Balance", kind: "strength" },
      { label: "Backlift timing", kind: "improvement" },
      { label: "Match context", kind: "neutral" },
    ],
  },
};

export default meta;
type Story = StoryObj<typeof TagStrip>;

export const Light: Story = {};
export const Dark: Story = { parameters: { backgrounds: { default: "dark" } } };
