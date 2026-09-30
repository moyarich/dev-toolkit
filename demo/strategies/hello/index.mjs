import { executableDemoStrategy } from "@moyarich/demo-tools";

export default executableDemoStrategy(
  {
    name: "hello",
    description: "Minimal directly executable demo strategy.",
    tags: ["playground"],
    async run({ id, strategyDirectory, artifactsDirectory }) {
      console.log({ id, strategyDirectory, artifactsDirectory });
    },
  },
  import.meta.url,
);
