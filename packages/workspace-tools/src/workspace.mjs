import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";

export function run(command, args, options = {}) {
  return execFileSync(command, args, { stdio: "inherit", ...options });
}

export function output(command, args, options = {}) {
  return execFileSync(command, args, { encoding: "utf8", ...options }).trim();
}

export function packageInfo(root, selector) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(selector)) {
    throw new Error("Package selector must be a package directory name under packages/.");
  }
  const directory = `packages/${selector}`;
  const file = resolve(root, directory, "package.json");
  if (!existsSync(file)) throw new Error(`Package not found: ${directory}`);
  const manifest = JSON.parse(readFileSync(file, "utf8"));
  if (!manifest.name) throw new Error(`${directory}/package.json is missing a package name.`);
  return { directory, file, manifest };
}

export function repositoryRoot() {
  return output("git", ["rev-parse", "--show-toplevel"]);
}
