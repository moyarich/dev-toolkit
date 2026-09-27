import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
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

export function releaseNotes(messages) {
  const groups = { Added: [], Changed: [], Fixed: [], Removed: [] };
  const seen = new Set();

  for (const message of messages) {
    const firstLine = message.split("\n").find((line) => line.trim())?.trim();
    if (!firstLine || /^release(?:\([^)]*\))?:/i.test(firstLine)) continue;

    const match = firstLine.match(/^(feat|fix|refactor|perf|docs|style|test|build|ci|chore)(?:\([^)]*\))?(!)?:\s*(.+)$/i);
    const type = match?.[1]?.toLowerCase();
    const breaking = Boolean(match?.[2]) || /BREAKING CHANGE:/i.test(message);
    const text = (match?.[3] || firstLine).replace(/\s*\(#\d+\)$/, "").trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);

    if (breaking || /\bremove[ds]?\b/i.test(text)) groups.Removed.push(text);
    else if (type === "feat") groups.Added.push(text);
    else if (type === "fix") groups.Fixed.push(text);
    else groups.Changed.push(text);
  }

  return groups;
}

export function changelogSection(version, notes) {
  const sections = Object.entries(notes)
    .filter(([, entries]) => entries.length)
    .map(([heading, entries]) => `### ${heading}\n\n${entries.map((entry) => `- ${entry}`).join("\n")}`);

  return `## ${version}\n\n${sections.join("\n\n") || "### Changed\n\n- Package release."}\n`;
}

function registryFor(pkg) {
  return pkg.manifest.publishConfig?.registry || "https://registry.npmjs.org";
}

function registryVersion(root, pkg, version) {
  const registry = registryFor(pkg);
  const spec = version ? `${pkg.manifest.name}@${version}` : pkg.manifest.name;

  try {
    const publishedVersion = output("npm", ["view", spec, "version", "--registry", registry], { cwd: root });
    return { status: "published", version: publishedVersion };
  } catch (error) {
    const stderr = String(error?.stderr || "");
    const stdout = String(error?.stdout || "");
    const details = `${stderr}\n${stdout}\n${error?.message || ""}`;

    if (/E404|404 Not Found|is not in this registry|No match found for version/i.test(details)) {
      return { status: "not-published", version: null };
    }

    throw new Error(`Unable to verify ${spec} in ${registry}: ${stderr.trim() || error?.message || "registry lookup failed"}`);
  }
}

function previousReleaseRef(root, selector) {
  const tags = output("git", ["tag", "--list", `${selector}@*`, "--sort=-version:refname"], { cwd: root });
  const tag = tags.split("\n").find(Boolean);
  if (tag) return tag;

  const commit = output("git", ["log", "-n", "1", "--format=%H", "--grep", `^release: ${selector}@[0-9]`], { cwd: root });
  return commit || null;
}

function packageChanges(root, pkg, previousRef) {
  const range = previousRef ? `${previousRef}..HEAD` : "HEAD";
  const log = output("git", ["log", range, "--format=%B%x1e", "--", pkg.directory], { cwd: root });
  return log ? log.split("\x1e").map((message) => message.trim()).filter(Boolean) : [];
}

function updateChangelog(root, pkg, version, selector) {
  const changelog = resolve(root, pkg.directory, "CHANGELOG.md");
  const previous = previousReleaseRef(root, selector);
  const section = changelogSection(version, releaseNotes(packageChanges(root, pkg, previous)));
  const existing = existsSync(changelog) ? readFileSync(changelog, "utf8") : "# Changelog\n";
  const body = existing.replace(/^# Changelog\s*/, "");
  writeFileSync(changelog, `# Changelog\n\n${section}\n${body}`.trimEnd() + "\n");
  return changelog;
}

export function release(argument, options = {}) {
  const { selector, versionSpec } = parseReleaseArgument(argument);
  const root = repositoryRoot();
  const pkg = packageInfo(root, selector);
  if (output("git", ["status", "--porcelain"], { cwd: root })) {
    throw new Error("Working tree must be clean before creating a package release.");
  }

  if (options.dryRun) {
    const version = output("npm", ["version", versionSpec, "--workspace", pkg.manifest.name, "--git-tag-version=false", "--dry-run", "--json"], { cwd: root });
    let nextVersion;
    try {
      const result = JSON.parse(version);
      nextVersion = result[pkg.manifest.name] || Object.values(result)[0];
    } catch {
      throw new Error("Unable to resolve the dry-run release version.");
    }
    const registry = registryFor(pkg);
    const published = registryVersion(root, pkg);
    const proposed = registryVersion(root, pkg, nextVersion);
    const latestPublished = published.status === "published" ? published.version : "";
    const alreadyPublished = proposed.status === "published";
    const previous = previousReleaseRef(root, selector);
    const section = changelogSection(nextVersion, releaseNotes(packageChanges(root, pkg, previous)));
    console.log(`\nRelease dry run\nPackage: ${pkg.manifest.name}\nRegistry: ${registry}\nPublished: ${latestPublished || "none"}\nCurrent: ${pkg.manifest.version}\nRequested: ${versionSpec}\nNext: ${nextVersion}\nAlready published: ${alreadyPublished ? "yes" : "no"}\nPrevious release ref: ${previous || "none"}\n\nProposed changelog:\n\n${section}`);
    return { registry, latestPublished, currentVersion: pkg.manifest.version, nextVersion, alreadyPublished, previousRelease: previous, changelog: section };
  }

  run("npm", ["version", versionSpec, "--workspace", pkg.manifest.name, "--git-tag-version=false"], { cwd: root });

  const version = JSON.parse(readFileSync(pkg.file, "utf8")).version;
  if (registryVersion(root, pkg, version).status === "published") {
    run("git", ["checkout", "--", pkg.file, "package-lock.json"], { cwd: root });
    throw new Error(`${pkg.manifest.name}@${version} is already published to ${registryFor(pkg)}.`);
  }
  const tag = `${selector}@${version}`;
  const changelog = updateChangelog(root, pkg, version, selector);
  run("git", ["add", pkg.file, "package-lock.json", changelog], { cwd: root });
  run("git", ["commit", "-m", `release: ${tag}`], { cwd: root });
  run("git", ["tag", tag], { cwd: root });

  console.log(`\nCreated release ${tag}\nPush the release commit and tag with:\n  git push --follow-tags`);
}
