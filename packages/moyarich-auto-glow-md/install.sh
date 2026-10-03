#!/usr/bin/env sh
#
# Install moyarich-auto-glow-md into the Oh My Zsh custom plugin directory.
#
# Usage:
#   ./install.sh
#   ./install.sh --copy
#   ./install.sh --symlink
#   ./install.sh --quiet
#   ./install.sh --symlink --quiet
#
# Options:
#   --copy
#     Copy runtime files into the Oh My Zsh plugin directory.
#     This is the default.
#
#   --symlink
#     Create a managed plugin directory whose runtime files point back to the
#     current checkout. This is intended for development.
#
#   --verbose, -v
#     Print resolved paths, install mode, and each copy/symlink operation.
#     This is the default.
#
#   --quiet, -q
#     Suppress verbose install details and only print important results.
#
# Environment:
#   ZSH_CUSTOM
#     Optional custom Oh My Zsh directory.
#     Defaults to $HOME/.oh-my-zsh/custom.
#
# Installed layout:
#   $ZSH_CUSTOM/plugins/moyarich-auto-glow-md/
#   ├── bin/moyarich-auto-glow-md
#   ├── lib/core.zsh
#   ├── _glow                    # generated when Glow is available
#   ├── moyarich-auto-glow-md.plugin.zsh
#   ├── install.sh
#   ├── uninstall.sh
#   └── README.md

set -eu

PLUGIN_NAME="moyarich-auto-glow-md"
MODE="copy"
VERBOSE=1

while [ "$#" -gt 0 ]; do
  case "$1" in
    --copy)
      MODE="copy"
      ;;
    --symlink)
      MODE="symlink"
      ;;
    --verbose|-v)
      VERBOSE=1
      ;;
    --quiet|-q)
      VERBOSE=0
      ;;
    -h|--help)
      printf '%s\n' "Usage: ./install.sh [--copy|--symlink] [--verbose|--quiet]"
      exit 0
      ;;
    *)
      error "Unknown option: $1"
      printf '%s\n' "Usage: ./install.sh [--copy|--symlink] [--verbose|--quiet]" >&2
      exit 2
      ;;
  esac
  shift
done

# Colors are enabled only for interactive terminal output.
if [ -t 1 ]; then
  COLOR_RESET='\033[0m'
  COLOR_BOLD='\033[1m'
  COLOR_GREEN='\033[32m'
  COLOR_CYAN='\033[36m'
  COLOR_YELLOW='\033[33m'
  COLOR_RED='\033[31m'
  COLOR_DIM='\033[2m'
else
  COLOR_RESET=''
  COLOR_BOLD=''
  COLOR_GREEN=''
  COLOR_CYAN=''
  COLOR_YELLOW=''
  COLOR_RED=''
  COLOR_DIM=''
fi

# Print a verbose operation message.
#
# Arguments:
#   $@  Message text.
verbose() {
  [ "$VERBOSE" -eq 1 ] || return 0
  printf '%b%s%b\n' "$COLOR_CYAN" "$*" "$COLOR_RESET"
}

# Print a verbose label/value pair with a dimmed value.
#
# Arguments:
#   $1  Label.
#   $2  Value.
verbose_path() {
  [ "$VERBOSE" -eq 1 ] || return 0
  printf '%b%s%b %b%s%b\n'     "$COLOR_CYAN" "$1" "$COLOR_RESET"     "$COLOR_DIM" "$2" "$COLOR_RESET"
}

# Print a success message.
#
# Arguments:
#   $@  Message text.
success() {
  printf '%b%s%b\n' "$COLOR_GREEN" "$*" "$COLOR_RESET"
}

# Print an informational follow-up message.
#
# Arguments:
#   $@  Message text.
notice() {
  printf '%b%s%b\n' "$COLOR_YELLOW" "$*" "$COLOR_RESET"
}

