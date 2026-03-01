import type { Meta, StoryObj } from "@storybook/react";

function ButtonPreview({ label }: { label: string }) {
  return <button className="rounded bg-red-600 px-3 py-2 text-white">{label}</button>;
}

const meta: Meta<typeof ButtonPreview> = {
  title: "UI/Button",
  component: ButtonPreview,
  args: { label: "Primary action" },
};

export default meta;
type Story = StoryObj<typeof ButtonPreview>;

export const Light: Story = {};
export const Dark: Story = { parameters: { backgrounds: { default: "dark" } } };
