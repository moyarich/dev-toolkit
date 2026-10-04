#!/usr/bin/env zsh
setopt errexit nounset pipefail

SCRIPT_DIR="${0:A:h}"
PACKAGE_DIR="${SCRIPT_DIR:h}"
CORE="${PACKAGE_DIR}/lib/core.zsh"
EXAMPLE="${PACKAGE_DIR}/config/config.zsh.example"
CLI="${PACKAGE_DIR}/src/cli/moyarich-auto-glow-md.sh"

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

zsh -n "$EXAMPLE"

path_output="$(HOME="$tmp_dir/home" XDG_CONFIG_HOME= zsh -c "source '$CORE'; moyarich_auto_glow_config_path")"
[[ "$path_output" == "$tmp_dir/home/.config/moyarich-auto-glow-md/config.zsh" ]]

xdg_output="$(HOME="$tmp_dir/home" XDG_CONFIG_HOME="$tmp_dir/xdg" zsh -c "source '$CORE'; moyarich_auto_glow_config_path")"
[[ "$xdg_output" == "$tmp_dir/xdg/moyarich-auto-glow-md/config.zsh" ]]

custom="$tmp_dir/custom/config.zsh"
custom_output="$(MOYARICH_AUTO_GLOW_CONFIG_FILE="$custom" zsh -c "source '$CORE'; moyarich_auto_glow_config_path")"
[[ "$custom_output" == "$custom" ]]

mkdir -p "${custom:h}"
cat > "$custom" <<'EOF'
MOYARICH_AUTO_GLOW_MAX_LENGTH=25
MOYARICH_AUTO_GLOW_BYPASS_COMMANDS=(custom-command)
MOYARICH_AUTO_GLOW_ARGS=(--style auto --width 90)
EOF

config_value="$(MOYARICH_AUTO_GLOW_CONFIG_FILE="$custom" zsh -c "source '$CORE'; print -r -- \"\$MOYARICH_AUTO_GLOW_MAX_LENGTH\"")"
[[ "$config_value" == "25" ]]

env_value="$(MOYARICH_AUTO_GLOW_CONFIG_FILE="$custom" MOYARICH_AUTO_GLOW_MAX_LENGTH=50 zsh -c "source '$CORE'; print -r -- \"\$MOYARICH_AUTO_GLOW_MAX_LENGTH\"")"
[[ "$env_value" == "50" ]]

array_value="$(MOYARICH_AUTO_GLOW_CONFIG_FILE="$custom" zsh -c "source '$CORE'; print -r -- \"\${(j:,:)MOYARICH_AUTO_GLOW_BYPASS_COMMANDS}\"")"
[[ "$array_value" == "custom-command" ]]

args_value="$(MOYARICH_AUTO_GLOW_CONFIG_FILE="$custom" zsh -c "source '$CORE'; print -r -- \"\${(j:,:)MOYARICH_AUTO_GLOW_ARGS}\"")"
[[ "$args_value" == "--style,auto,--width,90" ]]

created="$tmp_dir/created/config.zsh"
MOYARICH_AUTO_GLOW_CONFIG_FILE="$created" EDITOR=true zsh "$CLI" config >/dev/null
cmp -s "$EXAMPLE" "$created"

print 'sentinel' > "$created"
MOYARICH_AUTO_GLOW_CONFIG_FILE="$created" EDITOR=true zsh "$CLI" config >/dev/null
[[ "$(cat "$created")" == "sentinel" ]]

print -- "All config tests passed"
