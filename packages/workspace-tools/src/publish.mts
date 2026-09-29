#!/usr/bin/env node

import {
  existsSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";

import {
  packageInfo,
  repositoryRoot,
  workspacePublishOrder,
} from "./workspace.mts";

import {
  assertDependencies,
  dependencyCheck,
  printDependencyCheck,
} from "./dependency-check.mts";

/**
 * @typedef {"github" | "npm"} Registry
 */

/**
 * @typedef {"github" | "npm" | "both"} RegistrySelection
 */

/**
 * @typedef {"public" | "restricted"} PackageAccess
 */

/**
 * @typedef {object} RegistryConfig
 * @property {string} url
 * @property {string} host
 * @property {string | undefined} token
 */

/**
 * @typedef {object} PublishOptions
 * @property {RegistrySelection} [registry]
 * @property {string} [tag]
 * @property {PackageAccess} [access]
 * @property {boolean} [dryRun]
 * @property {boolean} [list]
 * @property {boolean} [json]
 * @property {boolean} [withDependencies]
 * @property {boolean} [verifyGitTag]
 */

/**
 * Get configuration for a package registry.
 *
 * @param {Registry} registry
 * @returns {RegistryConfig}
 */
function registryConfig(registry) {
  switch (registry) {
    case "github":
      return {
        url: "https://npm.pkg.github.com",
        host: "npm.pkg.github.com",
        token: process.env._GITHUB_TOKEN || process.env.NODE_AUTH_TOKEN,
      };

    case "npm":
      return {
        url: "https://registry.npmjs.org",
        host: "registry.npmjs.org",
        token: process.env._NPM_TOKEN || process.env.NODE_AUTH_TOKEN,
      };

    default:
      throw new Error("Registry must be github, npm, or both.");
  }
}

/**
 * Expand a registry selection into individual publishing destinations.
 *
 * @param {RegistrySelection} registry
 * @returns {Registry[]}
 */
function destinations(registry) {
  return registry === "both" ? ["github", "npm"] : [registry];
}

/**
 * Determine whether a CLI command is available.
 *
 * @param {string} command
 * @returns {boolean}
 */
function commandExists(command) {
  const lookupCommand = process.platform === "win32" ? "where" : "which";

  const result = spawnSync(lookupCommand, [command], {
    stdio: "ignore",
  });

  return result.status === 0;
}

/**
 * Get all publishable packages under packages/.
 *
 * @param {string} root
 * @returns {ReturnType<typeof packageInfo>[]}
 */
function publishablePackages(root) {
  const packagesDirectory = resolve(root, "packages");

  if (!existsSync(packagesDirectory)) {
    return [];
  }

  return readdirSync(packagesDirectory, {
    withFileTypes: true,
  })
    .filter(
      (entry) =>
        entry.isDirectory() &&
        existsSync(resolve(packagesDirectory, entry.name, "package.json")),
    )
    .map((entry) => packageInfo(root, entry.name))
    .filter((pkg) => !pkg.manifest.private)
    .sort((a, b) => a.manifest.name.localeCompare(b.manifest.name));
}

/**
 * Select a publishable package using fzf.
 *
 * @param {string} root
 * @returns {string | undefined}
 */
function selectPackageWithFzf(root) {
  if (!process.stdin.isTTY) {
    throw new Error(
      "A package selector is required when stdin is not interactive.",
    );
  }

  if (!commandExists("fzf")) {
    throw new Error(
      [
        "fzf is required for interactive package selection.",
        "Install fzf or pass a package selector explicitly:",
        "  workspace-publish <package>",
      ].join("\n"),
    );
  }

  const packages = publishablePackages(root);

  if (!packages.length) {
    throw new Error("No publishable packages were found under packages/*.");
  }

  const choices = packages.map((pkg) => pkg.manifest.name).join("\n");

  const result = spawnSync(
    "fzf",
    [
      "--prompt",
      "Package > ",
      "--height",
      "40%",
      "--layout",
      "reverse",
      "--border",
      "--select-1",
      "--exit-0",
    ],
    {
      cwd: root,
      input: `${choices}\n`,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "inherit"],
    },
  );

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  const selector = result.stdout.trim();

  if (!selector) {
    return undefined;
  }

  return selector;
}

/**
 * Determine whether the current package version already exists in a registry.
 *
 * @param {ReturnType<typeof packageInfo>} pkg
 * @param {Registry} registry
 * @returns {"published" | "missing"}
 */
