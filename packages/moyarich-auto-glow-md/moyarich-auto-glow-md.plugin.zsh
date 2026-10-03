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

# Preserve the current accept-line widget before Auto Glow wraps it.
#
# Using a widget alias instead of rebinding ^M/^J keeps each keymap intact:
# keys already mapped to accept-line automatically use the wrapper, while keys
# intentionally mapped to another widget remain untouched.
zle -A accept-line _moyarich_auto_glow_previous_accept_line

# Handle the ZLE accept-line widget for the current command buffer.
#
# Reads:
#   BUFFER  Current ZLE command line.
#
# Returns:
#   The wrapped command's exit code for auto-glow commands.
#
# Side effects:
#   Delegates empty and shell-state commands to the previously installed
#   accept-line widget.
#   Clears and redraws the prompt for wrapped commands.
#   Executes eligible commands through moyarich_auto_glow_run.
_moyarich_auto_glow_accept_line() {
  local command_line="$BUFFER"

  if [[ -z "$command_line" ]] || moyarich_auto_glow_should_bypass "$command_line"; then
    zle _moyarich_auto_glow_previous_accept_line
    return
  fi

  print
  BUFFER=""
  zle reset-prompt
  moyarich_auto_glow_run "$command_line"
  local exit_code=$?
  zle reset-prompt
  return "$exit_code"
}

# Wrap the logical accept-line widget instead of directly rebinding Enter/Line
# Feed. This preserves custom keymaps and unrelated widgets.
zle -N accept-line _moyarich_auto_glow_accept_line
