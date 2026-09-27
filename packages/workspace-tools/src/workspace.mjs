import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";

export function run(command, args, options = {}) {
  return execFileSync(command, args, { stdio: "inherit", ...options });
}

export function output(command, args, options = {}) {
  return execFileSync(command, args, { encoding: "utf8", ...options }).trim();
}

export function workspacePackages(root) {
  const packagesDir = resolve(root, "packages");
  if (!existsSync(packagesDir)) return [];
  return readdirSync(packagesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(resolve(packagesDir, entry.name, "package.json")))
    .map((entry) => {
      const directory = `packages/${entry.name}`;
      const file = resolve(root, directory, "package.json");
      const manifest = JSON.parse(readFileSync(file, "utf8"));
      return { directory, file, manifest };
    })
    .filter((pkg) => pkg.manifest.name);
}

export function packageInfo(root, selector) {
  const packages = workspacePackages(root);
  const normalized = selector?.replace(/^\.\//, "");
  const pkg = packages.find(({ directory, manifest }) =>
    normalized === directory ||
    normalized === directory.slice("packages/".length) ||
    normalized === manifest.name
  );
  if (!pkg) throw new Error(`Package not found: ${selector}`);
  return pkg;
}

export function repositoryRoot() {
  return output("git", ["rev-parse", "--show-toplevel"]);
}