ZSH_CUSTOM_DIR="${ZSH_CUSTOM:-${HOME}/.oh-my-zsh/custom}"
PLUGIN_DIR="${ZSH_CUSTOM_DIR}/plugins/${PLUGIN_NAME}"
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
MARKER="${PLUGIN_DIR}/.moyarich-auto-glow-md-install"

verbose_path "Install mode:" "${MODE}"
verbose_path "Installer:" "${SCRIPT_DIR}"
verbose_path "ZSH_CUSTOM:" "${ZSH_CUSTOM_DIR}"
verbose_path "Plugin destination:" "${PLUGIN_DIR}"

# Support installation from either the source package or the assembled dist/.
if [ -f "${SCRIPT_DIR}/src/cli/${PLUGIN_NAME}.sh" ]; then
  RUNTIME_DIR="${SCRIPT_DIR}"
  CLI_SOURCE="${SCRIPT_DIR}/src/cli/${PLUGIN_NAME}.sh"
elif [ -f "${SCRIPT_DIR}/bin/${PLUGIN_NAME}.sh" ]; then
  RUNTIME_DIR="${SCRIPT_DIR}"
  CLI_SOURCE="${SCRIPT_DIR}/bin/${PLUGIN_NAME}.sh"
else
  error "Unable to locate the ${PLUGIN_NAME} runtime files."
  exit 1
fi

verbose_path "Runtime source:" "${RUNTIME_DIR}"
verbose_path "CLI source:" "${CLI_SOURCE}"

# Prepare a clean managed plugin directory.
prepare_plugin_dir() {
  verbose "Ensure directory: ${ZSH_CUSTOM_DIR}/plugins"
  mkdir -p "${ZSH_CUSTOM_DIR}/plugins"

  if [ -L "${PLUGIN_DIR}" ]; then
    verbose "Remove existing plugin symlink: ${PLUGIN_DIR}"
    rm "${PLUGIN_DIR}"
  elif [ -e "${PLUGIN_DIR}" ]; then
    if [ ! -f "${MARKER}" ]; then
      error "Refusing to replace unmanaged plugin directory: ${PLUGIN_DIR}"
      exit 1
    fi

    verbose "Remove existing managed plugin directory: ${PLUGIN_DIR}"
    rm -rf "${PLUGIN_DIR}"
  fi

  verbose "Create runtime directories: ${PLUGIN_DIR}/bin ${PLUGIN_DIR}/lib"
  mkdir -p "${PLUGIN_DIR}/bin" "${PLUGIN_DIR}/lib"
}

# Copy a source file into the managed plugin directory.
#
# Arguments:
#   $1  Source path.
#   $2  Destination path.
copy_verbose() {
  verbose "Copy: $1 -> $2"
  cp "$1" "$2"
}

# Symlink a source file into the managed plugin directory.
#
# Arguments:
#   $1  Source path.
#   $2  Destination path.
link_verbose() {
  verbose "Link: $2 -> $1"
  ln -s "$1" "$2"
}

# Install a self-contained copy of the plugin.
install_copy() {
  prepare_plugin_dir

  copy_verbose     "${RUNTIME_DIR}/moyarich-auto-glow-md.plugin.zsh"     "${PLUGIN_DIR}/moyarich-auto-glow-md.plugin.zsh"
  copy_verbose     "${RUNTIME_DIR}/lib/core.zsh"     "${PLUGIN_DIR}/lib/core.zsh"
  copy_verbose     "${CLI_SOURCE}"     "${PLUGIN_DIR}/bin/moyarich-auto-glow-md"

  [ ! -f "${RUNTIME_DIR}/README.md" ] ||     copy_verbose "${RUNTIME_DIR}/README.md" "${PLUGIN_DIR}/README.md"
  [ ! -f "${RUNTIME_DIR}/install.sh" ] ||     copy_verbose "${RUNTIME_DIR}/install.sh" "${PLUGIN_DIR}/install.sh"
  [ ! -f "${RUNTIME_DIR}/uninstall.sh" ] ||     copy_verbose "${RUNTIME_DIR}/uninstall.sh" "${PLUGIN_DIR}/uninstall.sh"

  verbose "Write install marker: ${MARKER}"
  printf '%s\n' "copy" > "${MARKER}"

  verbose "Make executable: ${PLUGIN_DIR}/bin/moyarich-auto-glow-md"
  chmod 0755 "${PLUGIN_DIR}/bin/moyarich-auto-glow-md"

  success "Installed plugin copy"
  printf '  %s\n' "${PLUGIN_DIR}"
}

