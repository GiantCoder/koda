import type { Meta, StoryObj } from "@storybook/react";
import ShotGradeCard from "./ShotGradeCard";

const meta: Meta<typeof ShotGradeCard> = {
  title: "Analysis/ShotGradeCard",
  component: ShotGradeCard,
  args: {
    grade: "A",
    score: 90,
  },
};

export default meta;
type Story = StoryObj<typeof ShotGradeCard>;

export const Light: Story = {};
export const Dark: Story = { parameters: { backgrounds: { default: "dark" } } };
