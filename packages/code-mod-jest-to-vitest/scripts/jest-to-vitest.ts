import type { Codemod, Edit, SgNode } from "codemod:ast-grep";
import type TypeScript from "codemod:ast-grep/langs/typescript";

const JEST_TYPE_NAMES = new Set([
  "Mock",
  "Mocked",
  "MockedClass",
  "MockedFunction",
  "MockedObject",
  "Spied",
  "SpiedClass",
  "SpiedFunction",
  "SpiedGetter",
  "SpiedSetter",
  "SpyInstance",
]);

const JEST_GLOBALS = [
  "afterAll",
  "afterEach",
  "beforeAll",
  "beforeEach",
  "describe",
  "expect",
  "it",
  "test",
];

const JEST_API_RENAMES: Record<string, string> = {
  createMockFromModule: "importMock",
  deepUnmock: "unmock",
  genMockFromModule: "importMock",
  requireActual: "importActual",
  requireMock: "importMock",
  setMock: "mock",
};

const JEST_ASYNC_APIS = new Set([
  "createMockFromModule",
  "genMockFromModule",
  "requireActual",
  "requireMock",
]);

const FUNCTION_KINDS = new Set([
  "arrow_function",
  "function_declaration",
  "function_expression",
]);

function mergeVitestImport(
  source: string,
  runtimeImports: string[],
  typeImports: string[],
): string {
  const importParts = [
    ...runtimeImports,
    ...typeImports.map((name) => `type ${name}`),
  ];

  if (importParts.length === 0) return source;

  const vitestImport = /import\s*\{([^}]*)\}\s*from\s*["']vitest["'];?/;

  if (vitestImport.test(source)) {
    return source.replace(vitestImport, (_match, existing: string) => {
      const existingParts = existing
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);
      const merged = [...new Set([...existingParts, ...importParts])].sort();
      return `import { ${merged.join(", ")} } from "vitest";`;
    });
  }

  return `import { ${importParts.join(", ")} } from "vitest";\n${source}`;
}

function migrateJestRuntimeApis(rootNode: SgNode<TypeScript>): string {
  const calls = rootNode.findAll({
    rule: { pattern: "jest.$METHOD($$$ARGS)" },
  });
  const timerReferences = rootNode.findAll({
    rule: { pattern: "jest.advanceTimersByTime" },
  });
  const typeReferences = rootNode.findAll({
    rule: { kind: "nested_type_identifier" },
  });

  if (
    calls.length === 0 &&
    timerReferences.length === 0 &&
    typeReferences.length === 0
  ) {
    return rootNode.text();
  }

  const edits: Edit[] = [];
  const asyncFunctions = new Set<number>();

  for (const typeReference of typeReferences) {
    const match = /^jest\.([A-Za-z_$][\w$]*)$/.exec(typeReference.text());
    const typeName = match?.[1];
    if (!typeName || !JEST_TYPE_NAMES.has(typeName)) continue;

    edits.push(
      typeReference.replace(
        typeName === "SpyInstance" ? "MockInstance" : typeName,
      ),
    );
  }

  for (const timerReference of timerReferences) {
    const parent = timerReference.parent();
    const isDirectCall =
      parent?.kind() === "call_expression" &&
      parent.field("function")?.id() === timerReference.id();

    if (!isDirectCall) {
      edits.push(timerReference.replace("vi.advanceTimersByTime.bind(vi)"));
    }
  }

  for (const call of calls) {
    const method = call.getMatch("METHOD")?.text();
    if (!method) continue;

    if (method === "enableAutomock") {
      throw new Error(
        "jest.enableAutomock() is not supported by Vitest; migrate this usage manually.",
      );
    }

    // disableAutomock has no meaningful Vitest equivalent and is removed later
    // as a complete statement so we do not leave an empty expression behind.
    if (method === "disableAutomock") continue;

    const replacementName = JEST_API_RENAMES[method] ?? method;
    let replacement: string;

    if (method === "setTimeout") {
      const args = call.getMultipleMatches("ARGS");
      if (args.length !== 1) {
        throw new Error(
          "jest.setTimeout() must have exactly one timeout argument.",
        );
      }
      replacement = `vi.setConfig({ testTimeout: ${args[0]!.text()} })`;
    } else {
      replacement = call
        .text()
        .replace(new RegExp(`^jest\\.${method}`), `vi.${replacementName}`);
    }

    if (
      JEST_ASYNC_APIS.has(method) &&
      call.parent()?.kind() !== "await_expression"
    ) {
      replacement = `await ${replacement}`;

      const enclosingFunction = call
        .ancestors()
        .find((ancestor) => FUNCTION_KINDS.has(ancestor.kind()));

      if (enclosingFunction) {
        const functionText = enclosingFunction.text().trimStart();
        if (!functionText.startsWith("async ")) {
          const start = enclosingFunction.range().start.index;
          if (!asyncFunctions.has(start)) {
            edits.push({
              startPos: start,
              endPos: start,
              insertedText: "async ",
            });
            asyncFunctions.add(start);
          }
        }
      }
    }

    edits.push(call.replace(replacement));
  }

  return edits.length > 0 ? rootNode.commitEdits(edits) : rootNode.text();
}

function migrateSource(source: string): string {
  let output = source;

  // Remove explicit Jest globals imports. Required Vitest imports are rebuilt below.
  output = output.replace(
    /^import\s*\{[^}]*\}\s*from\s*["']@jest\/globals["'];?\s*$/gm,
    "",
  );

  // Jest's focused test helper.
  output = output.replace(/\bfit\s*\(/g, "it.only(");
  output = output.replace(/\bfit\.(each|failing)\b/g, "it.only.$1");

  // Jest's failing API is called "fails" in Vitest.
  output = output.replace(
    /\b(it|test)(\.(?:only|skip))?\.failing\b/g,
    "$1$2.fails",
  );

  // disableAutomock has no meaningful Vitest equivalent.
  output = output.replace(/^\s*jest\.disableAutomock\(\);?\s*$/gm, "");

  // Snapshot formatting used by older Jest serializers.
  output = output.replace(/\bArray \[/g, "[");
  output = output.replace(/\bObject \{/g, "{");

  return output;
}

const codemod: Codemod<TypeScript> = async (root) => {
  const rootNode = root.root();
  const original = rootNode.text();

  if (
    /from\s*["']@playwright\/test["']|require\(\s*["']@playwright\/test["']\s*\)/.test(
      original,
    )
  ) {
    return null;
  }

  const runtimeMigrated = migrateJestRuntimeApis(rootNode);
  let output = migrateSource(runtimeMigrated);

  if (output === original) return null;

  const runtimeImports = new Set<string>();
  const typeImports = new Set<string>();

  if (/\bvi\./.test(output)) runtimeImports.add("vi");
  if (
    /\bit\.only\b/.test(output) &&
    !/\b(?:const|let|var|function|class)\s+it\b/.test(output)
  ) {
    runtimeImports.add("it");
  }

  for (const globalName of JEST_GLOBALS) {
    const callPattern = new RegExp(`\\b${globalName}(?:\\.|\\s*\\()`);
    if (callPattern.test(output)) runtimeImports.add(globalName);
  }

  for (const typeName of JEST_TYPE_NAMES) {
    const migratedTypeName =
      typeName === "SpyInstance" ? "MockInstance" : typeName;
    const typePattern = new RegExp(`\\b${migratedTypeName}(?:\\s*<|\\b)`);
    if (typePattern.test(output)) typeImports.add(migratedTypeName);
  }

  output = mergeVitestImport(output, [...runtimeImports], [...typeImports]);

  return output;
};

export default codemod;
