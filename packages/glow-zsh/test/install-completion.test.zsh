#!/usr/bin/env zsh
setopt errexit nounset pipefail

SCRIPT_DIR="${0:A:h}"
PACKAGE_DIR="${SCRIPT_DIR:h}"
TEMP_ROOT="$(mktemp -d)"
trap 'rm -rf "$TEMP_ROOT"' EXIT

FAKE_BIN="${TEMP_ROOT}/bin"
FAKE_HOME="${TEMP_ROOT}/home"
mkdir -p "${FAKE_BIN}" "${FAKE_HOME}"

cat > "${FAKE_BIN}/glow" <<'EOF'
#!/usr/bin/env sh
if [ "$1" = "completion" ] && [ "$2" = "zsh" ]; then
  printf '%s\n' '#compdef glow' '_arguments "*:markdown file:_files"'
  exit 0
fi
exit 2
EOF
chmod +x "${FAKE_BIN}/glow"

PATH="${FAKE_BIN}:${PATH}" \
HOME="${FAKE_HOME}" \
ZSH_CUSTOM="${FAKE_HOME}/.oh-my-zsh/custom" \
sh "${PACKAGE_DIR}/install.sh" --quiet >"${TEMP_ROOT}/install.log"

PLUGIN_DIR="${FAKE_HOME}/.oh-my-zsh/custom/plugins/glow-zsh"
COMPLETION_FILE="${PLUGIN_DIR}/_glow"

[[ -f "${COMPLETION_FILE}" ]]
grep -q '^#compdef glow$' "${COMPLETION_FILE}"
grep -q 'Installed Glow Zsh completion' "${TEMP_ROOT}/install.log"

print -- "PASS: installer generates Glow Zsh completion in the OMZ plugin directory"
