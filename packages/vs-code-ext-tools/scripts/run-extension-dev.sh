#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
code_command="${CODE_COMMAND:-code}"
debug_port="${EXTENSION_DEBUG_PORT:-9333}"

if ! command -v "$code_command" >/dev/null 2>&1; then
  echo "VS Code command '$code_command' was not found. Install the 'code' shell command or set CODE_COMMAND." >&2
  exit 1
fi

echo "Building JotebookSync..."
npm --prefix "$project_dir" run compile

echo "Opening an Extension Development Host with debugger support on port $debug_port..."
exec "$code_command" \
  --new-window \
  --open-devtools \
  --inspect-extensions "$debug_port" \
  --extensionDevelopmentPath="$project_dir" \
  "$project_dir"
