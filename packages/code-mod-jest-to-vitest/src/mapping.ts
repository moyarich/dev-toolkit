import type { SgNode } from "codemod:ast-grep";
import type TypeScript from "codemod:ast-grep/langs/typescript";

export type Framework = "jest" | "vitest";
export type MappingRole =
  | "call"
  | "reference"
  | "type"
  | "bound-reference"
  | "config";

export type MappingIdentity = {
  framework: Framework;
  namespace?: string;
  symbol: string;
  role: MappingRole;
  detail?: string;
};

export type Reversibility =
  | "exact"
  | "semantic"
  | "lossy"
  | "unsupported";

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

export function classifyMemberRole(
  node: SgNode<TypeScript>,
): "call" | "reference" {
  const parent = node.parent();
  const isDirectCall =
    parent?.kind() === "call_expression" &&
    parent.field("function")?.id() === node.id();

  return isDirectCall ? "call" : "reference";
}
