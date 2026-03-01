import type { Meta, StoryObj } from "@storybook/react";

function CardPreview() {
  return <div className="rounded-xl border border-neutral-300 p-4">Card content</div>;
}

const meta: Meta<typeof CardPreview> = {
  title: "UI/Card",
  component: CardPreview,
};

export default meta;
type Story = StoryObj<typeof CardPreview>;

export const Light: Story = {};
export const Dark: Story = { parameters: { backgrounds: { default: "dark" } } };
