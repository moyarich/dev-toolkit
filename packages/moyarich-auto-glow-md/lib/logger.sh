#!/usr/bin/env sh
#
# Shared terminal logger for install and uninstall scripts.
#
# This file is POSIX sh and is intended to be sourced.

# Output colors. Keep every value initialized so logging remains safe with
# `set -u` in both interactive and non-interactive environments.
if [ -t 1 ]; then
  NC='\033[0m'
  BOLD='\033[1m'
  RED='\033[1;31m'
  DARK_RED='\033[0;31m'
  GREEN='\033[1;32m'
  YELLOW='\033[1;33m'
  DARK_YELLOW='\033[0;33m'
  BLUE='\033[1;34m'
  PURPLE='\033[1;35m'
  CYAN='\033[1;36m'
  WHITE='\033[1;37m'
  DIM='\033[2m'
else
  NC=''
  BOLD=''
  RED=''
  DARK_RED=''
  GREEN=''
  YELLOW=''
  DARK_YELLOW=''
  BLUE=''
  PURPLE=''
  CYAN=''
  WHITE=''
  DIM=''
fi

# Print a formatted log message.
#
# Arguments:
#   $1  Log type: SECTION, PIPELINE, INFO, ACTION, WARNING, or ERROR.
#   $2  Message text.
#
# Notes:
#   Avoid assigning generic helper variables here because this file is sourced
#   into callers and POSIX sh has no portable local-variable declaration.
logger() {
  case "$1" in
    SECTION)
      printf '\n%b%s%b\n\n' "$PURPLE" "${2:-}" "$NC"
      ;;
    PIPELINE)
      printf '%b%s%b\n' "$GREEN" "${2:-}" "$NC"
      ;;
    INFO)
      printf '%bINFO:%b   %s\n' "$WHITE" "$NC" "${2:-}"
      ;;
    ACTION)
      printf '%bACTION:%b %b%s%b\n' "$YELLOW" "$NC" "$DARK_YELLOW" "${2:-}" "$NC"
      ;;
    WARNING)
      printf '%bWARNING:%b %b%s%b\n' "$YELLOW" "$NC" "$DARK_YELLOW" "${2:-}" "$NC" >&2
      ;;
    ERROR)
      printf '%bERROR:%b  %b%s%b\n' "$RED" "$NC" "$DARK_RED" "${2:-}" "$NC" >&2
      ;;
    *)
      printf '%b*%b %b%s%b%s%b\n' "$GREEN" "$NC" "$YELLOW" "$1" "$CYAN" "${2:-}" "$NC"
      ;;
  esac
}
