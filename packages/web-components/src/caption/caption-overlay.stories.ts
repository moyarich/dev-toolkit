import type { Meta, StoryObj } from "@storybook/web-components";
import "./caption-overlay.ts";

const meta = {
  title: "Web Components/Caption Overlay",
  component: "moyarich-caption-overlay",
  tags: ["autodocs"],
  render: ({ title, description, pointer, visible }) => {
    const element = document.createElement("moyarich-caption-overlay");
    element.caption = {
      title,
      description,
      pointer,
      visible,
    };
    return element;
  },
  args: {
    title: "Caption title",
    description: "Supporting caption text.",
    pointer: "bubble",
    visible: true,
  },
  argTypes: {
    pointer: {
      control: "select",
      options: ["bubble", "arrow"],
    },
  },
} satisfies Meta<{
  title: string;
  description: string;
  pointer: "bubble" | "arrow";
  visible: boolean;
}>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Arrow: Story = {
  args: {
    pointer: "arrow",
  },
};
