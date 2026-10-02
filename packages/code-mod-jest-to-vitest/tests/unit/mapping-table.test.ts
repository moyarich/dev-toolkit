import { describe, expect, it } from "vitest";
import { defineMapping } from "../../src/mapping.ts";

const mappings = [
  defineMapping({
    source: {
      framework: "jest" as const,
      symbol: "fn",
      role: "call" as const,
    },
    target: {
      framework: "vitest" as const,
      namespace: "vi",
      symbol: "fn",
      role: "call" as const,
    },
    reversibility: "exact" as const,
  }),
  defineMapping({
    source: {
      framework: "jest" as const,
      symbol: "requireActual",
      role: "call" as const,
    },
    target: {
      framework: "vitest" as const,
      namespace: "vi",
      symbol: "importActual",
      role: "call" as const,
    },
    reversibility: "semantic" as const,
  }),
  defineMapping({
    source: {
      framework: "jest" as const,
      symbol: "createMockFromModule",
      role: "call" as const,
    },
    target: {
      framework: "vitest" as const,
      namespace: "vi",
      symbol: "importMock",
      role: "call" as const,
    },
    reversibility: "lossy" as const,
  }),
  defineMapping({
    source: {
      framework: "jest" as const,
      symbol: "enableAutomock",
      role: "call" as const,
    },
    target: {
      framework: "vitest" as const,
      symbol: "unsupported",
      role: "reference" as const,
    },
    reversibility: "unsupported" as const,
  }),
];

describe("semantic mapping table", () => {
  it("uses unique source keys", () => {
    const sourceKeys = mappings.map((mapping) => mapping.sourceKey);
    expect(new Set(sourceKeys).size).toBe(sourceKeys.length);
  });

  it("allows many Jest APIs to collapse to one Vitest target", () => {
    const importMockMappings = [
      defineMapping({
        source: {
          framework: "jest" as const,
          symbol: "requireMock",
          role: "call" as const,
        },
        target: {
          framework: "vitest" as const,
          namespace: "vi",
          symbol: "importMock",
          role: "call" as const,
        },
        reversibility: "lossy" as const,
      }),
      defineMapping({
        source: {
          framework: "jest" as const,
          symbol: "genMockFromModule",
          role: "call" as const,
        },
        target: {
          framework: "vitest" as const,
          namespace: "vi",
          symbol: "importMock",
          role: "call" as const,
        },
        reversibility: "lossy" as const,
      }),
    ];

    expect(importMockMappings.map((mapping) => mapping.targetKey)).toEqual([
      "vitest.vi.importMock.call",
      "vitest.vi.importMock.call",
    ]);
  });

  it("keeps reversibility metadata explicit", () => {
    expect(
      mappings.map(({ sourceKey, reversibility }) => ({
        sourceKey,
        reversibility,
      })),
    ).toEqual([
      { sourceKey: "jest.fn.call", reversibility: "exact" },
      {
        sourceKey: "jest.requireActual.call",
        reversibility: "semantic",
      },
      {
        sourceKey: "jest.createMockFromModule.call",
        reversibility: "lossy",
      },
      {
        sourceKey: "jest.enableAutomock.call",
        reversibility: "unsupported",
      },
    ]);
  });
});
