import { readFile } from "node:fs/promises";
/**
 * Evaluates a component module through CDP. This is useful in VS Code pages where
 * Trusted Types can reject data-URL dynamic imports. Callers provide the small
 * source transform explicitly so this helper does not hide component semantics.
 */
export async function evaluateComponentViaCDP({ page, componentUrl, transform = (source) => source }) {
  const source = await readFile(componentUrl, "utf8");
  const expression = await transform(source);
  const session = await page.context().newCDPSession(page);
  try {
    const result = await session.send("Runtime.evaluate", { expression, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text ?? "Component evaluation failed.");
  } finally { await session.detach(); }
}
