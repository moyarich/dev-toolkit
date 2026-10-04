# Shared runtime functions for moyarich-auto-glow-md.
#
# Configuration:
#   ${MOYARICH_AUTO_GLOW_CONFIG:-${XDG_CONFIG_HOME:-$HOME/.config}/moyarich-auto-glow-md/config.zsh}
#
# Precedence:
#   built-in defaults < config.zsh < pre-existing environment variables

if (( ! ${+MOYARICH_AUTO_GLOW_BYPASS_COMMANDS} )); then
  typeset -ga MOYARICH_AUTO_GLOW_BYPASS_COMMANDS=(
    cd builtin command source . export unset alias unalias
    typeset declare local set setopt unsetopt autoload functions
    hash rehash pushd popd dirs jobs fg bg wait disown exec exit return
  )
fi

if (( ! ${+MOYARICH_AUTO_GLOW_ARGS} )); then
  typeset -ga MOYARICH_AUTO_GLOW_ARGS=()
fi

# Print the resolved user configuration path.
moyarich_auto_glow_config_path() {
  print -r -- "${MOYARICH_AUTO_GLOW_CONFIG:-${XDG_CONFIG_HOME:-${HOME}/.config}/moyarich-auto-glow-md/config.zsh}"
}

# Load the optional user configuration while preserving scalar values that
# already existed in the environment before Auto Glow loaded.
moyarich_auto_glow_load_config() {
  local config_file
  config_file="$(moyarich_auto_glow_config_path)"
  [[ -r "$config_file" ]] || return 0

  local -A preserved
  local name
  for name in MOYARICH_AUTO_GLOW_DISABLE_RENDER MOYARICH_AUTO_GLOW_MAX_LENGTH; do
    if (( ${(P)+name} )); then
      preserved[$name]="${(P)name}"
    fi
  done

  source "$config_file"

  for name in "${(k)preserved[@]}"; do
    typeset -g "$name=${preserved[$name]}"
  done
}

moyarich_auto_glow_load_config

# Determine whether a command must execute in the current interactive shell.
moyarich_auto_glow_should_bypass() {
  local command_line="$1"
  local first_word="${${(z)command_line}[1]}"
  [[ -z "$first_word" ]] && return 0

  local bypass
  for bypass in "${MOYARICH_AUTO_GLOW_BYPASS_COMMANDS[@]}"; do
    [[ "$first_word" == "$bypass" ]] && return 0
  done
  return 1
}

# Classify captured terminal output as Markdown-like text.
moyarich_auto_glow_looks_like_markdown() {
  local text="$1"
  [[ "$text" == '# '* || "$text" == '## '* || "$text" == *$'\n# '* || "$text" == *$'\n## '* ]] && return 0
  [[ "$text" == *'```'* ]] && return 0
  [[ "$text" == *'|'*$'\n|'*'---'*'|'* ]] && return 0
  return 1
}

# Render captured output, using Glow's native config plus optional Auto Glow
# CLI arguments.
moyarich_auto_glow_render() {
  local output="$1"
  local max_length="${MOYARICH_AUTO_GLOW_MAX_LENGTH:-0}"

  if [[ "$max_length" == <-> ]] && (( max_length > 0 && ${#output} > max_length )); then
    print -r -- "$output"
    return
  fi

  if [[ -n "${MOYARICH_AUTO_GLOW_DISABLE_RENDER:-}" ]]; then
    print -r -- "$output"
    return
  fi

  if moyarich_auto_glow_looks_like_markdown "$output" && (( $+commands[glow] )); then
    print -r -- "$output" | glow "${MOYARICH_AUTO_GLOW_ARGS[@]}" -
  else
    print -r -- "$output"
  fi
}

# Execute a command, capture its combined output, and preserve its exit code.
moyarich_auto_glow_run() {
  local command_line="$1"
  local output
  local exit_code

  MOYARICH_AUTO_GLOW_CHILD=1 output="$(eval "$command_line" 2>&1)"
  exit_code=$?
  moyarich_auto_glow_render "$output"
  return "$exit_code"
}
