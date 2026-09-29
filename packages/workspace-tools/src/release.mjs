#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { Argument, Option, program } from "commander";

import { output, packageInfo, repositoryRoot, run } from "./workspace.mjs";

import {
  assertDependencies,
  dependencyCheck,
  printDependencyCheck,
} from "./dependency-check.mjs";

/**
 * Supported semantic-version bump types.
 *
 * @type {ReadonlySet<string>}
 */
const VALID_BUMPS = new Set([
  "major",
  "minor",
  "patch",
  "premajor",
  "preminor",
  "prepatch",
  "prerelease",
]);

/**
 * Supported release modes.
 *
 * @type {ReadonlySet<string>}
 */
const RELEASE_MODES = new Set(["bump", "exact", "existing"]);

/**
 * Semantic Versioning pattern.
 */
const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

/**
 * Whether ANSI styling should be enabled.
 */
const COLOR = Boolean(process.stdout.isTTY && !process.env.NO_COLOR);

/**
 * Apply an ANSI style when terminal coloring is enabled.
 *
 * @param {string} code
 * ANSI escape code.
 *
 * @param {string} value
 * Value to style.
 *
 * @returns {string}
 * Styled or unchanged value.
 */
function ansi(code, value) {
  return COLOR ? `\x1b[${code}m${value}\x1b[0m` : value;
}

/**
 * Terminal styling helpers.
 */
const style = {
  bold: (value) => ansi("1", value),
  cyan: (value) => ansi("36", value),
  green: (value) => ansi("32", value),
  yellow: (value) => ansi("33", value),
  red: (value) => ansi("31", value),
  dim: (value) => ansi("2", value),
};

/**
 * @typedef {"bump" | "exact" | "existing"} ReleaseMode
 */

/**
 * @typedef {object} ReleaseOptions
 *
 * @property {ReleaseMode} [mode]
 * Release mode.
 *
 * @property {string} [version]
 * Explicit bump or version override.
 *
 * @property {boolean} [dryRun]
 * Preview the release without making changes.
 *
 * @property {boolean} [json]
 * Return machine-readable release information.
 *
 * @property {boolean} [fzf]
 * Allow interactive fzf selection.
 */

/**
 * Calculate the next package version.
 *
 * @param {string} currentVersion
 * Current semantic version.
 *
 * @param {string} versionSpec
 * Exact version or semantic-version bump.
 *
 * @returns {string}
 * Resolved next version.
 */
export function resolveNextVersion(currentVersion, versionSpec) {
  if (!SEMVER.test(currentVersion)) {
    throw new Error(`Invalid current SemVer: ${currentVersion}`);
  }

  if (SEMVER.test(versionSpec)) {
    return versionSpec;
  }

  if (!VALID_BUMPS.has(versionSpec)) {
    throw new Error(`Invalid release bump: ${versionSpec}`);
  }

  const [core, prerelease = ""] = currentVersion.split("-", 2);

  const [major, minor, patch] = core.split(".").map(Number);

  switch (versionSpec) {
    case "major":
      return `${major + 1}.0.0`;

    case "minor":
      return `${major}.${minor + 1}.0`;

    case "patch":
      return `${major}.${minor}.${patch + 1}`;

    case "premajor":
      return `${major + 1}.0.0-0`;

    case "preminor":
      return `${major}.${minor + 1}.0-0`;

    case "prepatch":
      return `${major}.${minor}.${patch + 1}-0`;

    case "prerelease": {
      if (!prerelease) {
        return `${major}.${minor}.${patch + 1}-0`;
      }

      const parts = prerelease.split(".");

      const last = parts.at(-1);

      if (/^\d+$/.test(last)) {
        parts[parts.length - 1] = String(Number(last) + 1);
      } else {
        parts.push("0");
      }

      return `${major}.${minor}.${patch}-${parts.join(".")}`;
    }

    default:
      throw new Error(`Unsupported release bump: ${versionSpec}`);
  }
}

