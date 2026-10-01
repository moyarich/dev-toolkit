import type { DemoStrategy } from "@moyarich/demo-tools";

const strategy = {
  name: "hello",
  description: "Minimal directly executable demo strategy.",
  tags: ["playground"],
  async run({ id, strategyDirectory, artifactsDirectory }) {
    console.log({ id, strategyDirectory, artifactsDirectory });
  },
} satisfies DemoStrategy<void>;

export default strategy;
