# Shared runtime functions for moyarich-auto-glow-md.

typeset -ga MOYARICH_AUTO_GLOW_BYPASS_COMMANDS=(
  cd builtin command source . export unset alias unalias
  typeset declare local set setopt unsetopt autoload functions
  hash rehash pushd popd dirs jobs fg bg wait disown exec exit return
)

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

moyarich_auto_glow_looks_like_markdown() {
  local text="$1"

  [[ "$text" == '# '* || "$text" == '## '* || "$text" == *$'\n# '* || "$text" == *$'\n## '* ]] && return 0
  [[ "$text" == *'```'* ]] && return 0
  [[ "$text" == *'|'*$'\n|'*'---'*'|'* ]] && return 0

  return 1
}

moyarich_auto_glow_render() {
  local output="$1"

  if [[ -n "${MOYARICH_AUTO_GLOW_DISABLE_RENDER:-}" ]]; then
    print -r -- "$output"
    return
  fi

  if moyarich_auto_glow_looks_like_markdown "$output" && (( $+commands[glow] )); then
    print -r -- "$output" | glow -
  else
    print -r -- "$output"
  fi
}

moyarich_auto_glow_run() {
  local command_line="$1"
  local output
  local status

  MOYARICH_AUTO_GLOW_CHILD=1 output="$(eval "$command_line" 2>&1)"
  status=$?

  moyarich_auto_glow_render "$output"
  return "$status"
}
