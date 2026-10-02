import { describe, expect, it } from "vitest";
import {
  createMappingKey,
  defineMapping,
} from "../../src/mapping.ts";

describe("semantic mapping keys", () => {
  it("creates a Jest call key", () => {
    expect(
      createMappingKey({
        framework: "jest",
        symbol: "advanceTimersByTime",
        role: "call",
      }),
    ).toBe("jest.advanceTimersByTime.call");
  });

  it("creates a Vitest namespaced key", () => {
    expect(
      createMappingKey({
        framework: "vitest",
        namespace: "vi",
        symbol: "importActual",
        role: "call",
      }),
    ).toBe("vitest.vi.importActual.call");
  });

  it("supports structural detail for config mappings", () => {
    expect(
      createMappingKey({
        framework: "vitest",
        namespace: "vi",
        symbol: "setConfig",
        role: "config",
        detail: "testTimeout",
      }),
    ).toBe("vitest.vi.setConfig.config.testTimeout");
  });

  it("adds source and target keys to a mapping definition", () => {
    expect(
      defineMapping({
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
      }),
    ).toMatchObject({
      sourceKey: "jest.requireActual.call",
      targetKey: "vitest.vi.importActual.call",
      reversibility: "semantic",
    });
  });
});
