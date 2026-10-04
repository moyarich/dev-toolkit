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

# A normal ZLE widget bound before Glow Zsh must remain callable. This models
# interoperability with plugins that register their own widgets before ours.
zle -N test_previous_accept_line 2>/dev/null || true

# Static contract: Glow Zsh must delegate bypassed commands to Zsh's builtin
# accept-line instead of evaluating shell-state commands in a captured subshell.
plugin_source="$(<"${PACKAGE_DIR}/glow-zsh.plugin.zsh")"
if [[ "$plugin_source" == *'zle .accept-line'* ]]; then
  print -- "PASS: bypassed commands delegate to builtin accept-line"
else
  print -u2 -- "FAIL: bypassed commands must delegate to builtin accept-line"
  failures+=1
fi

source "${PACKAGE_DIR}/lib/core.zsh"
assert_equal "clear remains eligible for ordinary execution" "1" "$(
  glow_zsh_should_bypass 'clear'; print $?
)"
assert_equal "omz reload remains eligible for ordinary execution" "1" "$(
  glow_zsh_should_bypass 'omz reload'; print $?
)"

if (( failures > 0 )); then
  print -u2 -- "$failures ZLE interoperability test(s) failed"
  exit 1
fi

print -- "All ZLE interoperability tests passed"
