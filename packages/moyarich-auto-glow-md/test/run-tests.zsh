#!/usr/bin/env zsh
setopt errexit nounset pipefail

SCRIPT_DIR="${0:A:h}"
PACKAGE_DIR="${SCRIPT_DIR:h}"
source "${PACKAGE_DIR}/lib/core.zsh"

typeset -i failures=0

# Assert that a command returns exit code 0.
#
# Arguments:
#   $1    Human-readable assertion name.
#   $2..  Command and arguments to execute.
#
# Side effects:
#   Prints PASS/FAIL output and increments the global failures counter.
assert_true() {
  local name="$1"
  shift
  if "$@"; then
    print -- "PASS: $name"
  else
    print -u2 -- "FAIL: $name"
    failures+=1
  fi
}

# Assert that a command returns a non-zero exit code.
#
# Arguments:
#   $1    Human-readable assertion name.
#   $2..  Command and arguments to execute.
#
# Side effects:
#   Prints PASS/FAIL output and increments the global failures counter.
assert_false() {
  local name="$1"
  shift
  if "$@"; then
    print -u2 -- "FAIL: $name"
    failures+=1
  else
    print -- "PASS: $name"
  fi
}

# Assert that two string values are equal.
#
# Arguments:
#   $1  Human-readable assertion name.
#   $2  Expected value.
#   $3  Actual value.
#
# Side effects:
#   Prints PASS/FAIL output and increments the global failures counter.
assert_equal() {
  local name="$1"
  local expected="$2"
  local actual="$3"
  if [[ "$expected" == "$actual" ]]; then
    print -- "PASS: $name"
  else
    print -u2 -- "FAIL: $name"
    print -u2 -- "  expected: $expected"
    print -u2 -- "  actual:   $actual"
    failures+=1
  fi
}

assert_true "detects heading" moyarich_auto_glow_looks_like_markdown "# Hello"
assert_true "detects fenced code" moyarich_auto_glow_looks_like_markdown $'```js\nconsole.log(1)\n```'
assert_true "detects table" moyarich_auto_glow_looks_like_markdown $'| Name | Status |\n| --- | --- |\n| api | active |'
assert_false "ignores ordinary output" moyarich_auto_glow_looks_like_markdown "npm notice run test"
assert_true "bypasses cd" moyarich_auto_glow_should_bypass "cd /tmp"
assert_false "runs normal commands" moyarich_auto_glow_should_bypass "printf hello"

MOYARICH_AUTO_GLOW_ENABLED=0
output="$(moyarich_auto_glow_run "printf '%s' hello")"
assert_equal "runs command and returns output" "hello" "$output"

set +e
MOYARICH_AUTO_GLOW_ENABLED=0 moyarich_auto_glow_run "return 7" >/dev/null 2>&1
exit_code=$?
set -e
assert_equal "preserves exit status" "7" "$exit_code"

cli_output="$(MOYARICH_AUTO_GLOW_ENABLED=0 zsh "${PACKAGE_DIR}/src/cli/moyarich-auto-glow-md.sh" -- printf '%s' '# CLI works')"
assert_equal "source shell CLI runs commands" "# CLI works" "$cli_output"

if (( failures > 0 )); then
  print -u2 -- "$failures test(s) failed"
  exit 1
fi

print -- "All shell tests passed"
