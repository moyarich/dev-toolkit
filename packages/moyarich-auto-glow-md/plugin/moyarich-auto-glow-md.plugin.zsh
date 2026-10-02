# moyarich-auto-glow-md.plugin.zsh

[[ -n "$MOYARICH_AUTO_GLOW_CHILD" ]] && return

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

_moyarich_auto_glow_accept_line() {
  local command_line="$BUFFER"

  if [[ -z "$command_line" ]] ||
     _moyarich_auto_glow_should_bypass "$command_line"; then
    zle .accept-line
    return
  fi

  BUFFER="moyarich-auto-glow-md -- ${(q)command_line}"
  zle .accept-line
}

zle -N _moyarich_auto_glow_accept_line
bindkey '^M' _moyarich_auto_glow_accept_line
bindkey '^J' _moyarich_auto_glow_accept_line
