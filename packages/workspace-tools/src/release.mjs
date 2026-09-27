import { existsSync, readFileSync, writeFileSync } from "node:fs";
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
  const changelog = updateChangelog(root, pkg, version, selector);
  run("git", ["add", pkg.file, "package-lock.json", changelog], { cwd: root });
  run("git", ["commit", "-m", `release: ${tag}`], { cwd: root });
  run("git", ["tag", tag], { cwd: root });

  console.log(`\nCreated release ${tag}\nPush the release commit and tag with:\n  git push --follow-tags`);
}
