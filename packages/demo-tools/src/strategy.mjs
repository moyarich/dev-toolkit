/**
 * Defines a self-contained demo strategy.
 *
 * A strategy owns its demo-specific setup, actions, assertions, fixtures,
 * screenshots, and recordings. Shared behavior should be imported explicitly
 * from @moyarich/demo-tools or another package.
 *
 * @param {{
 *   name: string,
 *   description?: string,
 *   run: (context: object) => Promise<unknown> | unknown
 * }} strategy
 */
export function defineDemoStrategy(strategy) {
  if (!strategy || typeof strategy !== "object") {
    throw new TypeError("A demo strategy must be an object.");
  }
  if (!strategy.name || typeof strategy.name !== "string") {
    throw new TypeError("A demo strategy requires a name.");
  }
  if (typeof strategy.run !== "function") {
    throw new TypeError(`Demo strategy "${strategy.name}" requires a run() function.`);
  }
  return Object.freeze({ ...strategy });
}
