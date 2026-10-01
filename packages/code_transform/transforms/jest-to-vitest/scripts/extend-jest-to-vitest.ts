import type { Codemod } from "codemod:ast-grep";
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
]);

const codemod: Codemod<TypeScript> = (root) => {
  const rootNode = root.root();
  const edits = [];

  for (const node of rootNode.findAll({
    rule: {
      pattern: "jest.$METHOD($$$ARGS)",
    },
  })) {
    edits.push(node.replace(node.text().replace(/^jest\./, "vi.")));
  }

  for (const node of rootNode.findAll({
    rule: {
      pattern: "jest.$TYPE",
    },
  })) {
    const typeName = node.getMatch("TYPE")?.text();
    if (!typeName || !JEST_TYPE_NAMES.has(typeName)) continue;

    edits.push(node.replace(typeName));
  }

  if (edits.length === 0) return null;

  let output = rootNode.commitEdits(edits);

  const needsVi = /\bvi\./.test(output);
  const usedTypes = [...JEST_TYPE_NAMES].filter((name) =>
    new RegExp(`\\b${name}(?:\\s*<|\\b)`).test(output),
  );

  if (!needsVi && usedTypes.length === 0) return output;

  const importParts = [
    ...(needsVi ? ["vi"] : []),
    ...usedTypes.map((name) => `type ${name}`),
  ];

  if (/from\s+["']vitest["']/.test(output)) {
    output = output.replace(
      /import\s*\{([^}]*)\}\s*from\s*["']vitest["'];?/,
      (_match, existing: string) => {
        const existingParts = existing
          .split(",")
          .map((part) => part.trim())
          .filter(Boolean);
        const merged = [...new Set([...existingParts, ...importParts])];
        return `import { ${merged.join(", ")} } from "vitest";`;
      },
    );
  } else {
    output = `import { ${importParts.join(", ")} } from "vitest";\n${output}`;
  }

  return output;
};

export default codemod;
