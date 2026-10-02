#!/usr/bin/env zsh
setopt errexit nounset pipefail

SCRIPT_DIR="${0:A:h}"
PACKAGE_DIR="${SCRIPT_DIR:h}"
source "${PACKAGE_DIR}/lib/core.zsh"

typeset -i failures=0

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

MOYARICH_AUTO_GLOW_DISABLE_RENDER=1
output="$(moyarich_auto_glow_run "printf '%s' hello")"
assert_equal "runs command and returns output" "hello" "$output"

set +e
MOYARICH_AUTO_GLOW_DISABLE_RENDER=1 moyarich_auto_glow_run "return 7" >/dev/null 2>&1
status=$?
set -e
assert_equal "preserves exit status" "7" "$status"

cli_output="$(MOYARICH_AUTO_GLOW_DISABLE_RENDER=1 "${PACKAGE_DIR}/bin/moyarich-auto-glow-md" -- printf '%s' '# CLI works')"
assert_equal "shell CLI runs commands" "# CLI works" "$cli_output"

if (( failures > 0 )); then
  print -u2 -- "$failures test(s) failed"
  exit 1
fi

print -- "All shell tests passed"
