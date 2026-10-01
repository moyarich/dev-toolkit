import type { Meta, StoryObj } from "@storybook/web-components";
import "./cursor-overlay-element.ts";

const meta = {
  title: "Web Components/Cursor Overlay",
  component: "moyarich-cursor-overlay",
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
  render: () => {
    const wrapper = document.createElement("div");
    wrapper.style.minHeight = "320px";
    wrapper.style.padding = "2rem";
    wrapper.innerHTML =
      "<p>Move and click the pointer inside the story canvas.</p>";

    const element = document.createElement("moyarich-cursor-overlay");
    wrapper.append(element);
    return wrapper;
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
