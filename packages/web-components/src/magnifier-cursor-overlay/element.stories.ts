import type { Meta, StoryObj } from "@storybook/web-components";
import "./element.ts";

const meta = {
  title: "Web Components/Magnifier Cursor Overlay",
  component: "moyarich-magnifier-cursor-overlay",
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
  render: () => {
    const wrapper = document.createElement("div");
    wrapper.style.minHeight = "420px";
    wrapper.style.padding = "3rem";
    wrapper.innerHTML = `
      <h2>Magnifier target</h2>
      <p>Move the pointer over this content to inspect the magnifier overlay.</p>
      <button type="button">Example button</button>
      <input value="Editable value" aria-label="Example input" />
    `;

    const element = document.createElement("moyarich-magnifier-cursor-overlay");
    wrapper.append(element);
    return wrapper;
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
