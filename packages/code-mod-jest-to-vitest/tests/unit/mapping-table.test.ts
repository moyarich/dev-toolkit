import { describe, expect, it } from "vitest";
import {
  createMappingKey,
  defineMapping,
  type MappingIdentity,
  type Reversibility,
} from "../../src/mapping.ts";

type ProposedMapping = {
  name: string;
  source: MappingIdentity;
  target: MappingIdentity;
  reversibility: Reversibility;
};

const proposedMappings: ProposedMapping[] = [
  {
    name: "jest.fn",
    source: {
      framework: "jest",
      symbol: "fn",
      role: "call",
    },
    target: {
      framework: "vitest",
      namespace: "vi",
      symbol: "fn",
      role: "call",
    },
    reversibility: "exact",
  },
  {
    name: "jest.spyOn",
    source: {
      framework: "jest",
      symbol: "spyOn",
      role: "call",
    },
    target: {
      framework: "vitest",
      namespace: "vi",
      symbol: "spyOn",
      role: "call",
    },
    reversibility: "exact",
  },
  {
    name: "jest.requireActual",
    source: {
      framework: "jest",
      symbol: "requireActual",
      role: "call",
    },
    target: {
      framework: "vitest",
      namespace: "vi",
      symbol: "importActual",
      role: "call",
    },
    reversibility: "semantic",
  },
  {
    name: "jest.requireMock",
    source: {
      framework: "jest",
      symbol: "requireMock",
      role: "call",
    },
    target: {
      framework: "vitest",
      namespace: "vi",
      symbol: "importMock",
      role: "call",
    },
    reversibility: "lossy",
  },
  {
    name: "jest.createMockFromModule",
    source: {
      framework: "jest",
      symbol: "createMockFromModule",
      role: "call",
    },
    target: {
      framework: "vitest",
      namespace: "vi",
      symbol: "importMock",
      role: "call",
    },
    reversibility: "lossy",
  },
  {
    name: "jest.genMockFromModule",
    source: {
      framework: "jest",
      symbol: "genMockFromModule",
      role: "call",
    },
    target: {
      framework: "vitest",
      namespace: "vi",
      symbol: "importMock",
      role: "call",
    },
    reversibility: "lossy",
  },
  {
    name: "jest.setTimeout",
    source: {
      framework: "jest",
      symbol: "setTimeout",
      role: "call",
    },
    target: {
      framework: "vitest",
      namespace: "vi",
      symbol: "setConfig",
      role: "config",
      detail: "testTimeout",
    },
    reversibility: "semantic",
  },
  {
    name: "jest.advanceTimersByTime call",
    source: {
      framework: "jest",
      symbol: "advanceTimersByTime",
      role: "call",
    },
    target: {
      framework: "vitest",
      namespace: "vi",
      symbol: "advanceTimersByTime",
      role: "call",
    },
    reversibility: "exact",
  },
  {
    name: "jest.advanceTimersByTime reference",
    source: {
      framework: "jest",
      symbol: "advanceTimersByTime",
      role: "reference",
    },
    target: {
      framework: "vitest",
      namespace: "vi",
      symbol: "advanceTimersByTime",
      role: "bound-reference",
    },
    reversibility: "semantic",
  },
  {
    name: "jest.SpyInstance",
    source: {
      framework: "jest",
      symbol: "SpyInstance",
      role: "type",
    },
    target: {
      framework: "vitest",
      symbol: "MockInstance",
      role: "type",
    },
    reversibility: "semantic",
  },
  {
    name: "jest.disableAutomock",
    source: {
      framework: "jest",
      symbol: "disableAutomock",
      role: "call",
    },
    target: {
      framework: "vitest",
      symbol: "removed",
      role: "reference",
      detail: "no-equivalent",
    },
    reversibility: "lossy",
  },
  {
    name: "jest.enableAutomock",
    source: {
      framework: "jest",
      symbol: "enableAutomock",
      role: "call",
    },
    target: {
      framework: "vitest",
      symbol: "unsupported",
      role: "reference",
      detail: "manual-migration",
    },
    reversibility: "unsupported",
  },
];

const mappings = proposedMappings.map(defineMapping);

function buildReverseIndex() {
  const reverseIndex = new Map<string, string[]>();

  for (const mapping of mappings) {
    const sources = reverseIndex.get(mapping.targetKey) ?? [];
    sources.push(mapping.sourceKey);
    reverseIndex.set(mapping.targetKey, sources);
  }

  return reverseIndex;
}