/**
 * Parse a release specification.
 *
 * @param {string} argument
 * Release specification in `<package>=<version>` form.
 *
 * @returns {{
 *   selector: string,
 *   versionSpec: string
 * }}
 * Parsed release specification.
 */
export function parseReleaseArgument(argument) {
  if (!argument || !argument.includes("=")) {
    throw new Error(
      "Usage: workspace-release <package>=<version|major|minor|patch|premajor|preminor|prepatch|prerelease>",
    );
  }

  const index = argument.indexOf("=");

  const selector = argument.slice(0, index).trim();

  const versionSpec = argument.slice(index + 1).trim();

  if (!selector) {
    throw new Error("A package selector is required.");
  }

  if (!VALID_BUMPS.has(versionSpec) && !SEMVER.test(versionSpec)) {
    throw new Error(`Invalid version: ${versionSpec}`);
  }

  return {
    selector,
    versionSpec,
  };
}

/**
 * Group commit messages into changelog categories.
 *
 * @param {string[]} messages
 * Git commit messages.
 *
 * @returns {{
 *   Added: string[],
 *   Changed: string[],
 *   Fixed: string[],
 *   Removed: string[]
 * }}
 * Grouped release notes.
 */
export function releaseNotes(messages) {
  const groups = {
    Added: [],
    Changed: [],
    Fixed: [],
    Removed: [],
  };

  const seen = new Set();

  for (const message of messages) {
    const firstLine = message
      .split("\n")
      .find((line) => line.trim())
      ?.trim();

    if (!firstLine || /^release(?:\([^)]*\))?:/i.test(firstLine)) {
      continue;
    }

    const match = firstLine.match(
      /^(feat|fix|refactor|perf|docs|style|test|build|ci|chore)(?:\([^)]*\))?(!)?:\s*(.+)$/i,
    );

    const type = match?.[1]?.toLowerCase();

    const breaking = Boolean(match?.[2]) || /BREAKING CHANGE:/i.test(message);

    const text = (match?.[3] || firstLine).replace(/\s*\(#\d+\)$/, "").trim();

    if (!text || seen.has(text)) {
      continue;
    }

    seen.add(text);

    if (breaking || /\bremove[ds]?\b/i.test(text)) {
      groups.Removed.push(text);
    } else if (type === "feat") {
      groups.Added.push(text);
    } else if (type === "fix") {
      groups.Fixed.push(text);
    } else {
      groups.Changed.push(text);
    }
  }

  return groups;
}

/**
 * Generate a changelog section.
 *
 * @param {string} version
 * Package version.
 *
 * @param {{
 *   Added: string[],
 *   Changed: string[],
 *   Fixed: string[],
 *   Removed: string[]
 * }} notes
 * Grouped release notes.
 *
 * @returns {string}
 * Markdown changelog section.
 */
export function changelogSection(version, notes) {
  const sections = Object.entries(notes)
    .filter(([, entries]) => entries.length)
    .map(
      ([heading, entries]) =>
        `### ${heading}\n\n${entries.map((entry) => `- ${entry}`).join("\n")}`,
    );

  return `## ${version}\n\n${
    sections.join("\n\n") || "### Changed\n\n- Package release."
  }\n`;
}

/**
 * Get the configured package registry.
 *
 * @param {ReturnType<typeof packageInfo>} pkg
 * Workspace package.
 *
 * @returns {string}
 * Registry URL.
 */
function registryFor(pkg) {
  return pkg.manifest.publishConfig?.registry || "https://registry.npmjs.org";
}

/**
 * Look up a package version in its configured registry.
 *
 * @param {string} root
 * Repository root.
 *
 * @param {ReturnType<typeof packageInfo>} pkg
 * Workspace package.
 *
 * @param {string} [version]
 * Optional version to check.
 *
 * @returns {{
 *   status: "published" | "not-published",
 *   version: string | null
 * }}
 * Registry state.
 */
