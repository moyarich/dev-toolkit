import { confirm } from "@inquirer/prompts";

const shouldPublish = await confirm({
  message: "Publish Extension to the VS Code Marketplace?",
  default: false,
});

if (!shouldPublish) {
  console.log("Marketplace publication cancelled.");
  process.exitCode = 1;
}
