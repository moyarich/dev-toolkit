#!/usr/bin/env zsh
# Shell-native CLI for glow-zsh.

setopt local_options no_unset

SCRIPT_DIR="${0:A:h}"
if [[ "${SCRIPT_DIR:t}" == "cli" && "${SCRIPT_DIR:h:t}" == "src" ]]; then
  PACKAGE_DIR="${SCRIPT_DIR:h:h}"
else
  PACKAGE_DIR="${SCRIPT_DIR:h}"
fi

typeset -g GLOW_ZSH_PACKAGE_DIR="$PACKAGE_DIR"
source "${PACKAGE_DIR}/lib/core.zsh"

case "${1:-}" in
  config-path)
    glow_zsh_config_path
    exit 0
    ;;
  config)
    config_file="$(glow_zsh_config_path)"
    example_file="${PACKAGE_DIR}/config/config.zsh.example"

    if [[ ! -e "$config_file" ]]; then
      [[ -r "$example_file" ]] || {
        print -u2 -- "Config example not found: $example_file"
        exit 1
      }
      mkdir -p "${config_file:h}"
      cp "$example_file" "$config_file"
      print -- "Created Glow Zsh config: $config_file"
    else
      print -- "Using existing Glow Zsh config: $config_file"
    fi

    editor="${VISUAL:-${EDITOR:-vi}}"
    editor_words=(${(z)editor})
    command "${editor_words[@]}" "$config_file"
    exit $?
    ;;
esac

if [[ "${1:-}" == "--" ]]; then
  shift
fi

if (( $# == 0 )); then
  print -u2 -- "Usage:"
  print -u2 -- "  glow-zsh config"
  print -u2 -- "  glow-zsh config-path"
  print -u2 -- "  glow-zsh -- <command> [args...]"
  exit 2
fi

command_line="${(j: :)${(q)@}}"
glow_zsh_run "$command_line"
exit $?