export function packageRegistryState(pkg, registry) {
  const config = registryConfig(registry);

  const args = [
    "view",
    `${pkg.manifest.name}@${pkg.manifest.version}`,
    "version",
    "--registry",
    config.url,
    "--json",
  ];

  const env = {
    ...process.env,
  };

  if (config.token) {
    env.NODE_AUTH_TOKEN = config.token;
  }

  try {
    execFileSync("npm", args, {
      env,
      stdio: "pipe",
    });

    return "published";
  } catch (error) {
    const output = [
      error?.stdout ?? "",
      error?.stderr ?? "",
      error?.message ?? "",
    ].join("\n");

    if (/E404|404 Not Found|is not in this registry/i.test(output)) {
      return "missing";
    }

    throw new Error(
      `Could not check ${pkg.manifest.name}@${pkg.manifest.version} on ${registry}: ${error.message}`,
    );
  }
}

/**
 * Inspect the package release tag for the current package version.
 *
 * @param {string} root
 * @param {ReturnType<typeof packageInfo>} pkg
 * @returns {{name: string, exists: boolean, atHead: boolean, commit: string | null}}
 */
export function packageGitTagState(root, pkg) {
  const selector = pkg.directory.split("/").at(-1);
  const name = `${selector}@${pkg.manifest.version}`;

  let commit = "";

  try {
    commit = execFileSync("git", ["rev-list", "-n", "1", name], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch {
    commit = "";
  }

  if (!commit) {
    return { name, exists: false, atHead: false, commit: null };
  }

  const head = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();

  return {
    name,
    exists: true,
    atHead: commit === head,
    commit,
  };
}

/**
 * Create a publishing plan for the selected packages.
 *
 * @param {ReturnType<typeof packageInfo>[]} packages
 * @param {RegistrySelection} registry
 * @returns {Array<{
 *   pkg: ReturnType<typeof packageInfo>,
 *   registries: Record<string, "published" | "missing">
 * }>}
 */
function publishPlan(packages, registry) {
  return packages.map((pkg) => ({
    pkg,

    registries: Object.fromEntries(
      destinations(registry).map((destination) => [
        destination,
        packageRegistryState(pkg, destination),
      ]),
    ),
  }));
}

/**
 * Print a publishing plan.
 *
 * @param {ReturnType<typeof publishPlan>} plan
 * @returns {void}
 */
function printPlan(plan) {
  console.log("\nPublish plan:");

  for (const { pkg, registries } of plan) {
    console.log(`${pkg.manifest.name}@${pkg.manifest.version}`);

    for (const [registry, state] of Object.entries(registries)) {
      console.log(`  ${registry}  ${state}`);
    }
  }
}

export function serializePublishPlan(plan, { registry, tag, access }) {
  return {
    registry,
    tag,
    access,
    packages: plan.map(({ pkg, registries }) => ({
      name: pkg.manifest.name,
      version: pkg.manifest.version,
      directory: pkg.directory,
      registries,
      publishable: Object.values(registries).includes("missing"),
    })),
  };
}

/**
 * Run release validation for a package.
 *
 * @param {string} root
 * @param {ReturnType<typeof packageInfo>} pkg
 * @returns {void}
 */
function validate(root, pkg, { quiet = false } = {}) {
  if (!quiet) {
    console.log(
      `\nValidating ${pkg.manifest.name}@${pkg.manifest.version} (${pkg.directory})`,
    );
  }

  const dependencies = dependencyCheck(root, pkg);

  if (!quiet) printDependencyCheck(dependencies);

  assertDependencies(dependencies);

  for (const script of ["typecheck", "test", "build"]) {
    execFileSync(
      "npm",
      ["run", script, "--workspace", pkg.manifest.name, "--if-present"],
      {
        cwd: root,
        stdio: quiet ? ["ignore", "ignore", "inherit"] : "inherit",
      },
    );
  }

  execFileSync("npm", ["pack", "--workspace", pkg.manifest.name, "--dry-run"], {
    cwd: root,
    stdio: quiet ? ["ignore", "ignore", "inherit"] : "inherit",
  });
}

/**
 * Publish one package to one registry.
 *
 * @param {string} root
 * @param {ReturnType<typeof packageInfo>} pkg
 * @param {Registry} registry
 * @param {string} tag
 * @param {PackageAccess} access
 * @returns {void}
 */
function publishOne(root, pkg, registry, tag, access, { quiet = false } = {}) {
  const config = registryConfig(registry);

  if (!config.token) {
    throw new Error(
      registry === "github"
        ? "Set _GITHUB_TOKEN before publishing."
        : "Set _NPM_TOKEN before staging a release.",
    );
  }

  const directory = mkdtempSync(join(tmpdir(), "workspace-publish-"));

  const npmrc = join(directory, "npmrc");

  writeFileSync(
    npmrc,
    [
      `registry=${config.url}`,
      `//${config.host}/:_authToken=\${NODE_AUTH_TOKEN}`,
      "",
    ].join("\n"),
  );

  const env = {
    ...process.env,
    NODE_AUTH_TOKEN: config.token,
    npm_config_userconfig: npmrc,
  };

  try {
    if (registry === "github") {
      execFileSync(
        "npm",
        [
          "publish",
          "--workspace",
          pkg.manifest.name,
          "--access",
          access,
          "--tag",
          tag,
        ],
        {
          cwd: root,
          env,
          stdio: quiet ? ["ignore", "ignore", "inherit"] : "inherit",
        },
      );

      return;
    }

    execFileSync("npm", ["stage", "publish", "--access", access, "--tag", tag], {
      cwd: resolve(root, pkg.directory),
      env,
      stdio: quiet ? ["ignore", "ignore", "inherit"] : "inherit",
    });

    if (!quiet) {
      console.log(
        `Staged ${pkg.manifest.name}@${pkg.manifest.version} on npmjs.org. ` +
          "Approve the staged release with 2FA before it becomes public.",
      );
    }
  } finally {
    rmSync(directory, {
      recursive: true,
      force: true,
    });
  }
}

/**
 * Validate and optionally publish one or more workspace packages.
 *
 * @param {object} options
 * @param {string | undefined} options.selector
 * @param {RegistrySelection} [options.registry="github"]
 * @param {string} [options.tag="latest"]
 * @param {PackageAccess} [options.access="public"]
 * @param {boolean} [options.dryRun=false]
 * @param {boolean} [options.list=false]
 * @param {boolean} [options.withDependencies=false]
 * @returns {void}
 */
export function publish({
  selector,
  registry = "github",
  tag = "latest",
  access = "public",
  dryRun = false,
  list = false,
  json = false,
  withDependencies = false,
  verifyGitTag = true,
}) {
  if (!/^[A-Za-z][A-Za-z0-9._-]*$/.test(tag)) {
    throw new Error("Invalid npm distribution tag.");
  }

  if (!["public", "restricted"].includes(access)) {
    throw new Error("Access must be public or restricted.");
  }

  if (!["github", "npm", "both"].includes(registry)) {
    throw new Error("Registry must be github, npm, or both.");
  }

  const root = repositoryRoot();

  if (dryRun && !selector) {
    const packages = publishablePackages(root);

    if (!packages.length) {
      throw new Error("No publishable packages were found under packages/*.");
    }

    const plan = publishPlan(packages, registry);
    const gitTags = Object.fromEntries(
      packages.map((item) => [
        item.manifest.name,
        packageGitTagState(root, item),
      ]),
    );
    const tagProblems = verifyGitTag
      ? packages
          .map((item) => {
            const state = gitTags[item.manifest.name];

            if (!state.exists) {
              return `Git release tag ${state.name} does not exist.`;
            }

            if (!state.atHead) {
              return `Git release tag ${state.name} points to ${state.commit}, not HEAD.`;
            }

            return null;
          })
          .filter(Boolean)
      : [];

    const pendingPackages = plan
      .filter(({ registries }) => Object.values(registries).includes("missing"))
      .map(({ pkg: item }) => item);

    for (const item of pendingPackages) {
      validate(root, item, { quiet: json });
    }

    if (!json) {
      console.log(
        `\nPublish preview completed for ${packages.length} package(s). Nothing was published.`,
      );
    }

    return {
      operation: "publish",
      status: tagProblems.length ? "warning" : "preview",
      dryRun: true,
      verifyGitTag,
      gitTags,
      canPublish: tagProblems.length === 0,
      reason: tagProblems.length ? tagProblems.join(" ") : null,
      ...serializePublishPlan(plan, { registry, tag, access }),
    };
  }

  if (!selector) {
    throw new Error("A package selector is required for publishing.");
  }

  const pkg = packageInfo(root, selector);

  if (pkg.manifest.private) {
    throw new Error(`${pkg.manifest.name} is private and cannot be published.`);
  }

  const packages = withDependencies ? workspacePublishOrder(root, pkg) : [pkg];

  const privateDependency = packages.find((item) => item.manifest.private);

  if (privateDependency) {
    throw new Error(
      `${privateDependency.manifest.name} is private and cannot be published as a dependency.`,
    );
  }

  const plan = publishPlan(packages, registry);

  const gitTags = Object.fromEntries(
    packages.map((item) => [
      item.manifest.name,
      packageGitTagState(root, item),
    ]),
  );

  const tagProblems = verifyGitTag
    ? packages
        .map((item) => {
          const state = gitTags[item.manifest.name];

          if (!state.exists) {
            return `Git release tag ${state.name} does not exist.`;
          }

          if (!state.atHead) {
            return `Git release tag ${state.name} points to ${state.commit}, not HEAD.`;
          }

          return null;
        })
        .filter(Boolean)
    : [];

  if (list && !json) {
    printPlan(plan);
  }

  const pendingPackages = plan
    .filter(({ registries }) => Object.values(registries).includes("missing"))
    .map(({ pkg: item }) => item);

  if (list && !dryRun) {
    return {
      operation: "publish",
      status: "plan",
      dryRun: false,
      verifyGitTag,
      gitTags,
      ...serializePublishPlan(plan, { registry, tag, access }),
    };
  }

  if (tagProblems.length && !dryRun) {
    throw new Error(
      `Publish blocked by Git tag verification:\n${tagProblems.map((problem) => `- ${problem}`).join("\n")}`,
    );
  }

  for (const item of pendingPackages) {
    validate(root, item, { quiet: json });
  }

  if (dryRun) {
    const names = pendingPackages.map((item) => item.manifest.name);

    if (!json) {
      console.log(
        names.length
          ? `\nRelease checks passed for ${names.join(", ")}. Nothing was published.`
          : "\nAll selected package versions are already published. Nothing to validate or publish.",
      );
    }

    return {
      operation: "publish",
      status: tagProblems.length ? "warning" : "preview",
      dryRun: true,
      verifyGitTag,
      gitTags,
      canPublish: tagProblems.length === 0,
      reason: tagProblems.length ? tagProblems.join(" ") : null,
      ...serializePublishPlan(plan, { registry, tag, access }),
    };
  }

  const results = [];

  for (const { pkg: item, registries } of plan) {
    for (const destination of destinations(registry)) {
      if (registries[destination] === "published") {
        if (!json) {
          console.log(
            `Skipping ${item.manifest.name}@${item.manifest.version} on ${destination}: already published.`,
          );
        }
        results.push({
          package: item.manifest.name,
          version: item.manifest.version,
          registry: destination,
          status: "skipped",
          reason: "already-published",
        });
        continue;
      }

      publishOne(root, item, destination, tag, access, { quiet: json });
      results.push({
        package: item.manifest.name,
        version: item.manifest.version,
        registry: destination,
        status: destination === "npm" ? "staged" : "published",
      });
    }
  }

  return {
    operation: "publish",
    status: "success",
    dryRun: false,
    verifyGitTag,
    gitTags,
    registry,
    tag,
    access,
    results,
    packages: serializePublishPlan(plan, { registry, tag, access }).packages,
  };
}

/**
 * Resolve and validate a package release tag.
 *
 * @param {string} tagName
 * @returns {{
 *   selector: string,
 *   version: string,
 *   package: ReturnType<typeof packageInfo>
 * }}
 */
export function packageFromTag(tagName) {
  const at = tagName.lastIndexOf("@");

  if (at <= 0) {
    throw new Error(`Invalid package release tag: ${tagName}`);
  }

  const selector = tagName.slice(0, at);

  const version = tagName.slice(at + 1);

  const root = repositoryRoot();

  const pkg = packageInfo(root, selector);

  if (pkg.manifest.private) {
    throw new Error(`${pkg.manifest.name} is private and cannot be published.`);
  }

  if (pkg.manifest.version !== version) {
    throw new Error(
      `Package version ${pkg.manifest.version} does not match tag ${tagName}.`,
    );
  }

  return {
    selector,
    version,
    package: pkg,
  };
}

/**
 * Execute the workspace publishing CLI.
 *
 * When no package selector is supplied, an interactive fzf package
 * picker is displayed. `--dry-run` without a selector retains its
 * existing behavior and validates every publishable package.
 *
 * @param {string | undefined} selector
 * @param {PublishOptions} options
 * @returns {void}
 */
export function publishWorkspacePackage(selector, options) {
  const root = repositoryRoot();

  const selectedPackage =
    selector ?? (options.dryRun ? undefined : selectPackageWithFzf(root));

  if (!selectedPackage && !options.dryRun) {
    console.log("Package selection cancelled.");

    return;
  }

  const result = publish({
    selector: selectedPackage,
    registry: options.registry,
    tag: options.tag,
    access: options.access,
    dryRun: options.dryRun,
    list: options.list,
    json: options.json,
    withDependencies: options.withDependencies,
    verifyGitTag: options.verifyGitTag,
  });

  if (options.json && result) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  }

  return result;
}

/**
 * Determine whether this module is being executed directly.
 *
 * @returns {boolean}
 */
function isMainModule() {
  if (!process.argv[1]) {
    return false;
  }

  return import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
}
