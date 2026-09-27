import { readFileSync } from "node:fs";
import { output, packageInfo, repositoryRoot, run } from "./workspace.mjs";

const VALID_BUMPS = new Set(["major","minor","patch","premajor","preminor","prepatch","prerelease"]);
const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

export function parseReleaseArgument(argument) {
  if (!argument || !argument.includes("=")) {
    throw new Error("Usage: workspace-release <package>=<version|major|minor|patch|premajor|preminor|prepatch|prerelease>");
  }

  const index = argument.indexOf("=");
  const selector = argument.slice(0, index);
  const versionSpec = argument.slice(index + 1);
  if (!VALID_BUMPS.has(versionSpec) && !SEMVER.test(versionSpec)) {
    throw new Error(`Invalid version: ${versionSpec}`);
  }

  return { selector, versionSpec };
}

export function release(argument) {
  const { selector, versionSpec } = parseReleaseArgument(argument);
  const root = repositoryRoot();
  const pkg = packageInfo(root, selector);
  if (output("git", ["status", "--porcelain"], { cwd: root })) {
    throw new Error("Working tree must be clean before creating a package release.");
  }

  run("npm", ["version", versionSpec, "--workspace", pkg.manifest.name, "--git-tag-version=false"], { cwd: root });

  const version = JSON.parse(readFileSync(pkg.file, "utf8")).version;
  const tag = `${selector}@${version}`;
  run("git", ["add", pkg.file, "package-lock.json"], { cwd: root });
  run("git", ["commit", "-m", `release: ${tag}`], { cwd: root });
  run("git", ["tag", tag], { cwd: root });

  console.log(`\nCreated release ${tag}\nPush the release commit and tag with:\n  git push --follow-tags`);
}
