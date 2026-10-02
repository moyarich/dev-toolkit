import { test, expect } from "@playwright/test";

const mock = jest.fn();

test("browser flow", async ({ page }) => {
  expect(mock).toBeDefined();
  await page.goto("/");
});
