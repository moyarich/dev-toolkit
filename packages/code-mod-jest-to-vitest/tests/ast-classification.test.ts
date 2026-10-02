import { parse } from "codemod:ast-grep";
import type TypeScript from "codemod:ast-grep/langs/typescript";
import { describe, expect, it } from "vitest";

function classifyAdvanceTimersByTime(source: string): {
  kind: string;
  parentKind: string | null;
  role: "call" | "reference";
} {
  const root = parse<TypeScript>("typescript", source).root();
  const member = root.find({
    rule: { pattern: "jest.advanceTimersByTime" },
  });

  if (!member) {
    throw new Error("jest.advanceTimersByTime was not found");
  }

  const parent = member.parent();
  const isDirectCall =
    parent?.kind() === "call_expression" &&
    parent.field("function")?.id() === member.id();

  return {
    kind: member.kind(),
    parentKind: parent?.kind() ?? null,
    role: isDirectCall ? "call" : "reference",
  };
}

describe("Jest timer AST classification", () => {
  it("classifies jest.advanceTimersByTime(100) as a call", () => {
    expect(classifyAdvanceTimersByTime("jest.advanceTimersByTime(100)")).toEqual({
      kind: "member_expression",
      parentKind: "call_expression",
      role: "call",
    });
  });

  it("classifies a bare jest.advanceTimersByTime value as a reference", () => {
    expect(
      classifyAdvanceTimersByTime(
        "const advance = jest.advanceTimersByTime;",
      ),
    ).toEqual({
      kind: "member_expression",
      parentKind: "variable_declarator",
      role: "reference",
    });
  });
});
