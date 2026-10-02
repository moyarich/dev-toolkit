import type { SgNode } from "codemod:ast-grep";
import type TypeScript from "codemod:ast-grep/langs/typescript";

/**
 * Test framework represented by one side of a migration mapping.
 */
export type Framework = "jest" | "vitest";

/**
 * Describes how a symbol is used so structurally different usages do not
 * collapse into the same mapping key.
 *
 * For example, `jest.advanceTimersByTime()` is a call while passing
 * `jest.advanceTimersByTime` as a callback is a reference that needs binding.
 */
export type MappingRole =
  | "call"
  | "reference"
  | "type"
  | "bound-reference"
  | "config";

/**
 * Semantic identity for one side of a Jest → Vitest mapping.
 *
 * @property framework Framework that owns the symbol.
 * @property namespace Optional namespace such as `vi`.
 * @property symbol API or type name.
 * @property role Structural use of the symbol.
 * @property detail Optional qualifier for broader targets, such as
 * `testTimeout` when mapping to `vi.setConfig`.
 */
export type MappingIdentity = {
  framework: Framework;
  namespace?: string;
  symbol: string;
  role: MappingRole;
  detail?: string;
};

/**
 * Describes how safely a mapping can be reversed.
 *
 * - `exact`: same API shape and intended semantics.
 * - `semantic`: supported migration, but syntax or behavior differs.
 * - `lossy`: a useful target exists, but information or Jest-specific
 *   behavior cannot be preserved automatically.
 * - `unsupported`: there is no safe direct Vitest equivalent and manual
 *   migration is required.
 */
export type Reversibility =
  | "exact"
  | "semantic"
  | "lossy"
  | "unsupported";

/**
 * Creates a deterministic key for indexing a semantic mapping.
 *
 * @example
 * ```ts
 * createMappingKey({
 *   framework: "vitest",
 *   namespace: "vi",
 *   symbol: "setConfig",
 *   role: "config",
 *   detail: "testTimeout",
 * });
 * // "vitest.vi.setConfig.config.testTimeout"
 * ```
 */
export function createMappingKey(identity: MappingIdentity): string {
  return [
    identity.framework,
    identity.namespace,
    identity.symbol,
    identity.role,
    identity.detail,
  ]
    .filter(Boolean)
    .join(".");
}

/**
 * Defines a mapping and materializes stable source/target keys used for
 * duplicate detection and reverse lookup.
 */
export function defineMapping<
  T extends {
    source: MappingIdentity;
    target: MappingIdentity;
    reversibility: Reversibility;
  },
>(mapping: T): T & { sourceKey: string; targetKey: string } {
  return {
    ...mapping,
    sourceKey: createMappingKey(mapping.source),
    targetKey: createMappingKey(mapping.target),
  };
}

/**
 * Classifies whether a member expression is invoked directly or is used as a
 * first-class reference.
 *
 * This distinction matters for methods such as `advanceTimersByTime` because
 * a detached Vitest method reference must be bound to `vi`.
 */
export function classifyMemberRole(
  node: SgNode<TypeScript>,
): "call" | "reference" {
  const parent = node.parent();
  const isDirectCall =
    parent?.kind() === "call_expression" &&
    parent.field("function")?.id() === node.id();

  return isDirectCall ? "call" : "reference";
}
