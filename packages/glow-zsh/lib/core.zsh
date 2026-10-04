# Shared runtime functions for glow-zsh.
#
# Configuration:
#   ${GLOW_ZSH_CONFIG_FILE:-${XDG_CONFIG_HOME:-$HOME/.config}/glow-zsh/config.zsh}
#
# Precedence:
#   built-in defaults < config.zsh < pre-existing environment variables

if (( ! ${+GLOW_ZSH_BYPASS_COMMANDS} )); then
  typeset -ga GLOW_ZSH_BYPASS_COMMANDS=(
    cd builtin command source . export unset alias unalias
    typeset declare local set setopt unsetopt autoload functions
    hash rehash pushd popd dirs jobs fg bg wait disown exec exit return
  )
fi

if (( ! ${+GLOW_ZSH_ARGS} )); then
  typeset -ga GLOW_ZSH_ARGS=()
fi

# Print the resolved user configuration path.
glow_zsh_config_path() {
  print -r -- "${GLOW_ZSH_CONFIG_FILE:-${XDG_CONFIG_HOME:-${HOME}/.config}/glow-zsh/config.zsh}"
}

# Load the optional user configuration while preserving scalar values that
# already existed in the environment before Glow Zsh loaded.
glow_zsh_load_config() {
  local config_file
  config_file="$(glow_zsh_config_path)"
  [[ -r "$config_file" ]] || return 0

  local -A preserved
  local name
  for name in GLOW_ZSH_ENABLED GLOW_ZSH_MAX_LENGTH; do
    if (( ${(P)+name} )); then
      preserved[$name]="${(P)name}"
    fi
  done

  source "$config_file"

  for name in "${(k)preserved[@]}"; do
    typeset -g "$name=${preserved[$name]}"
  done
}

glow_zsh_load_config

# Determine whether a command must execute in the current interactive shell.
glow_zsh_should_bypass() {
  local command_line="$1"
  local first_word="${${(z)command_line}[1]}"
  [[ -z "$first_word" ]] && return 0

  local bypass
  for bypass in "${GLOW_ZSH_BYPASS_COMMANDS[@]}"; do
    [[ "$first_word" == "$bypass" ]] && return 0
  done
  return 1
}

# Classify captured terminal output as Markdown-like text.
glow_zsh_looks_like_markdown() {
  local text="$1"
  [[ "$text" == '# '* || "$text" == '## '* || "$text" == *$'\n# '* || "$text" == *$'\n## '* ]] && return 0
  [[ "$text" == *'```'* ]] && return 0
  [[ "$text" == *'|'*$'\n|'*'---'*'|'* ]] && return 0
  return 1
}

# Render captured output, using Glow's native config plus optional Glow Zsh
# CLI arguments.
glow_zsh_render() {
  local output="$1"
  local max_length="${GLOW_ZSH_MAX_LENGTH:-0}"

  if [[ "$max_length" == <-> ]] && (( max_length > 0 && ${#output} > max_length )); then
    print -r -- "$output"
    return
  fi

  if [[ "${GLOW_ZSH_ENABLED:-1}" == "0" ]]; then
    print -r -- "$output"
    return
  fi

  if glow_zsh_looks_like_markdown "$output" && (( $+commands[glow] )); then
    print -r -- "$output" | glow "${GLOW_ZSH_ARGS[@]}" -
  else
    print -r -- "$output"
  fi
}

# Execute a command, capture its combined output, and preserve its exit code.
glow_zsh_run() {
  local command_line="$1"
  local output
  local exit_code

  GLOW_ZSH_CHILD=1 output="$(eval "$command_line" 2>&1)"
  exit_code=$?
  glow_zsh_render "$output"
  return "$exit_code"
}
