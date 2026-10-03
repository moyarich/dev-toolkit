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
#     Print the install mode, destination, and files copied or linked.
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
#   ├── moyarich-auto-glow-md.plugin.zsh
#   ├── install.sh
#   ├── uninstall.sh
#   └── README.md

set -eu

PLUGIN_NAME="moyarich-auto-glow-md"
MODE="copy"
VERBOSE=1
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)

. "${SCRIPT_DIR}/lib/logger.sh"

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
      logger ERROR "Unknown option: $1"
      printf '%s\n' "Usage: ./install.sh [--copy|--symlink] [--verbose|--quiet]" >&2
      exit 2
      ;;
  esac
  shift
done

# Print a concise verbose label/value pair.
#
# Arguments:
#   $1  Label.
#   $2  Value.
verbose_value() {
  [ "$VERBOSE" -eq 1 ] || return 0
  printf '%b%s%b %b%s%b\n' \
    "$CYAN" "$1" "$NC" \
    "$DIM" "$2" "$NC"
}

# Print a concise verbose section heading.
#
# Arguments:
#   $1  Heading text.
verbose_heading() {
  [ "$VERBOSE" -eq 1 ] || return 0
  printf '%s\n' ""
  printf '%b%s%b\n' "$GREEN" "$1" "$NC"
}

# Print one installed file relative to the plugin destination.
#
# Arguments:
#   $1  Destination path.
verbose_file() {
  [ "$VERBOSE" -eq 1 ] || return 0
  relative_path="${1#"$PLUGIN_DIR"/}"
  printf '  %b%s%b\n' "$DIM" "$relative_path" "$NC"
}

# Print a verbose destructive/replacement operation.
#
# Arguments:
#   $1  Operation label.
#   $2  Path.
verbose_replace() {
  [ "$VERBOSE" -eq 1 ] || return 0
  printf '%b%s%b %b%s%b\n' \
    "$YELLOW" "$1" "$NC" \
    "$DIM" "$2" "$NC"
}


ZSH_CUSTOM_DIR="${ZSH_CUSTOM:-${HOME}/.oh-my-zsh/custom}"
PLUGIN_DIR="${ZSH_CUSTOM_DIR}/plugins/${PLUGIN_NAME}"
MARKER="${PLUGIN_DIR}/.moyarich-auto-glow-md-install"


# Support installation from either the source package or the assembled dist/.
if [ -f "${SCRIPT_DIR}/src/cli/${PLUGIN_NAME}.sh" ]; then
  RUNTIME_DIR="${SCRIPT_DIR}"
  CLI_SOURCE="${SCRIPT_DIR}/src/cli/${PLUGIN_NAME}.sh"
elif [ -f "${SCRIPT_DIR}/bin/${PLUGIN_NAME}.sh" ]; then
  RUNTIME_DIR="${SCRIPT_DIR}"
  CLI_SOURCE="${SCRIPT_DIR}/bin/${PLUGIN_NAME}.sh"
else
  logger ERROR "Unable to locate the ${PLUGIN_NAME} runtime files."
  exit 1
fi


# Prepare a clean managed plugin directory.
prepare_plugin_dir() {
  mkdir -p "${ZSH_CUSTOM_DIR}/plugins"

  if [ -L "${PLUGIN_DIR}" ]; then
    verbose_replace "Remove existing plugin symlink:" "${PLUGIN_DIR}"
    rm "${PLUGIN_DIR}"
  elif [ -e "${PLUGIN_DIR}" ]; then
    if [ ! -f "${MARKER}" ]; then
      logger ERROR "Refusing to replace unmanaged plugin directory: ${PLUGIN_DIR}"
      exit 1
    fi

    verbose_replace "Remove existing managed plugin directory:" "${PLUGIN_DIR}"
    rm -rf "${PLUGIN_DIR}"
  fi

  mkdir -p "${PLUGIN_DIR}/bin" "${PLUGIN_DIR}/lib"
}

# Copy a source file into the managed plugin directory.
#
# Arguments:
#   $1  Source path.
#   $2  Destination path.
copy_verbose() {
  cp "$1" "$2"
  verbose_file "$2"
}

# Symlink a source file into the managed plugin directory.
#
# Arguments:
#   $1  Source path.
#   $2  Destination path.
link_verbose() {
  ln -s "$1" "$2"
  verbose_file "$2"
}

