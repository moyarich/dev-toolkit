import { describe, expect, it } from "vitest";
import { classifyMemberRole } from "../../src/mapping.ts";

type StubNode = {
  id(): number;
  kind(): string;
  field(name: string): StubNode | null;
  parent(): StubNode | null;
};

function createMember(parentKind: string, directCall: boolean): StubNode {
  const memberId = 2;

  const member: StubNode = {
    id: () => memberId,
    kind: () => "member_expression",
    field: () => null,
    parent: () => parent,
  };

  const callee: StubNode = directCall
    ? member
    : {
        id: () => 3,
        kind: () => "identifier",
        field: () => null,
        parent: () => parent,
      };

  const parent: StubNode = {
    id: () => 1,
    kind: () => parentKind,
    field: (name) => (name === "function" ? callee : null),
    parent: () => null,
  };

  return member;
}

describe("Jest timer AST classification", () => {
  it("classifies a member used as the call target as a call", () => {
    const member = createMember("call_expression", true);

    expect(classifyMemberRole(member as never)).toBe("call");
  });

  it("classifies a bare member value as a reference", () => {
    const member = createMember("variable_declarator", false);

    expect(classifyMemberRole(member as never)).toBe("reference");
  });

  it("does not classify a nested member in a call expression as the call target", () => {
    const member = createMember("call_expression", false);

    expect(classifyMemberRole(member as never)).toBe("reference");
  });
});
