import { program } from "commander";
import { confirm } from "@inquirer/prompts";

async function confirmMarketplacePublish(marketplace) {
  const shouldPublish = await confirm({
    message: `Publish extension to ${marketplace}?`,
    default: false,
  });

  if (shouldPublish) return;

  console.log(`${marketplace} publication cancelled.`);
  process.exitCode = 1;
}

program
  .name("confirm-publish")
  .description("Confirm extension publication.")
  .argument("[marketplace]", "Marketplace to publish to", "VS Code Marketplace")
  .action(confirmMarketplacePublish);

await program.parseAsync();
