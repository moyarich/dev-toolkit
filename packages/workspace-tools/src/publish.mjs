import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { packageInfo, repositoryRoot, run } from "./workspace.mjs";

function registryConfig(registry) {
  switch (registry) {
    case "github":
      return { url: "https://npm.pkg.github.com", host: "npm.pkg.github.com", token: process.env._GITHUB_TOKEN || process.env.NODE_AUTH_TOKEN };
    case "npm":
      return { url: "https://registry.npmjs.org", host: "registry.npmjs.org", token: process.env._NPM_TOKEN || process.env.NODE_AUTH_TOKEN };
    default:
      throw new Error("Registry must be github or npm.");
  }
}

function validate(root, pkg) {
  for (const script of ["typecheck", "test", "build"]) {
    run("npm", ["run", script, "--workspace", pkg.manifest.name, "--if-present"], { cwd: root });
  }
  run("npm", ["pack", "--workspace", pkg.manifest.name, "--dry-run"], { cwd: root });
}

export function publish({ selector, registry = "github", tag = "latest", access = "public", dryRun = false }) {
  if (!selector) throw new Error("A package selector is required.");
  if (!/^[A-Za-z][A-Za-z0-9._-]*$/.test(tag)) throw new Error("Invalid npm distribution tag.");
  if (!["public", "restricted"].includes(access)) throw new Error("Access must be public or restricted.");

  const root = repositoryRoot();
  const pkg = packageInfo(root, selector);
  validate(root, pkg);
  if (dryRun) {
    console.log(`\nRelease checks passed for ${pkg.manifest.name}. Nothing was published.`);
    return;
  }

  const config = registryConfig(registry);
  if (!config.token) throw new Error(registry === "github" ? "Set _GITHUB_TOKEN before publishing." : "Set _NPM_TOKEN before staging a release.");

  const dir = mkdtempSync(join(tmpdir(), "workspace-publish-"));
  const npmrc = join(dir, "npmrc");
  writeFileSync(npmrc, `registry=${config.url}\n@moyarich:registry=${config.url}\n//${config.host}/:_authToken=\${NODE_AUTH_TOKEN}\n`);

  const env = { ...process.env, NODE_AUTH_TOKEN: config.token, npm_config_userconfig: npmrc };
  try {
    if (registry === "github") {
      run("npm", ["publish", "--workspace", pkg.manifest.name, "--access", access, "--tag", tag], { cwd: root, env });
    } else {
      run("npm", ["stage", "publish", "--access", access, "--tag", tag], { cwd: resolve(root, pkg.directory), env });
      console.log(`Staged ${pkg.manifest.name}@${pkg.manifest.version} on npmjs.org. Approve the staged release with 2FA before it becomes public.`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
