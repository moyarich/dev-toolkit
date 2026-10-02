# moyarich-auto-glow-md.plugin.zsh
#
# Oh My Zsh entry point. Runtime dependencies: zsh and glow.

[[ -n "${MOYARICH_AUTO_GLOW_CHILD:-}" ]] && return

typeset -g MOYARICH_AUTO_GLOW_PLUGIN_DIR="${0:A:h}"
source "${MOYARICH_AUTO_GLOW_PLUGIN_DIR}/lib/core.zsh"

_moyarich_auto_glow_accept_line() {
  local command_line="$BUFFER"

  if [[ -z "$command_line" ]] || moyarich_auto_glow_should_bypass "$command_line"; then
    zle .accept-line
    return
  fi

  print
  BUFFER=""
  zle reset-prompt
  moyarich_auto_glow_run "$command_line"
  local status=$?
  zle reset-prompt
  return "$status"
}

zle -N _moyarich_auto_glow_accept_line
bindkey '^M' _moyarich_auto_glow_accept_line
bindkey '^J' _moyarich_auto_glow_accept_line
