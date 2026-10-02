# Only interactive top-level shells install the ZLE widget.
[[ -o interactive && -z ${AUTO_GLOW_CHILD-} ]] || return 0
typeset -g _AUTO_GLOW_VERSION=1.0.1
typeset -g _AUTO_GLOW_ROOT=${${(%):-%N}:A:h}
[[ -r $_AUTO_GLOW_ROOT/node_modules/node-pty/package.json ]] || {
  print -u2 -- "auto-glow: run npm install in $_AUTO_GLOW_ROOT first"
  unset _AUTO_GLOW_ROOT
  return 0
}
(( $+commands[node] && $+commands[glow] )) || { unset _AUTO_GLOW_ROOT; return 0; }

# Accept only one external command. Zsh's lexer respects quoted argument contents.
# Everything that could alter or depend on unexported parent shell state stays local.
_auto_glow_eligible() {
  emulate -L zsh
  local -a words
  words=( ${(z)1} )
  (( $#words )) || return 1
  local word
  for word in $words; do
    case $word in
      ';'|'&&'|'||'|'|'|'&'|'('|')'|'{'|'}'|'<'*|'>'*) return 1 ;;
    esac
    [[ $word == *'$'* || $word == *'`'* || $word == *$'\n'* ]] && return 1
  done
  word=${(Q)words[1]}
  [[ $word == *=* || $word == \#* ]] && return 1
  local -a bypass
  bypass=( ${(z)${AUTO_GLOW_BYPASS:-'vim nvim vi nano less more man top htop ssh tmux screen'}} )
  (( ${bypass[(Ie)${word:t}]} )) && return 1
  [[ $(whence -w -- "$word" 2>/dev/null) == *': command' ]]
}

_auto_glow_line_finish() {
  if [[ ${AUTO_GLOW_ENABLED:-1} != 0 && -z $PREBUFFER ]] && _auto_glow_eligible "$BUFFER"; then
    # Finish the display with the original line before substituting execution text.
    zle -I
    typeset -g _AUTO_GLOW_ORIGINAL=$BUFFER
    BUFFER="command node ${(q)_AUTO_GLOW_ROOT}/bin/auto-glow.mjs ${(q)BUFFER}"
  fi
}

# Keep the user's command, rather than the implementation wrapper, in history.
_auto_glow_history() {
  if [[ -n ${_AUTO_GLOW_ORIGINAL-} ]]; then
    print -sr -- "$_AUTO_GLOW_ORIGINAL"
    unset _AUTO_GLOW_ORIGINAL
    return 1
  fi
  return 0
}
autoload -Uz add-zsh-hook
autoload -Uz add-zle-hook-widget

auto-glow-enable() {
  typeset -g AUTO_GLOW_ENABLED=1
  add-zsh-hook zshaddhistory _auto_glow_history
  add-zle-hook-widget line-finish _auto_glow_line_finish
}

auto-glow-disable() {
  typeset -g AUTO_GLOW_ENABLED=0
  add-zsh-hook -d zshaddhistory _auto_glow_history
  add-zle-hook-widget -d line-finish _auto_glow_line_finish
}

if [[ ${AUTO_GLOW_ENABLED:-1} != 0 ]]; then
  auto-glow-enable
else
  auto-glow-disable
fi

# Report the loaded shell hook, rather than only checking files on disk.
auto-glow-status() {
  print -r -- "auto-glow version: $_AUTO_GLOW_VERSION"
  print -r -- "enabled: ${AUTO_GLOW_ENABLED:-1}"
  print -r -- "plugin: $_AUTO_GLOW_ROOT"
  print -r -- "renderer: ${AUTO_GLOW_BIN:-glow}"
  local hooks=${widgets[zle-line-finish]-missing}
  print -r -- "line-finish widget: $hooks"
  if _auto_glow_eligible 'npm exec --workspace @moyarich/code-mod-jest-to-vitest vitest -- run tests/unit/mapping-table.test.ts --reporter=verbose'; then
    print -r -- 'npm test command: eligible'
  else
    print -r -- 'npm test command: bypassed (check npm aliases/functions)'
  fi
}