function registryVersion(root, pkg, version) {
  const registry = registryFor(pkg);

  const spec = version ? `${pkg.manifest.name}@${version}` : pkg.manifest.name;

  try {
    const publishedVersion = output(
      "npm",
      ["view", spec, "version", "--registry", registry],
      {
        cwd: root,
      },
    );

    return {
      status: "published",
      version: publishedVersion,
    };
  } catch (error) {
    const stderr = String(error?.stderr || "");

    const stdout = String(error?.stdout || "");

    const details = `${stderr}\n${stdout}\n${error?.message || ""}`;

    if (
      /E404|404 Not Found|is not in this registry|No match found for version/i.test(
        details,
      )
    ) {
      return {
        status: "not-published",
        version: null,
      };
    }

    throw new Error(
      `Unable to verify ${spec} in ${registry}: ${
        stderr.trim() || error?.message || "registry lookup failed"
      }`,
    );
  }
}

/**
 * Find the previous release ref for a package.
 *
 * @param {string} root
 * Repository root.
 *
 * @param {string} selector
 * Package selector.
 *
 * @returns {string | null}
 * Previous tag or release commit.
 */
function previousReleaseRef(root, selector) {
  const tags = output(
    "git",
    ["tag", "--list", `${selector}@*`, "--sort=-version:refname"],
    {
      cwd: root,
    },
  );

  const tag = tags.split("\n").find(Boolean);

  if (tag) {
    return tag;
  }

  const commit = output(
    "git",
    ["log", "-n", "1", "--format=%H", "--grep", `^release: ${selector}@[0-9]`],
    {
      cwd: root,
    },
  );

  return commit || null;
}

/**
 * Read package-specific commits since the previous release.
 *
 * @param {string} root
 * Repository root.
 *
 * @param {ReturnType<typeof packageInfo>} pkg
 * Workspace package.
 *
 * @param {string | null} previousRef
 * Previous release ref.
 *
 * @returns {string[]}
 * Commit messages.
 */
function packageChanges(root, pkg, previousRef) {
  const range = previousRef ? `${previousRef}..HEAD` : "HEAD";

  const log = output(
    "git",
    ["log", range, "--format=%B%x1e", "--", pkg.directory],
    {
      cwd: root,
    },
  );

  return log
    ? log
        .split("\x1e")
        .map((message) => message.trim())
        .filter(Boolean)
    : [];
}

/**
 * Update a package changelog.
 *
 * @param {string} root
 * Repository root.
 *
 * @param {ReturnType<typeof packageInfo>} pkg
 * Workspace package.
 *
 * @param {string} version
 * Release version.
 *
 * @param {string} selector
 * Package selector.
 *
 * @returns {string}
 * Changelog path.
 */
