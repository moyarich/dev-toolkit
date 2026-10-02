const ANSI_PATTERN =
  /\x1B(?:[@-_][0-?]*[ -/]*[@-~]|\][^\x07]*(?:\x07|\x1B\\))/g;

/** Removes ANSI control sequences for Markdown classification only. */
export function stripAnsi(value: string): string {
  return value.replace(ANSI_PATTERN, "");
}

/**
 * Returns true when terminal output contains a strong Markdown signal.
 *
 * Detection is intentionally conservative so compiler output, logs, and
 * ordinary shell text are not unnecessarily routed through Glow.
 */
export function looksLikeMarkdown(value: string): boolean {
  const text = stripAnsi(value);

  if (/^#{1,6}\s+\S/m.test(text)) return true;
  if (/^\x60\x60\x60[\w-]*\s*$/m.test(text)) return true;

  return (
    /^\s*\|?.+\|.+\|?\s*$/m.test(text) &&
    /^\s*\|?\s*:?-{3,}:?\s*\|/m.test(text)
  );
}
