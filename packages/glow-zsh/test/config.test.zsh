#!/usr/bin/env zsh
setopt errexit nounset pipefail

SCRIPT_DIR="${0:A:h}"
PACKAGE_DIR="${SCRIPT_DIR:h}"
CORE="${PACKAGE_DIR}/lib/core.zsh"
EXAMPLE="${PACKAGE_DIR}/config/config.zsh.example"
CLI="${PACKAGE_DIR}/src/cli/glow-zsh.sh"

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

zsh -n "$EXAMPLE"

path_output="$(HOME="$tmp_dir/home" XDG_CONFIG_HOME= zsh -c "source '$CORE'; glow_zsh_config_path")"
[[ "$path_output" == "$tmp_dir/home/.config/glow-zsh/config.zsh" ]]

xdg_output="$(HOME="$tmp_dir/home" XDG_CONFIG_HOME="$tmp_dir/xdg" zsh -c "source '$CORE'; glow_zsh_config_path")"
[[ "$xdg_output" == "$tmp_dir/xdg/glow-zsh/config.zsh" ]]

custom="$tmp_dir/custom/config.zsh"
custom_output="$(GLOW_ZSH_CONFIG_FILE="$custom" zsh -c "source '$CORE'; glow_zsh_config_path")"
[[ "$custom_output" == "$custom" ]]

mkdir -p "${custom:h}"
cat > "$custom" <<'EOF'
GLOW_ZSH_MAX_LENGTH=25
GLOW_ZSH_BYPASS_COMMANDS=(custom-command)
GLOW_ZSH_ARGS=(--style auto --width 90)
EOF

config_value="$(GLOW_ZSH_CONFIG_FILE="$custom" zsh -c "source '$CORE'; print -r -- \"\$GLOW_ZSH_MAX_LENGTH\"")"
[[ "$config_value" == "25" ]]

env_value="$(GLOW_ZSH_CONFIG_FILE="$custom" GLOW_ZSH_MAX_LENGTH=50 zsh -c "source '$CORE'; print -r -- \"\$GLOW_ZSH_MAX_LENGTH\"")"
[[ "$env_value" == "50" ]]

array_value="$(GLOW_ZSH_CONFIG_FILE="$custom" zsh -c "source '$CORE'; print -r -- \"\${(j:,:)GLOW_ZSH_BYPASS_COMMANDS}\"")"
[[ "$array_value" == "custom-command" ]]

args_value="$(GLOW_ZSH_CONFIG_FILE="$custom" zsh -c "source '$CORE'; print -r -- \"\${(j:,:)GLOW_ZSH_ARGS}\"")"
[[ "$args_value" == "--style,auto,--width,90" ]]

created="$tmp_dir/created/config.zsh"
GLOW_ZSH_CONFIG_FILE="$created" EDITOR=true zsh "$CLI" config >/dev/null
cmp -s "$EXAMPLE" "$created"

print 'sentinel' > "$created"
GLOW_ZSH_CONFIG_FILE="$created" EDITOR=true zsh "$CLI" config >/dev/null
[[ "$(cat "$created")" == "sentinel" ]]

print -- "All config tests passed"
