# Shared runtime functions for moyarich-auto-glow-md.
#
# Environment:
#   MOYARICH_AUTO_GLOW_DISABLE_RENDER
#     When non-empty, bypass Glow rendering and print captured output directly.
#   MOYARICH_AUTO_GLOW_CHILD
#     Internal recursion guard set while executing wrapped commands.

typeset -ga MOYARICH_AUTO_GLOW_BYPASS_COMMANDS=(
  cd builtin command source . export unset alias unalias
  typeset declare local set setopt unsetopt autoload functions
  hash rehash pushd popd dirs jobs fg bg wait disown exec exit return
)

# Determine whether a command must execute in the current interactive shell.
#
# Arguments:
#   $1  Complete command line.
#
# Returns:
#   0 when the command should bypass auto-glow wrapping.
#   1 when the command may run through the auto-glow runtime.
moyarich_auto_glow_should_bypass() {
  local command_line="$1"
  local -a words
  words=(${(z)command_line})

  (( ${#words[@]} == 0 )) && return 0

  local index=1
  local token

  # Skip leading environment assignments so shell-state commands such as
  # `FOO=bar cd /tmp` still execute in the current interactive shell.
  while (( index <= ${#words[@]} )); do
    token="${words[index]}"
    [[ "$token" =~ '^[A-Za-z_][A-Za-z0-9_]*=' ]] || break
    (( index += 1 ))
  done

  (( index > ${#words[@]} )) && return 1

  # Zsh precommand modifiers do not identify the command that ultimately
  # executes. Walk past the modifiers that are safe to inspect.
  while (( index <= ${#words[@]} )); do
    token="${words[index]}"
    case "$token" in
      noglob|nocorrect|time)
        (( index += 1 ))
        ;;
      *)
        break
        ;;
    esac
  done

  (( index > ${#words[@]} )) && return 1
  local first_word="${words[index]}"

  local bypass
  for bypass in "${MOYARICH_AUTO_GLOW_BYPASS_COMMANDS[@]}"; do
    [[ "$first_word" == "$bypass" ]] && return 0
  done

  return 1
}

# Classify captured terminal output as Markdown-like text.
#
# Arguments:
#   $1  Captured command output.
#
# Returns:
#   0 when a supported Markdown signal is detected.
#   1 otherwise.
#
# Notes:
#   Detection is intentionally conservative to avoid rendering ordinary logs,
#   compiler output, and other terminal text through Glow.
moyarich_auto_glow_looks_like_markdown() {
  local text="$1"

  [[ "$text" == '# '* || "$text" == '## '* || "$text" == *$'\n# '* || "$text" == *$'\n## '* ]] && return 0
  [[ "$text" == *'```'* ]] && return 0
  [[ "$text" == *'|'*$'\n|'*'---'*'|'* ]] && return 0

  return 1
}

# Render captured output to the terminal.
#
# Arguments:
#   $1  Captured command output.
#
# Environment:
#   MOYARICH_AUTO_GLOW_DISABLE_RENDER
#     When non-empty, disables Markdown rendering.
#
# Side effects:
#   Writes output to stdout.
#   Invokes glow - when Markdown is detected and Glow is available.
moyarich_auto_glow_render() {
  local output="$1"

  if [[ -n "${MOYARICH_AUTO_GLOW_DISABLE_RENDER:-}" ]]; then
    print -r -- "$output"
    return
  fi

  if moyarich_auto_glow_looks_like_markdown "$output" && command -v glow >/dev/null 2>&1; then
    print -r -- "$output" | command glow -
  else
    print -r -- "$output"
  fi
}

# Execute a command, capture its combined output, and render the result.
#
# Arguments:
#   $1  Complete command line to evaluate.
#
# Returns:
#   The wrapped command's original exit code.
#
# Environment:
#   Sets MOYARICH_AUTO_GLOW_CHILD=1 for the wrapped command to prevent
#   recursive plugin execution.
#
# Side effects:
#   Captures stdout and stderr together, then writes the rendered result.
moyarich_auto_glow_run() {
  local command_line="$1"
  local output
  local exit_code

  MOYARICH_AUTO_GLOW_CHILD=1 output="$(eval "$command_line" 2>&1)"
  exit_code=$?

  moyarich_auto_glow_render "$output"
  return "$exit_code"
}
