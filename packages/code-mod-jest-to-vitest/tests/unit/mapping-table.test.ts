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

/**
 * Creates a Jest runtime-call mapping to a `vi.*` API.
 */
function viCall(
  jestSymbol: string,
  vitestSymbol = jestSymbol,
  reversibility: Reversibility = "exact",
): ProposedMapping {
  return {
    name: `jest.${jestSymbol}`,
    source: { framework: "jest", symbol: jestSymbol, role: "call" },
    target: {
      framework: "vitest",
      namespace: "vi",
      symbol: vitestSymbol,
      role: "call",
    },
    reversibility,
  };
}

/**
 * Creates a Jest namespace type mapping to a type exported by `vitest`.
 */
function vitestType(
  jestSymbol: string,
  vitestSymbol = jestSymbol,
  reversibility: Reversibility = "exact",
): ProposedMapping {
  return {
    name: `jest.${jestSymbol}`,
    source: { framework: "jest", symbol: jestSymbol, role: "type" },
    target: {
      framework: "vitest",
      symbol: vitestSymbol,
      role: "type",
    },
    reversibility,
  };
}

/**
 * Creates an explicitly one-way mapping for APIs that cannot be translated
 * safely without project-specific or human decisions.
 */
function manualMigration(
  jestSymbol: string,
  detail: string,
  reversibility: Extract<Reversibility, "lossy" | "unsupported"> = "unsupported",
): ProposedMapping {
  return {
    name: `jest.${jestSymbol}`,
    source: { framework: "jest", symbol: jestSymbol, role: "call" },
    target: {
      framework: "vitest",
      symbol: reversibility === "lossy" ? "removed" : "unsupported",
      role: "reference",
      detail,
    },
    reversibility,
  };
}

/**
 * Jest-object API coverage used as the semantic contract for the codemod.
 *
 * This table intentionally distinguishes exact renames from migrations that
 * change async behavior, collapse multiple Jest APIs into one Vitest API, or
 * require manual work.
 */
const proposedMappings: ProposedMapping[] = [
  // Module mocking.
  manualMigration("disableAutomock", "no-equivalent", "lossy"),
  manualMigration("enableAutomock", "manual-automock-setup"),
  viCall("createMockFromModule", "importMock", "lossy"),
  viCall("genMockFromModule", "importMock", "lossy"),
  viCall("mock", "mock", "semantic"),
  viCall("mocked"),
  viCall("unmock", "unmock", "semantic"),
  viCall("deepUnmock", "unmock", "lossy"),
  viCall("doMock", "doMock", "semantic"),
  viCall("dontMock", "doUnmock", "semantic"),
  viCall("setMock", "mock", "lossy"),
  viCall("requireActual", "importActual", "semantic"),
  viCall("requireMock", "importMock", "lossy"),
  viCall("resetModules", "resetModules", "semantic"),
  manualMigration("isolateModules", "no-direct-equivalent"),
  manualMigration("isolateModulesAsync", "no-direct-equivalent"),

  // Mock functions.
  viCall("fn"),
  viCall("isMockFunction"),
  manualMigration("replaceProperty", "use-spyOn-or-stub-api"),
  viCall("spyOn"),
  viCall("clearAllMocks"),
  viCall("resetAllMocks", "resetAllMocks", "semantic"),
  viCall("restoreAllMocks"),

  // Fake timers.
  viCall("useFakeTimers", "useFakeTimers", "semantic"),
  viCall("useRealTimers"),
  viCall("runAllTicks"),
  viCall("runAllTimers"),
  viCall("runAllTimersAsync"),
  manualMigration("runAllImmediates", "legacy-timers-only"),
  viCall("advanceTimersByTime"),
  viCall("advanceTimersByTimeAsync"),
  viCall("runOnlyPendingTimers"),
  viCall("runOnlyPendingTimersAsync"),
  viCall("advanceTimersToNextTimer"),
  viCall("advanceTimersToNextTimerAsync"),
  viCall("clearAllTimers"),
  viCall("getTimerCount"),
  {
    name: "jest.now",
    source: { framework: "jest", symbol: "now", role: "call" },
    target: {
      framework: "vitest",
      symbol: "Date.now",
      role: "call",
      detail: "mocked-clock",
    },
    reversibility: "semantic",
  },
  viCall("setSystemTime"),
  viCall("getRealSystemTime"),

  // Miscellaneous Jest-object APIs.
  manualMigration("getSeed", "read-vitest-config-seed"),
  manualMigration("isEnvironmentTornDown", "no-direct-equivalent"),
  {
    name: "jest.retryTimes",
    source: { framework: "jest", symbol: "retryTimes", role: "call" },
    target: {
      framework: "vitest",
      symbol: "retry",
      role: "config",
      detail: "test-or-config-option",
    },
    reversibility: "semantic",
  },
  {
    name: "jest.setTimeout",
    source: { framework: "jest", symbol: "setTimeout", role: "call" },
    target: {
      framework: "vitest",
      namespace: "vi",
      symbol: "setConfig",
      role: "config",
      detail: "testTimeout",
    },
    reversibility: "semantic",
  },

  // Jest namespace types supported by the transform.
  vitestType("Mock"),
  vitestType("Mocked"),
  vitestType("MockedClass"),
  vitestType("MockedFunction"),
  vitestType("MockedObject"),
  vitestType("Spied"),
  vitestType("SpiedClass"),
  vitestType("SpiedFunction"),
  vitestType("SpiedGetter"),
  vitestType("SpiedSetter"),
  vitestType("SpyInstance", "MockInstance", "semantic"),

  // A direct call and a detached reference are different transformations.
  viCall("advanceTimersByTime"),
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
];

