import assert from "node:assert/strict";
import test from "node:test";
import { getCommandPaletteShortcut, getQuickOpenShortcut } from "../src/vscode/commands.ts";

test("VS Code shortcuts are platform aware", () => {
  assert.equal(getCommandPaletteShortcut("darwin"), "Meta+Shift+P");
  assert.equal(getCommandPaletteShortcut("linux"), "Control+Shift+P");
  assert.equal(getQuickOpenShortcut("darwin"), "Meta+P");
  assert.equal(getQuickOpenShortcut("win32"), "Control+P");
});
