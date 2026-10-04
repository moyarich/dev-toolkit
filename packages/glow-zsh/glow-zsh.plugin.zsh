# glow-zsh.plugin.zsh
#
# Oh My Zsh entry point.
#
# Runtime dependencies:
#   - zsh
#   - glow
#
# Environment:
#   GLOW_ZSH_CHILD
#     Internal recursion guard. When set, this plugin returns immediately.

[[ -n "${GLOW_ZSH_CHILD:-}" ]] && return

typeset -g GLOW_ZSH_PLUGIN_DIR="${0:A:h}"
typeset -gU path PATH
path=("${GLOW_ZSH_PLUGIN_DIR}/bin" $path)
source "${GLOW_ZSH_PLUGIN_DIR}/lib/core.zsh"

# Handle the ZLE accept-line event for the current command buffer.
#
# Reads:
#   BUFFER  Current ZLE command line.
#
# Returns:
#   The wrapped command's exit code for glow-zsh commands.
#
# Side effects:
#   Delegates shell-state commands to the normal ZLE accept-line widget.
#   Clears and redraws the prompt for wrapped commands.
#   Executes eligible commands through glow_zsh_run.
_glow_zsh_accept_line() {
  local command_line="$BUFFER"

  if [[ -z "$command_line" ]] || glow_zsh_should_bypass "$command_line"; then
    zle .accept-line
    return
  fi

  print
  BUFFER=""
  zle reset-prompt
  glow_zsh_run "$command_line"
  local exit_code=$?
  zle reset-prompt
  return "$exit_code"
}

# Register Enter and Line Feed with the glow-zsh ZLE widget.
zle -N _glow_zsh_accept_line
bindkey '^M' _glow_zsh_accept_line
bindkey '^J' _glow_zsh_accept_line
