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
#   MOYARICH_AUTO_GLOW_INTERCEPT
#     Set to 1 to opt into experimental Enter-key interception.
#     Disabled by default so normal shell commands are never rewritten.

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

# Register the experimental ZLE interceptor only when explicitly enabled.
#
# Default behavior is intentionally non-invasive: the plugin adds its bin/
# directory to PATH and exposes the moyarich-auto-glow-md CLI, but it does not
# rewrite normal commands typed into the terminal.
if [[ "${MOYARICH_AUTO_GLOW_INTERCEPT:-0}" == "1" ]]; then
  zle -N _moyarich_auto_glow_accept_line
  bindkey '^M' _moyarich_auto_glow_accept_line
  bindkey '^J' _moyarich_auto_glow_accept_line
fi
