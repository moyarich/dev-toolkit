import assert from "node:assert/strict";
import test from "node:test";
import { extractPageActions } from "../src/generate/codegen.mts";

test("extractPageActions keeps recorded page actions and drops recorder teardown", () => {
  const source = `
    await page.getByRole("button", { name: "Run" }).click();
    await page.getByText("Done").waitFor();
    await context.close();
  `;
  assert.equal(
    extractPageActions(source),
    'await page.getByRole("button", { name: "Run" }).click();\nawait page.getByText("Done").waitFor();',
  );
});
