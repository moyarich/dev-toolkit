const assert = require("node:assert/strict");
const { access } = require("node:fs/promises");
const { pathToFileURL } = require("node:url");
const vscode = require("vscode");

exports.run = async function run() {
  const completionFile = process.env.DEMO_TOOLS_COMPLETION_FILE;
  const extensionId = process.env.DEMO_TOOLS_EXTENSION_ID;
  const setupFile = process.env.DEMO_TOOLS_HOST_SETUP;
  const sourceFile = process.env.DEMO_TOOLS_SOURCE_FILE;

  assert.ok(
    completionFile && extensionId,
    "demo-tools completion file and extension ID are required.",
  );
  const extension = vscode.extensions.getExtension(extensionId);
  assert.ok(extension, `Extension must be loaded: ${extensionId}`);
  await extension.activate();

  if (setupFile) {
    const setup = await import(pathToFileURL(setupFile).href);
    const prepare = setup.prepare ?? setup.default;
    assert.equal(
      typeof prepare,
      "function",
      "Host setup must export prepare() or a default function.",
    );
    await prepare({ vscode, extension, sourceFile: sourceFile || undefined });
  } else if (sourceFile) {
    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(sourceFile));
    await vscode.window.showTextDocument(document);
  }

  const timeout = Number(process.env.DEMO_TOOLS_HOST_TIMEOUT || 120000);
  const deadline = timeout === 0 ? Infinity : Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      await access(completionFile);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  throw new Error("Timed out waiting for demo completion.");
};
