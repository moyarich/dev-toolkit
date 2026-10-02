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
];

const mappings = proposedMappings.map(defineMapping);

describe("proposed Jest to Vitest mapping model", () => {
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

    expect(
      createMappingKey(timeout!.target),
    ).toBe("vitest.vi.setConfig.config.testTimeout");
  });
});