// Remove the duplicate call entry used above so the table keeps one source
// identity while still placing the detached-reference mapping beside it.
const uniqueProposedMappings = proposedMappings.filter(
  (mapping, index, all) =>
    all.findIndex(
      (candidate) =>
        createMappingKey(candidate.source) === createMappingKey(mapping.source),
    ) === index,
);

const mappings = uniqueProposedMappings.map(defineMapping);

/**
 * Builds a reverse index because a Vitest target can intentionally represent
 * more than one Jest source API.
 */
function buildReverseIndex() {
  const reverseIndex = new Map<string, string[]>();

  for (const mapping of mappings) {
    const sources = reverseIndex.get(mapping.targetKey) ?? [];
    sources.push(mapping.sourceKey);
    reverseIndex.set(mapping.targetKey, sources);
  }

  return reverseIndex;
}

/**
 * Prints the mapping contract in Markdown-friendly text when the unit tests run.
 */
function printMappingReport() {
  const reverseIndex = buildReverseIndex();

  console.log("\n## Jest → Vitest mapping table\n");
  console.log("| Mapping | Source | Target | Reversibility |");
  console.log("| --- | --- | --- | --- |");

  for (const mapping of mappings) {
    const reverseCandidates = reverseIndex.get(mapping.targetKey) ?? [];
    const suffix =
      reverseCandidates.length > 1
        ? ` (shared by ${reverseCandidates.length} Jest APIs)`
        : "";

    console.log(
      `| ${mapping.name} | \`${mapping.sourceKey}\` | \`${mapping.targetKey}\` | ${mapping.reversibility}${suffix} |`,
    );
  }
}

