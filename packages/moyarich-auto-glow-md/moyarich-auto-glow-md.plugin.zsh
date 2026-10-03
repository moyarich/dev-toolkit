# moyarich-auto-glow-md.plugin.zsh
#
# Oh My Zsh entry point.
#
# Runtime dependencies:
#   - zsh
#   - glow
#
# Environment:
#   MOYARICH_AUTO_GLOW_CHILD
#     Internal recursion guard. When set, this plugin returns immediately.

[[ -n "${MOYARICH_AUTO_GLOW_CHILD:-}" ]] && return

typeset -g MOYARICH_AUTO_GLOW_PLUGIN_DIR="${0:A:h}"
typeset -gU path PATH
path=("${MOYARICH_AUTO_GLOW_PLUGIN_DIR}/bin" $path)
source "${MOYARICH_AUTO_GLOW_PLUGIN_DIR}/lib/core.zsh"

# Handle the ZLE accept-line event for the current command buffer.
#
# Reads:
#   BUFFER  Current ZLE command line.
#
# Returns:
#   The wrapped command's exit code for auto-glow commands.
#
# Side effects:
#   Delegates shell-state commands to the normal ZLE accept-line widget.
#   Clears and redraws the prompt for wrapped commands.
#   Executes eligible commands through moyarich_auto_glow_run.
_moyarich_auto_glow_accept_line() {
  local command_line="$BUFFER"

  if [[ -z "$command_line" ]] || moyarich_auto_glow_should_bypass "$command_line"; then
    zle .accept-line
    return
  fi

  # Replace the accepted buffer with an invocation of the runtime wrapper and
  # let Zsh's normal accept-line flow execute it. This keeps terminal redraw,
  # prompt placement, and command completion under ZLE's control instead of
  # manually executing a command from inside the widget.
  BUFFER="moyarich_auto_glow_run ${(q)command_line}"
  zle .accept-line
}

# Register Enter and Line Feed with the auto-glow ZLE widget.
zle -N _moyarich_auto_glow_accept_line
bindkey '^M' _moyarich_auto_glow_accept_line
bindkey '^J' _moyarich_auto_glow_accept_line