function updateChangelog(root, pkg, version, selector) {
  const changelog = resolve(root, pkg.directory, "CHANGELOG.md");

  const previous = previousReleaseRef(root, selector);

  const section = changelogSection(
    version,
    releaseNotes(packageChanges(root, pkg, previous)),
  );

  const existing = existsSync(changelog)
    ? readFileSync(changelog, "utf8")
    : "# Changelog\n";

  const body = existing.replace(/^# Changelog\s*/, "");

  writeFileSync(
    changelog,
    `# Changelog\n\n${section}\n${body}`.trimEnd() + "\n",
  );

  return changelog;
}

/**
 * Create or preview a package release.
 *
 * @param {string} argument
 * Release specification in `<package>=<version>` form.
 *
 * @param {ReleaseOptions} [options={}]
 * Release options.
 *
 * @returns {{
 *   registry: string,
 *   latestPublished: string,
 *   currentVersion: string,
 *   nextVersion: string,
 *   alreadyPublished: boolean,
 *   previousRelease: string | null,
 *   changelog: string
 * } | undefined}
 * Dry-run information when `dryRun` is enabled.
 */
export function release(argument, options = {}) {
  const { selector, versionSpec: argumentVersionSpec } =
    parseReleaseArgument(argument);

  const mode = options.mode || "bump";

  if (!RELEASE_MODES.has(mode)) {
    throw new Error(`Invalid release mode: ${mode}`);
  }

  const versionSpec =
    mode === "existing" ? null : options.version || argumentVersionSpec;

  if (mode === "bump" && !VALID_BUMPS.has(versionSpec)) {
    throw new Error(`Invalid release bump: ${versionSpec}`);
  }

  if (mode === "exact" && !SEMVER.test(versionSpec)) {
    throw new Error(`Invalid exact SemVer: ${versionSpec}`);
  }

  const root = repositoryRoot();

  const pkg = packageInfo(root, selector);

  if (pkg.manifest.private) {
    throw new Error(`${pkg.manifest.name} is private and cannot be released.`);
  }

  if (
    output("git", ["status", "--porcelain"], {
      cwd: root,
    })
  ) {
    throw new Error(
      "Working tree must be clean before creating a package release.",
    );
  }

  const dependencies = dependencyCheck(root, pkg);

  if (!options.json) {
    printDependencyCheck(dependencies);
  }

  assertDependencies(dependencies);

  if (options.dryRun) {
    let nextVersion = pkg.manifest.version;

    if (mode !== "existing") {
      nextVersion = resolveNextVersion(pkg.manifest.version, versionSpec);
    }

    const registry = registryFor(pkg);

    const published = registryVersion(root, pkg);

    const proposed = registryVersion(root, pkg, nextVersion);

    const latestPublished =
      published.status === "published" ? published.version : "";

    const alreadyPublished = proposed.status === "published";

    const previous = previousReleaseRef(root, selector);

    const section = changelogSection(
      nextVersion,
      releaseNotes(packageChanges(root, pkg, previous)),
    );

    const registryName =
      registry === "https://npm.pkg.github.com"
        ? "GitHub Packages"
        : registry === "https://registry.npmjs.org"
          ? "npm"
          : registry;

    const selection =
      mode === "existing"
        ? "Release the existing package version without changing it."
        : mode === "exact"
          ? "Release the explicitly requested version."
          : `Increment the ${versionSpec} version.`;

    const versionChange =
      mode === "existing" ? "" : `\n  ${pkg.manifest.version} → ${nextVersion}`;

    const registryStatus = alreadyPublished
      ? `${pkg.manifest.name}@${nextVersion} is already published.`
      : `${pkg.manifest.name}@${nextVersion} is not published.\n  This version is available to publish.`;

    const previousRelease = previous || "No previous release was found.";

    const publishedDisplay = latestPublished
      ? style.cyan(latestPublished)
      : style.yellow("Not published");

    const releaseDisplay = style.bold(style.green(nextVersion));

    const statusDisplay = alreadyPublished
      ? style.red(registryStatus)
      : style.green(registryStatus);

    const previousDisplay = previous
      ? style.cyan(previousRelease)
      : style.yellow(previousRelease);

    if (!options.json) {
      console.log(`
${style.bold(style.cyan("Release preview"))}

Package:          ${pkg.manifest.name}
Registry:         ${registryName}
Published:        ${publishedDisplay}
Package version:  ${style.cyan(pkg.manifest.version)}

${style.bold("Release selection")}
  ${selection}${versionChange}
  Version to release: ${releaseDisplay}

${style.bold("Registry status")}
  ${statusDisplay}

${style.bold("Previous release")}
  ${previousDisplay}

${style.dim(
  "Dry run only — no files, commits, tags, or packages will be changed.",
)}

${style.bold(style.cyan("Proposed changelog"))}

${section}`);
    }

    return {
      registry,
      latestPublished,
      currentVersion: pkg.manifest.version,
      nextVersion,
      alreadyPublished,
      previousRelease: previous,
      changelog: section,
    };
  }

  if (mode !== "existing") {
    run(
      "npm",
      [
        "version",
        versionSpec,
        "--workspace",
        pkg.manifest.name,
        "--git-tag-version=false",
      ],
      {
        cwd: root,
      },
    );
  }

  const version = JSON.parse(readFileSync(pkg.file, "utf8")).version;

  if (registryVersion(root, pkg, version).status === "published") {
    run("git", ["checkout", "--", pkg.file, "package-lock.json"], {
      cwd: root,
    });

    throw new Error(
      `${pkg.manifest.name}@${version} is already published to ${registryFor(pkg)}.`,
    );
  }

  const tag = `${selector}@${version}`;

  const changelog = updateChangelog(root, pkg, version, selector);

  run("git", ["add", pkg.file, "package-lock.json", changelog], {
    cwd: root,
  });

  run("git", ["commit", "-m", `release: ${tag}`], {
    cwd: root,
  });

  run("git", ["tag", tag], {
    cwd: root,
  });

  console.log(`
Created release ${tag}

Push the release commit and tag with:

  git push --follow-tags`);
}

/**
 * Determine whether a CLI executable is available on PATH.
 *
 * @param {string} command
 * Executable name.
 *
 * @returns {boolean}
 * Whether the executable is available.
 */
function commandExists(command) {
  const lookupCommand = process.platform === "win32" ? "where" : "which";

  try {
    execFileSync(lookupCommand, [command], {
      stdio: "ignore",
    });

    return true;
  } catch {
    return false;
  }
}

/**
 * Run an interactive fzf selection.
 *
 * @param {string[]} choices
 * Values presented to fzf.
 *
 * @param {string} prompt
 * Prompt displayed by fzf.
 *
 * @returns {string | undefined}
 * Selected value, or `undefined` when selection is cancelled.
 */
function selectWithFzf(choices, prompt) {
  if (!process.stdin.isTTY) {
    throw new Error("Interactive selection requires a terminal.");
  }

  if (!commandExists("fzf")) {
    throw new Error(
      [
        "fzf is required for interactive selection.",
        "Install fzf or provide the release arguments explicitly.",
      ].join("\n"),
    );
  }

  if (!choices.length) {
    return undefined;
  }

  try {
    const selected = execFileSync(
      "fzf",
      [
        "--prompt",
        `${prompt} > `,
        "--height",
        "40%",
        "--layout",
        "reverse",
        "--border",
        "--select-1",
        "--exit-0",
      ],
      {
        input: `${choices.join("\n")}\n`,
        encoding: "utf8",
        stdio: ["pipe", "pipe", "inherit"],
      },
    ).trim();

    return selected || undefined;
  } catch (error) {
    if (error?.status === 1 || error?.status === 130) {
      return undefined;
    }

    throw error;
  }
}

/**
 * Get all non-private packages under the repository packages directory.
 *
 * @param {string} root
 * Repository root.
 *
 * @returns {ReturnType<typeof packageInfo>[]}
 * Releasable workspace packages.
 */
function releasablePackages(root) {
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
 * Select a package using fzf.
 *
 * @param {string} root
 * Repository root.
 *
 * @returns {string | undefined}
 * Selected package name.
 */
function selectPackageWithFzf(root) {
  const packages = releasablePackages(root);

  if (!packages.length) {
    throw new Error("No releasable packages were found under packages/*.");
  }

  return selectWithFzf(
    packages.map((pkg) => pkg.manifest.name),
    "Package",
  );
}

/**
 * Select a semantic-version bump using fzf.
 *
 * @returns {string | undefined}
 * Selected bump.
 */
function selectVersionBumpWithFzf() {
  return selectWithFzf(
    [
      "patch",
      "minor",
      "major",
      "prerelease",
      "prepatch",
      "preminor",
      "premajor",
    ],
    "Version",
  );
}

/**
 * Resolve a CLI release specification.
 *
 * Explicit `<package>=<version>` input is preserved.
 *
 * A package supplied without a version uses `--version` when present,
 * otherwise fzf is used for bump selection.
 *
 * When no package is supplied, fzf selects the package first.
 *
 * @param {string | undefined} argument
 * Optional package or release specification.
 *
 * @param {ReleaseOptions} options
 * Commander options.
 *
 * @returns {string | undefined}
 * Normalized `<package>=<version>` release specification.
 */
function resolveCliReleaseArgument(argument, options) {
  if (argument?.includes("=")) {
    return argument;
  }

  if (!options.fzf && !argument) {
    throw new Error("A package selector is required when --no-fzf is used.");
  }

  const root = repositoryRoot();

  const selector = argument || selectPackageWithFzf(root);

  if (!selector) {
    return undefined;
  }

  if (options.mode === "existing") {
    /*
     * release() intentionally ignores versionSpec in existing mode.
     * A syntactically valid placeholder keeps parseReleaseArgument()
     * backwards compatible.
     */
    return `${selector}=patch`;
  }

  if (options.mode === "exact") {
    if (!options.version) {
      throw new Error("--mode exact requires --version <semver>.");
    }

    return `${selector}=${options.version}`;
  }

  const versionSpec =
    options.version || (options.fzf ? selectVersionBumpWithFzf() : undefined);

  if (!versionSpec) {
    return undefined;
  }

  return `${selector}=${versionSpec}`;
}

/**
 * Execute the workspace-release CLI command.
 *
 * @param {string | undefined} argument
 * Optional package or `<package>=<version>` specification.
 *
 * @param {ReleaseOptions} options
 * Commander options.
 *
 * @returns {void}
 */
function releaseWorkspacePackage(argument, options) {
  const releaseArgument = resolveCliReleaseArgument(argument, options);

  if (!releaseArgument) {
    console.log("Release selection cancelled.");

    return;
  }

  const result = release(releaseArgument, options);

  if (options.json && result) {
    console.log(JSON.stringify(result, null, 2));
  }
}

/**
 * Determine whether this module is the process entry point.
 *
 * @returns {boolean}
 * Whether this module was executed directly.
 */
function isMainModule() {
  if (!process.argv[1]) {
    return false;
  }

  return import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
}

program
  .name("workspace-release")
  .description("Create or preview a workspace package release.")
  .addArgument(
    new Argument(
      "[release]",
      "Package or release specification (<package>=<version|bump>)",
    ),
  )
  .addOption(
    new Option("-m, --mode <mode>", "Release mode")
      .choices(["bump", "exact", "existing"])
      .default("bump"),
  )
  .option("-v, --version <version>", "Version bump or exact semantic version")
  .option(
    "-d, --dry-run",
    "Preview the release without changing files, commits, or tags",
  )
  .option("-j, --json", "Output dry-run information as JSON")
  .option("--no-fzf", "Disable interactive fzf selection")
  .addHelpText(
    "after",
    `
Examples:
  $ workspace-release
  $ workspace-release workspace-tools
  $ workspace-release workspace-tools=patch
  $ workspace-release workspace-tools=minor
  $ workspace-release workspace-tools=1.2.3

  $ workspace-release workspace-tools -v patch
  $ workspace-release workspace-tools -m exact -v 1.2.3
  $ workspace-release workspace-tools -m existing

  $ workspace-release workspace-tools=patch --dry-run
  $ workspace-release workspace-tools=patch --dry-run --json

  $ workspace-release --no-fzf workspace-tools=patch

Interactive mode:
  Running workspace-release without a package opens fzf to select
  a package, followed by a version-bump selector.

  $ workspace-release

  Package > @moyarich/workspace-tools
  Version > patch
`,
  )
  .action(releaseWorkspacePackage);

if (isMainModule()) {
  await program.parseAsync();
}
