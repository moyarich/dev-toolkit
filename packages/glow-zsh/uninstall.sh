#!/usr/bin/env sh
#
# Remove the managed glow-zsh Oh My Zsh plugin installation.
#
# Environment:
#   ZSH_CUSTOM
#     Optional custom Oh My Zsh directory.
#     Defaults to $HOME/.oh-my-zsh/custom.
#
# Safety:
#   The directory is removed only when the installer marker exists.
#   Unmanaged directories are never recursively deleted.

set -eu

PLUGIN_NAME="glow-zsh"
ZSH_CUSTOM_DIR="${ZSH_CUSTOM:-${HOME}/.oh-my-zsh/custom}"
PLUGIN_DIR="${ZSH_CUSTOM_DIR}/plugins/${PLUGIN_NAME}"
MARKER="${PLUGIN_DIR}/.glow-zsh-install"

if [ -L "${PLUGIN_DIR}" ]; then
  rm "${PLUGIN_DIR}"
  printf '%s\n' "Removed legacy plugin symlink: ${PLUGIN_DIR}"
elif [ -d "${PLUGIN_DIR}" ]; then
  if [ ! -f "${MARKER}" ]; then
    printf '%s\n' "Refusing to remove unmanaged plugin directory: ${PLUGIN_DIR}" >&2
    exit 1
  fi

  rm -rf "${PLUGIN_DIR}"
  printf '%s\n' "Removed plugin: ${PLUGIN_DIR}"
else
  printf '%s\n' "Plugin is not installed: ${PLUGIN_DIR}"
fi
