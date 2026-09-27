import assert from "node:assert/strict";
import test from "node:test";

test("package-qualified tags split at the final @", () => {
  const tag = "css-expand-collapse@1.2.3";
  const at = tag.lastIndexOf("@");
  assert.equal(tag.slice(0, at), "css-expand-collapse");
  assert.equal(tag.slice(at + 1), "1.2.3");
});

test("registry both expands to both publish destinations", () => {
  const registry = "both";
  assert.deepEqual(registry === "both" ? ["github", "npm"] : [registry], ["github", "npm"]);
});

test("npm distribution tags require an alphabetic first character", () => {
  const valid = /^[A-Za-z][A-Za-z0-9._-]*$/;
  assert.equal(valid.test("latest"), true);
  assert.equal(valid.test("next-1"), true);
  assert.equal(valid.test("1latest"), false);
});
