import { output, workspacePackages } from "./workspace.mjs";

export function parseOutdated(raw) {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("Unable to parse npm outdated results.");
  }
}

export function classifyOutdated(outdated) {
  return Object.entries(outdated).map(([name, info]) => {
    const current = info.current ?? null;
    const wanted = info.wanted ?? null;
    const latest = info.latest ?? null;
    const fail = Boolean(current && wanted && current !== wanted);
    return {
      name, current, wanted, latest,
      level: fail ? "fail" : "warn",
      reason: fail ? "installed dependency is behind wanted" : "newer version exists outside declared range",
    };
  });
}

export function dependencyCheck(root, pkg) {
  let outdated = {};
  try {
    outdated = parseOutdated(output("npm", ["outdated", "--workspace", pkg.manifest.name, "--json"], { cwd: root }));
  } catch (error) {
    // npm outdated exits non-zero when outdated packages are found; its JSON is still useful.
    const raw = String(error?.stdout ?? "").trim();
    if (raw) outdated = parseOutdated(raw);
    else throw error;
  }

  const internal = new Map(workspacePackages(root).map((item) => [item.manifest.name, item]));
  const results = classifyOutdated(outdated);

  const declared = {
    ...(pkg.manifest.dependencies ?? {}),
    ...(pkg.manifest.optionalDependencies ?? {}),
    ...(pkg.manifest.devDependencies ?? {}),
  };
  for (const [name, range] of Object.entries(declared)) {
    const workspace = internal.get(name);
    if (!workspace || range === workspace.manifest.version) continue;
    const existing = results.find((item) => item.name === name);
    const detail = {
      name,
      declared: range,
      workspace: workspace.manifest.version,
      level: "fail",
      reason: "internal dependency does not match workspace version",
    };
    if (existing) Object.assign(existing, detail);
    else results.push(detail);
  }

  return results;
}

export function printDependencyCheck(results) {
  console.log("\nDependencies:");
  if (!results.length) {
    console.log("  current");
    return;
  }
  for (const item of results) {
    const versions = item.workspace
      ? `declared ${item.declared}, workspace ${item.workspace}`
      : `current ${item.current ?? "missing"}, wanted ${item.wanted ?? "unknown"}, latest ${item.latest ?? "unknown"}`;
    console.log(`  ${item.name}: ${versions} — ${item.level.toUpperCase()} — ${item.reason}`);
  }
}

export function assertDependencies(results) {
  const failures = results.filter((item) => item.level === "fail");
  if (failures.length) throw new Error(`Dependency check failed for ${failures.map((item) => item.name).join(", ")}.`);
}