function printMappingReport() {
  const reverseIndex = buildReverseIndex();

  console.log("\nJest → Vitest mapping table");
  console.log("=".repeat(96));

  for (const mapping of mappings) {
    const reverseCandidates = reverseIndex.get(mapping.targetKey) ?? [];
    const ambiguous = reverseCandidates.length > 1;

    console.log(
      [
        mapping.name,
        `  source: ${mapping.sourceKey}`,
        `  target: ${mapping.targetKey}`,
        `  reversibility: ${mapping.reversibility}`,
        ambiguous
          ? `  reverse candidates: ${reverseCandidates.join(", ")}`
          : `  reverse candidate: ${reverseCandidates[0] ?? "none"}`,
      ].join("\n"),
    );

    console.log("-".repeat(96));
  }
}


describe("proposed Jest to Vitest mapping model", () => {
  printMappingReport();
  it("generates stable source and target keys from semantic metadata", () => {
    expect(
      mappings.map(({ name, sourceKey, targetKey }) => ({
        name,
        sourceKey,
        targetKey,
      })),
    ).toEqual([
      {
        name: "jest.fn",
        sourceKey: "jest.fn.call",
        targetKey: "vitest.vi.fn.call",
      },
      {
        name: "jest.spyOn",
        sourceKey: "jest.spyOn.call",
        targetKey: "vitest.vi.spyOn.call",
      },
      {
        name: "jest.requireActual",
        sourceKey: "jest.requireActual.call",
        targetKey: "vitest.vi.importActual.call",
      },
      {
        name: "jest.requireMock",
        sourceKey: "jest.requireMock.call",
        targetKey: "vitest.vi.importMock.call",
      },
      {
        name: "jest.createMockFromModule",
        sourceKey: "jest.createMockFromModule.call",
        targetKey: "vitest.vi.importMock.call",
      },
      {
        name: "jest.genMockFromModule",
        sourceKey: "jest.genMockFromModule.call",
        targetKey: "vitest.vi.importMock.call",
      },
      {
        name: "jest.setTimeout",
        sourceKey: "jest.setTimeout.call",
        targetKey: "vitest.vi.setConfig.config.testTimeout",
      },
      {
        name: "jest.advanceTimersByTime call",
        sourceKey: "jest.advanceTimersByTime.call",
        targetKey: "vitest.vi.advanceTimersByTime.call",
      },
      {
        name: "jest.advanceTimersByTime reference",
        sourceKey: "jest.advanceTimersByTime.reference",
        targetKey: "vitest.vi.advanceTimersByTime.bound-reference",
      },
      {
        name: "jest.SpyInstance",
        sourceKey: "jest.SpyInstance.type",
        targetKey: "vitest.MockInstance.type",
      },
      {
        name: "jest.disableAutomock",
        sourceKey: "jest.disableAutomock.call",
        targetKey: "vitest.removed.reference.no-equivalent",
      },
      {
        name: "jest.enableAutomock",
        sourceKey: "jest.enableAutomock.call",
        targetKey: "vitest.unsupported.reference.manual-migration",
      },
    ]);
  });

  it("keeps source identities unique", () => {
    const sourceKeys = mappings.map(({ sourceKey }) => sourceKey);

    expect(new Set(sourceKeys).size).toBe(sourceKeys.length);
  });

  it("allows multiple Jest APIs to intentionally share one Vitest target", () => {
    const reverseIndex = new Map<string, string[]>();

    for (const mapping of mappings) {
      const sources = reverseIndex.get(mapping.targetKey) ?? [];
      sources.push(mapping.sourceKey);
      reverseIndex.set(mapping.targetKey, sources);
    }

    expect(reverseIndex.get("vitest.vi.importMock.call")).toEqual([
      "jest.requireMock.call",
      "jest.createMockFromModule.call",
      "jest.genMockFromModule.call",
    ]);
  });

  it("marks shared reverse targets as lossy", () => {
    const importMockMappings = mappings.filter(
      ({ targetKey }) => targetKey === "vitest.vi.importMock.call",
    );

    expect(
      importMockMappings.map(({ reversibility }) => reversibility),
    ).toEqual(["lossy", "lossy", "lossy"]);
  });

  it("distinguishes call and reference semantics for the same Jest API", () => {
    const timerMappings = mappings.filter(
      ({ source }) => source.symbol === "advanceTimersByTime",
    );

    expect(
      timerMappings.map(({ sourceKey, targetKey, reversibility }) => ({
        sourceKey,
        targetKey,
        reversibility,
      })),
    ).toEqual([
      {
        sourceKey: "jest.advanceTimersByTime.call",
        targetKey: "vitest.vi.advanceTimersByTime.call",
        reversibility: "exact",
      },
      {
        sourceKey: "jest.advanceTimersByTime.reference",
        targetKey: "vitest.vi.advanceTimersByTime.bound-reference",
        reversibility: "semantic",
      },
    ]);
  });

  it("supports structural target details when the target API is broader than the Jest API", () => {
    const timeout = mappings.find(
      ({ sourceKey }) => sourceKey === "jest.setTimeout.call",
    );

    expect(timeout?.target).toEqual({
      framework: "vitest",
      namespace: "vi",
      symbol: "setConfig",
      role: "config",
      detail: "testTimeout",
    });

    expect(createMappingKey(timeout!.target)).toBe(
      "vitest.vi.setConfig.config.testTimeout",
    );
  });

  it("does not treat a shared reverse target as exactly reversible", () => {
    const byTarget = new Map<string, typeof mappings>();

    for (const mapping of mappings) {
      const entries = byTarget.get(mapping.targetKey) ?? [];
      entries.push(mapping);
      byTarget.set(mapping.targetKey, entries);
    }

    const sharedTargets = [...byTarget.values()].filter(
      (entries) => entries.length > 1,
    );

    for (const entries of sharedTargets) {
      expect(entries.every(({ reversibility }) => reversibility !== "exact")).toBe(
        true,
      );
    }
  });

  it("keeps structurally different uses of the same symbol from colliding", () => {
    const callKey = createMappingKey({
      framework: "jest",
      symbol: "advanceTimersByTime",
      role: "call",
    });
    const referenceKey = createMappingKey({
      framework: "jest",
      symbol: "advanceTimersByTime",
      role: "reference",
    });

    expect(callKey).not.toBe(referenceKey);
  });

  it("uses target detail to prevent broader config APIs from colliding", () => {
    const testTimeout = createMappingKey({
      framework: "vitest",
      namespace: "vi",
      symbol: "setConfig",
      role: "config",
      detail: "testTimeout",
    });
    const hookTimeout = createMappingKey({
      framework: "vitest",
      namespace: "vi",
      symbol: "setConfig",
      role: "config",
      detail: "hookTimeout",
    });

    expect(testTimeout).not.toBe(hookTimeout);
  });

  it("models APIs with no Vitest equivalent as explicitly one-way", () => {
    expect(
      mappings
        .filter(({ source }) =>
          ["disableAutomock", "enableAutomock"].includes(source.symbol),
        )
        .map(({ sourceKey, targetKey, reversibility }) => ({
          sourceKey,
          targetKey,
          reversibility,
        })),
    ).toEqual([
      {
        sourceKey: "jest.disableAutomock.call",
        targetKey: "vitest.removed.reference.no-equivalent",
        reversibility: "lossy",
      },
      {
        sourceKey: "jest.enableAutomock.call",
        targetKey: "vitest.unsupported.reference.manual-migration",
        reversibility: "unsupported",
      },
    ]);
  });

  it("makes reverse lookup return candidates instead of pretending it is one-to-one", () => {
    const reverseLookup = (targetKey: string) =>
      mappings
        .filter((mapping) => mapping.targetKey === targetKey)
        .map((mapping) => mapping.sourceKey);

    expect(reverseLookup("vitest.vi.importMock.call")).toEqual([
      "jest.requireMock.call",
      "jest.createMockFromModule.call",
      "jest.genMockFromModule.call",
    ]);
  });

  it("would detect an accidental duplicate source mapping", () => {
    const duplicate = defineMapping({
      source: {
        framework: "jest",
        symbol: "fn",
        role: "call",
      },
      target: {
        framework: "vitest",
        namespace: "vi",
        symbol: "mocked",
        role: "call",
      },
      reversibility: "semantic",
    });

    const sourceKeys = [...mappings.map(({ sourceKey }) => sourceKey), duplicate.sourceKey];

    expect(new Set(sourceKeys).size).toBeLessThan(sourceKeys.length);
  });
});
