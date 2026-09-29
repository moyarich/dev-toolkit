import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { output, packageInfo, repositoryRoot, run } from "./workspace.mjs";
import {
  assertDependencies,
  dependencyCheck,
  printDependencyCheck,
} from "./dependency-check.mjs";

const VALID_BUMPS = new Set([
  "major",
  "minor",
  "patch",
  "premajor",
  "preminor",
  "prepatch",
  "prerelease",
]);

const RELEASE_MODES = new Set(["bump", "exact", "existing"]);

const COLOR = Boolean(process.stdout.isTTY && !process.env.NO_COLOR);

const ansi = (code, value) => (COLOR ? `\x1b[${code}m${value}\x1b[0m` : value);

const style = {
  bold: (value) => ansi("1", value),
  cyan: (value) => ansi("36", value),
  green: (value) => ansi("32", value),
  yellow: (value) => ansi("33", value),
  red: (value) => ansi("31", value),
  dim: (value) => ansi("2", value),
};

const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

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

export function parseReleaseArgument(argument) {
  if (!argument || !argument.includes("=")) {
    throw new Error(
      "Usage: workspace-release <package>=<version|major|minor|patch|premajor|preminor|prepatch|prerelease>",
    );
  }

  const index = argument.indexOf("=");
  const selector = argument.slice(0, index);
  const versionSpec = argument.slice(index + 1);

  if (!VALID_BUMPS.has(versionSpec) && !SEMVER.test(versionSpec)) {
    throw new Error(`Invalid version: ${versionSpec}`);
  }

  return { selector, versionSpec };
}

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

function registryFor(pkg) {
  return pkg.manifest.publishConfig?.registry || "https://registry.npmjs.org";
}

function registryVersion(root, pkg, version) {
  const registry = registryFor(pkg);
  const spec = version ? `${pkg.manifest.name}@${version}` : pkg.manifest.name;

  try {
    const publishedVersion = output(
      "npm",
      ["view", spec, "version", "--registry", registry],
      { cwd: root },
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

function previousReleaseRef(root, selector) {
  const tags = output(
    "git",
    ["tag", "--list", `${selector}@*`, "--sort=-version:refname"],
    { cwd: root },
  );

  const tag = tags.split("\n").find(Boolean);

  if (tag) {
    return tag;
  }

  const commit = output(
    "git",
    ["log", "-n", "1", "--format=%H", "--grep", `^release: ${selector}@[0-9]`],
    { cwd: root },
  );

  return commit || null;
}

function packageChanges(root, pkg, previousRef) {
  const range = previousRef ? `${previousRef}..HEAD` : "HEAD";

  const log = output(
    "git",
    ["log", range, "--format=%B%x1e", "--", pkg.directory],
    { cwd: root },
  );

  return log
    ? log
        .split("\x1e")
        .map((message) => message.trim())
        .filter(Boolean)
    : [];
}

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

  if (output("git", ["status", "--porcelain"], { cwd: root })) {
    throw new Error(
      "Working tree must be clean before creating a package release.",
    );
  }

  const dependencies = dependencyCheck(root, pkg);

  printDependencyCheck(dependencies);
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
      { cwd: root },
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

  run("git", ["add", pkg.file, "package-lock.json", changelog], { cwd: root });

  run("git", ["commit", "-m", `release: ${tag}`], { cwd: root });

  run("git", ["tag", tag], { cwd: root });

  console.log(`
Created release ${tag}

Push the release commit and tag with:
  git push --follow-tags`);
}
