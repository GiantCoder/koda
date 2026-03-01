import type { Meta, StoryObj } from "@storybook/react";
import VideoUpload from "./VideoUpload";

const meta: Meta<typeof VideoUpload> = {
  title: "Video/VideoUpload",
  component: VideoUpload,
};

export default meta;
type Story = StoryObj<typeof VideoUpload>;

export const Light: Story = {};
export const Dark: Story = { parameters: { backgrounds: { default: "dark" } } };
