#!/usr/bin/env zsh
setopt errexit nounset pipefail

SCRIPT_DIR="${0:A:h}"
PACKAGE_DIR="${SCRIPT_DIR:h}"

typeset -i failures=0

assert_equal() {
  local name="$1" expected="$2" actual="$3"
  if [[ "$expected" == "$actual" ]]; then
    print -- "PASS: $name"
  else
    print -u2 -- "FAIL: $name"
    print -u2 -- "  expected: $expected"
    print -u2 -- "  actual:   $actual"
    failures+=1
  fi
}

# Static contracts protect the keymap boundary. Auto Glow wraps the logical
# accept-line widget and must not directly bind Enter or Line Feed.
plugin_source="$(<"${PACKAGE_DIR}/moyarich-auto-glow-md.plugin.zsh")"

if [[ "$plugin_source" == *"bindkey '^M'"* || "$plugin_source" == *"bindkey '^J'"* ]]; then
  print -u2 -- "FAIL: plugin must not directly rebind Enter or Line Feed"
  failures+=1
else
  print -- "PASS: plugin leaves Enter and Line Feed key bindings untouched"
fi

if [[ "$plugin_source" == *'zle -A accept-line _moyarich_auto_glow_previous_accept_line'* ]]; then
  print -- "PASS: plugin preserves the previous accept-line widget"
else
  print -u2 -- "FAIL: plugin must preserve the previous accept-line widget"
  failures+=1
fi

if [[ "$plugin_source" == *'zle -N accept-line _moyarich_auto_glow_accept_line'* ]]; then
  print -- "PASS: plugin wraps the logical accept-line widget"
else
  print -u2 -- "FAIL: plugin must wrap the logical accept-line widget"
  failures+=1
fi

# Static contract: Auto Glow must delegate bypassed commands to Zsh's builtin
# accept-line instead of evaluating shell-state commands in a captured subshell.
if [[ "$plugin_source" == *'zle _moyarich_auto_glow_previous_accept_line'* ]]; then
  print -- "PASS: bypassed commands delegate to the previous accept-line widget"
else
  print -u2 -- "FAIL: bypassed commands must delegate to the previous accept-line widget"
  failures+=1
fi

source "${PACKAGE_DIR}/lib/core.zsh"
assert_equal "clear remains eligible for ordinary execution" "1" "$(
  moyarich_auto_glow_should_bypass 'clear'; print $?
)"
assert_equal "omz reload remains eligible for ordinary execution" "1" "$(
  moyarich_auto_glow_should_bypass 'omz reload'; print $?
)"

if (( failures > 0 )); then
  print -u2 -- "$failures ZLE interoperability test(s) failed"
  exit 1
fi

print -- "All ZLE interoperability tests passed"
