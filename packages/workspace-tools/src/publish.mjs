import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { packageInfo, repositoryRoot, run, workspacePublishOrder } from "./workspace.mjs";
import { assertDependencies, dependencyCheck, printDependencyCheck } from "./dependency-check.mjs";

function registryConfig(registry) {
  switch (registry) {
    case "github":
      return { url: "https://npm.pkg.github.com", host: "npm.pkg.github.com", token: process.env._GITHUB_TOKEN || process.env.NODE_AUTH_TOKEN };
    case "npm":
      return { url: "https://registry.npmjs.org", host: "registry.npmjs.org", token: process.env._NPM_TOKEN || process.env.NODE_AUTH_TOKEN };
    default:
      throw new Error("Registry must be github, npm, or both.");
  }
}

function destinations(registry) {
  return registry === "both" ? ["github", "npm"] : [registry];
}

export function packageRegistryState(pkg, registry) {
  const config = registryConfig(registry);
  const args = ["view", `${pkg.manifest.name}@${pkg.manifest.version}`, "version", "--registry", config.url, "--json"];
  const env = { ...process.env };
  if (config.token) env.NODE_AUTH_TOKEN = config.token;

  try {
    run("npm", args, { env, stdio: "pipe" });
    return "published";
  } catch (error) {
    const output = `${error?.stdout ?? ""}\n${error?.stderr ?? ""}\n${error?.message ?? ""}`;
    if (/E404|404 Not Found|is not in this registry/i.test(output)) return "missing";
    throw new Error(`Could not check ${pkg.manifest.name}@${pkg.manifest.version} on ${registry}: ${error.message}`);
  }
}

function publishPlan(packages, registry) {
  return packages.map((pkg) => ({
    pkg,
    registries: Object.fromEntries(destinations(registry).map((destination) => [destination, packageRegistryState(pkg, destination)])),
  }));
}

function printPlan(plan) {
  console.log("\nPublish plan:");
  for (const { pkg, registries } of plan) {
    console.log(`${pkg.manifest.name}@${pkg.manifest.version}`);
    for (const [registry, state] of Object.entries(registries)) console.log(`  ${registry}  ${state}`);
  }
}

function validate(root, pkg) {
  console.log(`\nValidating ${pkg.manifest.name}@${pkg.manifest.version} (${pkg.directory})`);
  const dependencies = dependencyCheck(root, pkg);
  printDependencyCheck(dependencies);
  assertDependencies(dependencies);
  for (const script of ["typecheck", "test", "build"]) {
    run("npm", ["run", script, "--workspace", pkg.manifest.name, "--if-present"], { cwd: root });
  }
  run("npm", ["pack", "--workspace", pkg.manifest.name, "--dry-run"], { cwd: root });
}

function publishOne(root, pkg, registry, tag, access) {
  const config = registryConfig(registry);
  if (!config.token) throw new Error(registry === "github" ? "Set _GITHUB_TOKEN before publishing." : "Set _NPM_TOKEN before staging a release.");

  const dir = mkdtempSync(join(tmpdir(), "workspace-publish-"));
  const npmrc = join(dir, "npmrc");
  writeFileSync(npmrc, `registry=${config.url}\n//${config.host}/:_authToken=\${NODE_AUTH_TOKEN}\n`);
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

export function publish({ selector, registry = "github", tag = "latest", access = "public", dryRun = false, list = false, withDependencies = false }) {
  if (!/^[A-Za-z][A-Za-z0-9._-]*$/.test(tag)) throw new Error("Invalid npm distribution tag.");
  if (!["public", "restricted"].includes(access)) throw new Error("Access must be public or restricted.");
  if (!["github", "npm", "both"].includes(registry)) throw new Error("Registry must be github, npm, or both.");

  const root = repositoryRoot();

  if (dryRun && !selector) {
    const packagesDir = resolve(root, "packages");
    const packages = existsSync(packagesDir)
      ? readdirSync(packagesDir, { withFileTypes: true })
          .filter((entry) => entry.isDirectory() && existsSync(resolve(packagesDir, entry.name, "package.json")))
          .map((entry) => packageInfo(root, entry.name))
          .filter((pkg) => !pkg.manifest.private)
      : [];

    if (!packages.length) throw new Error("No publishable packages were found under packages/*.");
    for (const pkg of packages) validate(root, pkg);
    console.log(`\nRelease checks passed for ${packages.length} package(s). Nothing was published.`);
    return;
  }

  if (!selector) throw new Error("A package selector is required for publishing.");
  const pkg = packageInfo(root, selector);
  const packages = withDependencies ? workspacePublishOrder(root, pkg) : [pkg];
  const plan = publishPlan(packages, registry);

  if (list) printPlan(plan);

  const pendingPackages = plan.filter(({ registries }) => Object.values(registries).includes("missing")).map(({ pkg }) => pkg);
  if (list && !dryRun) return;

  for (const item of pendingPackages) validate(root, item);

  if (dryRun) {
    const names = pendingPackages.map((item) => item.manifest.name);
    console.log(names.length
      ? `\nRelease checks passed for ${names.join(", ")}. Nothing was published.`
      : "\nAll selected package versions are already published. Nothing to validate or publish.");
    return;
  }

  for (const { pkg: item, registries } of plan) {
    for (const destination of destinations(registry)) {
      if (registries[destination] === "published") {
        console.log(`Skipping ${item.manifest.name}@${item.manifest.version} on ${destination}: already published.`);
        continue;
      }
      publishOne(root, item, destination, tag, access);
    }
  }
}

export function packageFromTag(tagName) {
  const at = tagName.lastIndexOf("@");
  if (at <= 0) throw new Error(`Invalid package release tag: ${tagName}`);
  const selector = tagName.slice(0, at);
  const version = tagName.slice(at + 1);
  const root = repositoryRoot();
  const pkg = packageInfo(root, selector);
  if (pkg.manifest.version !== version) {
    throw new Error(`Package version ${pkg.manifest.version} does not match tag ${tagName}.`);
  }
  return { selector, version, package: pkg };
}