# Install development symlinks inside the normal Oh My Zsh plugin directory.
install_symlink() {
  prepare_plugin_dir

  link_verbose     "${RUNTIME_DIR}/moyarich-auto-glow-md.plugin.zsh"     "${PLUGIN_DIR}/moyarich-auto-glow-md.plugin.zsh"
  link_verbose     "${RUNTIME_DIR}/lib/core.zsh"     "${PLUGIN_DIR}/lib/core.zsh"
  link_verbose     "${CLI_SOURCE}"     "${PLUGIN_DIR}/bin/moyarich-auto-glow-md"

  [ ! -f "${RUNTIME_DIR}/README.md" ] ||     link_verbose "${RUNTIME_DIR}/README.md" "${PLUGIN_DIR}/README.md"
  [ ! -f "${RUNTIME_DIR}/install.sh" ] ||     link_verbose "${RUNTIME_DIR}/install.sh" "${PLUGIN_DIR}/install.sh"
  [ ! -f "${RUNTIME_DIR}/uninstall.sh" ] ||     link_verbose "${RUNTIME_DIR}/uninstall.sh" "${PLUGIN_DIR}/uninstall.sh"

  verbose "Write install marker: ${MARKER}"
  printf '%s\n' "symlink" > "${MARKER}"

  success "Installed development symlinks"
  printf '  %s\n' "${PLUGIN_DIR}"
}

case "${MODE}" in
  copy)
    install_copy
    ;;
  symlink)
    install_symlink
    ;;
esac

# Generate Glow's native Zsh completion in the plugin directory. Oh My Zsh
# adds enabled plugin directories to fpath before initializing completion, so
# no ~/.zshrc edits or separate compinit setup are required.
install_glow_completion() {
  if ! command -v glow >/dev/null 2>&1; then
    notice "Glow not found; skipped Glow Zsh completion."
    notice "After installing Glow, rerun this installer to enable completion."
    return 0
  fi

  completion_file="${PLUGIN_DIR}/_glow"
  verbose "Generate Glow Zsh completion: ${completion_file}"

  if glow completion zsh > "${completion_file}"; then
    success "Installed Glow Zsh completion"
    printf '  %s\n' "${completion_file}"
  else
    rm -f "${completion_file}"
    notice "Glow completion generation failed; plugin installation is still usable."
  fi
}

install_glow_completion

printf '%s\n' ""
notice "Next steps"
printf '%s\n' ""
printf '%b%s%b\n' "$COLOR_BOLD" "1. Enable the plugin in ~/.zshrc:" "$COLOR_RESET"
printf '%s\n' "   plugins=(... ${PLUGIN_NAME})"
printf '%s\n' ""
printf '%b%s%b\n' "$COLOR_BOLD" "2. Reload your current shell:" "$COLOR_RESET"
printf '%s\n' "   source ~/.zshrc"
printf '%s\n' ""
printf '%b%s%b\n' "$COLOR_BOLD" "3. Verify the CLI is available:" "$COLOR_RESET"
printf '%s\n' "   command -v ${PLUGIN_NAME}"
printf '%s\n' ""
printf '%b%s%b\n' "$COLOR_BOLD" "4. Try it:" "$COLOR_RESET"
printf '%s\n' "   ${PLUGIN_NAME} -- printf '%s\\n' '# Hello from auto-glow'"
printf '%s\n' ""
verbose_path "Plugin entry point:" "${PLUGIN_DIR}/moyarich-auto-glow-md.plugin.zsh"
verbose_path "CLI command:" "${PLUGIN_DIR}/bin/moyarich-auto-glow-md"
