# moyarich-auto-glow-md.plugin.zsh
#
# Shell-native Oh My Zsh plugin. Runtime dependencies: zsh and glow.

[[ -n "${MOYARICH_AUTO_GLOW_CHILD:-}" ]] && return

typeset -ga MOYARICH_AUTO_GLOW_BYPASS_COMMANDS=(
  cd builtin command source . export unset alias unalias
  typeset declare local set setopt unsetopt autoload functions
  hash rehash pushd popd dirs jobs fg bg wait disown exec exit return
)

_moyarich_auto_glow_should_bypass() {
  local command_line="$1"
  local first_word="${${(z)command_line}[1]}"

  [[ -z "$first_word" ]] && return 0

  local bypass
  for bypass in "${MOYARICH_AUTO_GLOW_BYPASS_COMMANDS[@]}"; do
    [[ "$first_word" == "$bypass" ]] && return 0
  done

  return 1
}

_moyarich_auto_glow_looks_like_markdown() {
  local text="$1"

  [[ "$text" == *$'\n# '* || "$text" == '# '* ]] && return 0
  [[ "$text" == *'```'* ]] && return 0
  [[ "$text" == *$'\n|'*'|'*$'\n|'*'---'*'|'* ]] && return 0

  return 1
}

_moyarich_auto_glow_run() {
  local command_line="$1"
  local output
  local status

  MOYARICH_AUTO_GLOW_CHILD=1 output="$(eval "$command_line" 2>&1)"
  status=$?

  if _moyarich_auto_glow_looks_like_markdown "$output" && (( $+commands[glow] )); then
    print -r -- "$output" | glow -
  else
    print -r -- "$output"
  fi

  return "$status"
}

_moyarich_auto_glow_accept_line() {
  local command_line="$BUFFER"

  if [[ -z "$command_line" ]] || _moyarich_auto_glow_should_bypass "$command_line"; then
    zle .accept-line
    return
  fi

  print
  BUFFER=""
  zle reset-prompt
  _moyarich_auto_glow_run "$command_line"
  local status=$?
  zle reset-prompt
  return "$status"
}

zle -N _moyarich_auto_glow_accept_line
bindkey '^M' _moyarich_auto_glow_accept_line
bindkey '^J' _moyarich_auto_glow_accept_line