# Install a self-contained copy of the plugin.
install_copy() {
  prepare_plugin_dir
  verbose_value "Install mode:" "copy"
  verbose_value "Destination:" "$PLUGIN_DIR"
  verbose_heading "Copied:"

  copy_verbose     "${RUNTIME_DIR}/moyarich-auto-glow-md.plugin.zsh"     "${PLUGIN_DIR}/moyarich-auto-glow-md.plugin.zsh"
  copy_verbose     "${RUNTIME_DIR}/lib/core.zsh"     "${PLUGIN_DIR}/lib/core.zsh"
  copy_verbose     "${RUNTIME_DIR}/lib/logger.sh"   "${PLUGIN_DIR}/lib/logger.sh"
  copy_verbose     "${CLI_SOURCE}"     "${PLUGIN_DIR}/bin/moyarich-auto-glow-md"

  [ ! -f "${RUNTIME_DIR}/README.md" ] ||     copy_verbose "${RUNTIME_DIR}/README.md" "${PLUGIN_DIR}/README.md"
  [ ! -f "${RUNTIME_DIR}/install.sh" ] ||     copy_verbose "${RUNTIME_DIR}/install.sh" "${PLUGIN_DIR}/install.sh"
  [ ! -f "${RUNTIME_DIR}/uninstall.sh" ] ||     copy_verbose "${RUNTIME_DIR}/uninstall.sh" "${PLUGIN_DIR}/uninstall.sh"

  printf '%s\n' "copy" > "${MARKER}"

  chmod 0755 "${PLUGIN_DIR}/bin/moyarich-auto-glow-md"

  [ "$VERBOSE" -eq 0 ] || printf '%s\n' ""
  logger PIPELINE "Installed plugin successfully"
}

# Install development symlinks inside the normal Oh My Zsh plugin directory.
install_symlink() {
  prepare_plugin_dir
  verbose_value "Install mode:" "symlink"
  verbose_value "Destination:" "$PLUGIN_DIR"
  verbose_heading "Linked:"

  link_verbose     "${RUNTIME_DIR}/moyarich-auto-glow-md.plugin.zsh"     "${PLUGIN_DIR}/moyarich-auto-glow-md.plugin.zsh"
  link_verbose     "${RUNTIME_DIR}/lib/core.zsh"     "${PLUGIN_DIR}/lib/core.zsh"
  link_verbose     "${RUNTIME_DIR}/lib/logger.sh"   "${PLUGIN_DIR}/lib/logger.sh"
  link_verbose     "${CLI_SOURCE}"     "${PLUGIN_DIR}/bin/moyarich-auto-glow-md"

  [ ! -f "${RUNTIME_DIR}/README.md" ] ||     link_verbose "${RUNTIME_DIR}/README.md" "${PLUGIN_DIR}/README.md"
  [ ! -f "${RUNTIME_DIR}/install.sh" ] ||     link_verbose "${RUNTIME_DIR}/install.sh" "${PLUGIN_DIR}/install.sh"
  [ ! -f "${RUNTIME_DIR}/uninstall.sh" ] ||     link_verbose "${RUNTIME_DIR}/uninstall.sh" "${PLUGIN_DIR}/uninstall.sh"

  printf '%s\n' "symlink" > "${MARKER}"

  printf '%s\n' ""
  logger PIPELINE "Installed plugin successfully"
}

case "${MODE}" in
  copy)
    install_copy
    ;;
  symlink)
    install_symlink
    ;;
esac

ZSHRC="${ZDOTDIR:-$HOME}/.zshrc"

printf '%s\n' ""
logger INFO "Next steps"
printf '%s\n' ""

if [ -f "$ZSHRC" ] && grep -Eq "(^|[[:space:]()])${PLUGIN_NAME}([[:space:]()]|$)" "$ZSHRC"; then
  printf '%b%s%b\n' "$YELLOW" "Plugin is installed and enabled." "$NC"
  printf '%s\n' ""
  printf '%b%s%b\n' "$BOLD" "Reload Oh My Zsh to load this installed version:" "$NC"
  printf '%s\n' "   omz reload"
  printf '%s\n' ""
  printf '%b%s%b\n' "$BOLD" "Then test it:" "$NC"
  printf '%s\n' "   ${PLUGIN_NAME} -- echo '# Hello from auto-glow'"
else
  printf '%b%s%b\n' "$YELLOW" "Plugin is installed, but not enabled in Oh My Zsh." "$NC"
  printf '%s\n' ""
  printf '%b%s%b\n' "$BOLD" "Enable it with Oh My Zsh:" "$NC"
  printf '%s\n' "   omz plugin enable ${PLUGIN_NAME}"
  printf '%s\n' ""
  printf '%b%s%b\n' "$BOLD" "Then test it:" "$NC"
  printf '%s\n' "   ${PLUGIN_NAME} -- echo '# Hello from auto-glow'"
fi
printf '%s\n' ""
