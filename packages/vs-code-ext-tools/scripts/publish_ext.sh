#!/usr/bin/env bash

set -euo pipefail

project_directory="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
environment_file="${project_directory}/.env"

if [[ ! -f "${environment_file}" ]]; then
  printf '%s\n' \
    "Missing ${environment_file}." \
    "Copy .env.example to .env and set VSCE_PAT."
  exit 1
fi

set -a
# Load release credentials without printing their values.
# shellcheck disable=SC1090
source "${environment_file}"
set +a

if [[ -z "${VSCE_PAT:-}" ]]; then
  printf '%s\n' \
    "Missing a VS Code Marketplace publishing token." \
    "Copy .env.example to .env and set VSCE_PAT."
  exit 1
fi

cd "${project_directory}"

printf '%s\n' "Recording demos and generating current README GIFs..."
node ./demo/create-readme-gif.mjs

printf '%s\n' "Running release checks..."
npm test

printf '%s\n' "Verifying the extension package..."
npm run package:ls

node ./scripts/confirm-publish.mjs

printf '%s\n' "Publishing Extension to the VS Code Marketplace..."
npx @vscode/vsce publish "$@"
