import type { Meta, StoryObj } from "@storybook/react";
import Stepper from "./Stepper";

const meta: Meta<typeof Stepper> = {
  title: "Onboarding/Stepper",
  component: Stepper,
  args: { currentStep: 2 },
};

export default meta;
type Story = StoryObj<typeof Stepper>;

export const Light: Story = {};
export const Dark: Story = { parameters: { backgrounds: { default: "dark" } } };