describe("Jest to Vitest mapping model", () => {
  printMappingReport();

  it("covers the documented Jest object runtime API surface", () => {
    const expectedRuntimeApis = [
      "disableAutomock",
      "enableAutomock",
      "createMockFromModule",
      "genMockFromModule",
      "mock",
      "mocked",
      "unmock",
      "deepUnmock",
      "doMock",
      "dontMock",
      "setMock",
      "requireActual",
      "requireMock",
      "resetModules",
      "isolateModules",
      "isolateModulesAsync",
      "fn",
      "isMockFunction",
      "replaceProperty",
      "spyOn",
      "clearAllMocks",
      "resetAllMocks",
      "restoreAllMocks",
      "useFakeTimers",
      "useRealTimers",
      "runAllTicks",
      "runAllTimers",
      "runAllTimersAsync",
      "runAllImmediates",
      "advanceTimersByTime",
      "advanceTimersByTimeAsync",
      "runOnlyPendingTimers",
      "runOnlyPendingTimersAsync",
      "advanceTimersToNextTimer",
      "advanceTimersToNextTimerAsync",
      "clearAllTimers",
      "getTimerCount",
      "now",
      "setSystemTime",
      "getRealSystemTime",
      "getSeed",
      "isEnvironmentTornDown",
      "retryTimes",
      "setTimeout",
    ];

    const mappedRuntimeApis = mappings
      .filter(({ source }) => source.role === "call")
      .map(({ source }) => source.symbol);

    expect(new Set(mappedRuntimeApis)).toEqual(new Set(expectedRuntimeApis));
  });

  it("covers every Jest namespace type supported by the codemod", () => {
    expect(
      mappings
        .filter(({ source }) => source.role === "type")
        .map(({ source }) => source.symbol)
        .sort(),
    ).toEqual(
      [
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
      ].sort(),
    );
  });

  it("keeps source identities unique", () => {
    const sourceKeys = mappings.map(({ sourceKey }) => sourceKey);
    expect(new Set(sourceKeys).size).toBe(sourceKeys.length);
  });

  it("maps direct equivalents to the vi namespace", () => {
    for (const symbol of [
      "fn",
      "isMockFunction",
      "spyOn",
      "clearAllMocks",
      "restoreAllMocks",
      "useRealTimers",
      "runAllTicks",
      "runAllTimers",
      "runAllTimersAsync",
      "advanceTimersByTime",
      "advanceTimersByTimeAsync",
      "runOnlyPendingTimers",
      "runOnlyPendingTimersAsync",
      "advanceTimersToNextTimer",
      "advanceTimersToNextTimerAsync",
      "clearAllTimers",
      "getTimerCount",
      "setSystemTime",
      "getRealSystemTime",
    ]) {
      const mapping = mappings.find(
        ({ sourceKey }) => sourceKey === `jest.${symbol}.call`,
      );

      expect(mapping?.targetKey).toBe(`vitest.vi.${symbol}.call`);
    }
  });

  it("records renamed module APIs explicitly", () => {
    const expected = {
      "jest.requireActual.call": "vitest.vi.importActual.call",
      "jest.requireMock.call": "vitest.vi.importMock.call",
      "jest.createMockFromModule.call": "vitest.vi.importMock.call",
      "jest.genMockFromModule.call": "vitest.vi.importMock.call",
      "jest.dontMock.call": "vitest.vi.doUnmock.call",
      "jest.setMock.call": "vitest.vi.mock.call",
      "jest.deepUnmock.call": "vitest.vi.unmock.call",
    };

    for (const [sourceKey, targetKey] of Object.entries(expected)) {
      expect(
        mappings.find((mapping) => mapping.sourceKey === sourceKey)?.targetKey,
      ).toBe(targetKey);
    }
  });

  it("allows multiple Jest APIs to intentionally share one Vitest target", () => {
    expect(buildReverseIndex().get("vitest.vi.importMock.call")).toEqual([
      "jest.createMockFromModule.call",
      "jest.genMockFromModule.call",
      "jest.requireMock.call",
    ]);
  });

  it("never marks a shared reverse target as exactly reversible", () => {
    for (const targetMappings of [...buildReverseIndex().entries()]
      .filter(([, sources]) => sources.length > 1)
      .map(([targetKey]) =>
        mappings.filter((mapping) => mapping.targetKey === targetKey),
      )) {
      expect(
        targetMappings.every(
          ({ reversibility }) => reversibility !== "exact",
        ),
      ).toBe(true);
    }
  });

  it("models Jest-only APIs as explicit manual migrations", () => {
    for (const symbol of [
      "enableAutomock",
      "isolateModules",
      "isolateModulesAsync",
      "replaceProperty",
      "runAllImmediates",
      "getSeed",
      "isEnvironmentTornDown",
    ]) {
      const mapping = mappings.find(
        ({ sourceKey }) => sourceKey === `jest.${symbol}.call`,
      );

      expect(mapping?.reversibility).toBe("unsupported");
      expect(mapping?.target.symbol).toBe("unsupported");
    }
  });

  it("models intentionally removed automock behavior separately", () => {
    const mapping = mappings.find(
      ({ sourceKey }) => sourceKey === "jest.disableAutomock.call",
    );

    expect(mapping).toMatchObject({
      targetKey: "vitest.removed.reference.no-equivalent",
      reversibility: "lossy",
    });
  });

  it("captures structural migrations that are not simple renames", () => {
    expect(
      mappings.find(
        ({ sourceKey }) => sourceKey === "jest.setTimeout.call",
      )?.target,
    ).toEqual({
      framework: "vitest",
      namespace: "vi",
      symbol: "setConfig",
      role: "config",
      detail: "testTimeout",
    });

    expect(
      mappings.find(({ sourceKey }) => sourceKey === "jest.retryTimes.call")
        ?.target,
    ).toEqual({
      framework: "vitest",
      symbol: "retry",
      role: "config",
      detail: "test-or-config-option",
    });

    expect(
      mappings.find(({ sourceKey }) => sourceKey === "jest.now.call")?.target,
    ).toEqual({
      framework: "vitest",
      symbol: "Date.now",
      role: "call",
      detail: "mocked-clock",
    });
  });

  it("distinguishes timer calls from detached timer references", () => {
    expect(
      mappings
        .filter(({ source }) => source.symbol === "advanceTimersByTime")
        .map(({ sourceKey, targetKey, reversibility }) => ({
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

  it("maps SpyInstance to Vitest MockInstance", () => {
    expect(
      mappings.find(
        ({ sourceKey }) => sourceKey === "jest.SpyInstance.type",
      ),
    ).toMatchObject({
      targetKey: "vitest.MockInstance.type",
      reversibility: "semantic",
    });
  });

  it("uses target detail to keep broader config mappings distinct", () => {
    expect(
      createMappingKey({
        framework: "vitest",
        namespace: "vi",
        symbol: "setConfig",
        role: "config",
        detail: "testTimeout",
      }),
    ).not.toBe(
      createMappingKey({
        framework: "vitest",
        namespace: "vi",
        symbol: "setConfig",
        role: "config",
        detail: "hookTimeout",
      }),
    );
  });

  it("would detect an accidental duplicate source mapping", () => {
    const duplicate = defineMapping({
      source: { framework: "jest", symbol: "fn", role: "call" },
      target: {
        framework: "vitest",
        namespace: "vi",
        symbol: "mocked",
        role: "call",
      },
      reversibility: "semantic" as const,
    });

    const sourceKeys = [
      ...mappings.map(({ sourceKey }) => sourceKey),
      duplicate.sourceKey,
    ];

    expect(new Set(sourceKeys).size).toBeLessThan(sourceKeys.length);
  });
});
