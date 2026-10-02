#!/usr/bin/env sh
set -eu

PLUGIN_NAME="moyarich-auto-glow-md"
ZSH_CUSTOM_DIR="${ZSH_CUSTOM:-${HOME}/.oh-my-zsh/custom}"
PLUGIN_DIR="${ZSH_CUSTOM_DIR}/plugins/${PLUGIN_NAME}"

mkdir -p "${ZSH_CUSTOM_DIR}/plugins"

if [ -e "${PLUGIN_DIR}" ] || [ -L "${PLUGIN_DIR}" ]; then
  printf '%s\n' "Plugin already exists: ${PLUGIN_DIR}"
  exit 0
fi

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
ln -s "${SCRIPT_DIR}" "${PLUGIN_DIR}"

printf '%s\n' "Linked ${PLUGIN_NAME} -> ${PLUGIN_DIR}"
printf '%s\n' "Add ${PLUGIN_NAME} to plugins=(...) in ~/.zshrc, then restart Zsh."
