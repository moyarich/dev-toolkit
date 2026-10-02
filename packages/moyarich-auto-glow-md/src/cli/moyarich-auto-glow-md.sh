#!/usr/bin/env zsh
setopt local_options no_unset

SCRIPT_DIR="${0:A:h}"
if [[ "${SCRIPT_DIR:t}" == "cli" && "${SCRIPT_DIR:h:t}" == "src" ]]; then
  PACKAGE_DIR="${SCRIPT_DIR:h:h}"
else
  PACKAGE_DIR="${SCRIPT_DIR:h}"
fi

source "${PACKAGE_DIR}/lib/core.zsh"

if [[ "${1:-}" == "--" ]]; then
  shift
fi

if (( $# == 0 )); then
  print -u2 -- "Usage: moyarich-auto-glow-md -- <command> [args...]"
  exit 2
fi

command_line="${(j: :)${(q)@}}"
moyarich_auto_glow_run "$command_line"
exit $?
