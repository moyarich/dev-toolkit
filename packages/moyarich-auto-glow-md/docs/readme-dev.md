# Developer Docs

## Architecture

The plugin registers a ZLE `line-finish` hook that checks the command after line editing finishes. It finalizes the terminal display with the original line before substituting the runner command, so the internal wrapper does not appear at submission. Eligible commands run through `bin/auto-glow.mjs`, which creates a real PTY using [node-pty](https://github.com/microsoft/node-pty). A child `zsh -f -c` executes the original command in the current directory with the exported environment. The child guard prevents the plugin from installing recursively, including when descendants load the plugin. History records the original input.

The command's stdin, stdout, and stderr are terminal devices. PTY output merges stdout and stderr into one terminal stream, so Markdown emitted to either can render. Keyboard input is forwarded in raw mode, terminal resize events resize the PTY, and exit status is propagated. ANSI colors and terminal controls pass through for ordinary output. This implementation follows the [Zsh ZLE widget API](https://zsh.sourceforge.io/Doc/Release/Zsh-Line-Editor.html) and node-pty's PTY API.

Ordinary complete lines stream immediately. A heading, fence opener, or line containing `|` starts a candidate block. After 180 ms of output inactivity, or when the process exits, the detector checks the block. A table requires a header and a separator with at least two columns; a fence requires a matching closing fence; headings require spaces after the hash marks. Isolated punctuation does not qualify. Only confirmed blocks go to glow, with paging disabled. Rendering has a three-second timeout and falls back to the original text if it fails.

Prompts without a newline pass through after the short idle delay and disable rendering for the remainder of that command. Keyboard input immediately flushes pending output and disables rendering for the remainder of the command. Cursor controls and progress updates pass through unchanged, with Markdown detection resuming at the next clean line boundary. Alternate-screen output remains raw until the normal screen returns. This preserves interactive output, progress bars, spinners, alternate screens, and cursor movement. Candidate buffering is capped at 64 KiB; exceeding it flushes unchanged and disables rendering.

## Shell behavior and limitations

- Only a single external command submitted through ZLE is intercepted. Builtins, aliases, functions, assignments, shell operators, redirections, multi-line input, substitutions, and references containing `$` or backticks bypass the runner. Quoted arguments are parsed with Zsh's lexer, so `python3 -c 'print("# Heading")'` works.
- Shell-changing commands including `cd`, `source`, `.`, `export`, `unset`, `alias`, `unalias`, `setopt`, `unsetopt`, `pushd`, `popd`, `jobs`, `fg`, `bg`, `wait`, `disown`, `exec`, and `exit` execute in the current shell. Compound commands such as `cd project && node script.js` also execute there and are not rendered.
- Child commands inherit exported variables and the working directory, but not the parent shell's local variables, options, aliases, functions, or custom glob settings. Default child Zsh expansion rules apply. Global aliases and unusual shell syntax can affect eligibility; disable the plugin for commands that depend on those features.
- Full parent-shell job control cannot transparently cross the PTY boundary. Disable the plugin before commands that require Ctrl-Z, `fg`, or parent-shell job management. Ctrl-C is forwarded to the PTY foreground process. Background commands already bypass the runner.
- Full-screen programs and common interactive tools (`vim`, `nvim`, `vi`, `nano`, `less`, `more`, `man`, `top`, `htop`, `ssh`, `tmux`, `screen`) bypass by default. Other interactive programs retain a PTY but may have up to 180 ms of initial prompt latency.
- Detection is heuristic. A log that starts with `# Heading` can render as Markdown. Logs following a heading within the same output burst can become part of the rendered block. Markdown produced slowly, in incomplete fragments, inside an alternate screen, or on lines containing terminal cursor controls may remain unchanged. Rendered Markdown uses glow's styling instead of original ANSI styling.
- Commands executed by scripts, noninteractive shells, pasted multi-line constructs, and widgets that bypass the line-finish hook are not intercepted. Other plugins that replace or change line-finish hooks may affect this plugin. Missing node or glow makes the plugin inactive at load time.
- Byte-for-byte binary output is outside the scope of node-pty's text stream. Redirect binary output to a file; redirected commands bypass the runner.

## Configuration

Set these before loading the plugin, or change them in the current shell:

```zsh
AUTO_GLOW_ENABLED=0            # disable; set to 1 to enable again
export AUTO_GLOW_STYLE=dark    # glow style, e.g. light or a style file
export AUTO_GLOW_BIN=glow      # renderer executable or absolute path
AUTO_GLOW_BYPASS='vim nvim vi nano less more man top htop ssh tmux screen my-tool'
```

`AUTO_GLOW_BYPASS` replaces the default list and matches the executable's basename. The renderer settings must be exported to reach the runner. The plugin's load-time prerequisite currently checks for `glow` on PATH even if a custom renderer path is configured.

## Troubleshooting

Run `npm run doctor` from this directory. It checks the helper permissions, a real PTY spawn, and glow availability.

If node-pty fails to load after a Node upgrade, reinstall dependencies. If your platform has no compatible prebuilt binary, install the platform build tools (on macOS, `xcode-select --install`), allow node-pty's install scripts according to your npm policy, and rebuild node-pty. A blocked native build is not fixed by changing helper permissions.

If nothing renders, verify the plugin is loaded in an interactive Zsh, the command is external (`whence -w node`), and the output has a strong Markdown signal. Check `AUTO_GLOW_ENABLED` and the bypass list. A builtin such as `echo '# Heading'` deliberately stays in the parent shell; use the demo above to test rendering. Open a fresh shell after changing the load order.

If an interactive tool behaves unexpectedly, add its executable to `AUTO_GLOW_BYPASS` or set `AUTO_GLOW_ENABLED=0`. Re-enable it afterward. The runner reports PTY setup failures and does not retry commands automatically, avoiding duplicate execution.

## Development

`npm test` checks conservative detection, chunked output, ANSI/control passthrough, prompts, buffer bounds, merged stderr rendering, TTY detection, exit codes, keyboard input, terminal resizing, and real ZLE submission with parent-shell directory changes and history preservation. Integration tests require Zsh, Python 3, glow, and working node-pty.

## Changes that affect the wider system

Creating this implementation changed only this plugin directory and its local dependencies. The setup scripts were tested with temporary configurations; your actual `~/.zshrc` and Oh My Zsh installation have not been changed. Running `npm run plugin:install` will change your `.zshrc` and create a plugin symlink; running `npm run plugin:uninstall` reverses those managed changes. Both commands save a configuration backup before editing. No system files or default-shell settings are changed.

The installation commands above are optional steps you run yourself. `brew install node glow` installs tools on your machine; `xcode-select --install` installs Apple developer tools. Adding the plugin to `~/.zshrc` affects future interactive terminals. A plugin loading problem can interfere with command entry in those terminals. To recover, start `/bin/zsh -f` (which skips `.zshrc`), run `npm run plugin:uninstall` from this project (or remove the managed block/manual source line), and open a fresh terminal. Setting `AUTO_GLOW_ENABLED=0` disables interception in an already working shell.

The helper permission repair changes only files named `spawn-helper` inside this project's `node_modules/node-pty`. No system permission changes or administrator access are required by the plugin. There are no changes here to boot configuration, services, networking, or the operating system.

The setup commands print the exact backup path. If needed, restore that backup to the configuration path with `cp /path/to/printed-backup "$HOME/.zshrc"` (substitute your actual configuration path when using `ZDOTDIR` or `--zshrc`). Restoring a backup replaces the entire configuration with that earlier version, so preserve any later edits first. Setup does not run your `.zshrc`, install Oh My Zsh itself, or execute remote install scripts.

## Updating an already loaded plugin

After editing or updating the plugin files, open a new terminal or reload the plugin in the current one:

```zsh
source /moyarich-auto-glow-md/moyarich-auto-glow-md.plugin.zsh
auto-glow-status
```

Reloading updates the named hooks without duplicating them. The status command reports the version actually loaded in the shell, the enable setting, and whether the npm test command is eligible. You do not need to rerun installation for source changes: the Oh My Zsh symlink points to this folder. To disable the old version immediately in the current terminal, run `AUTO_GLOW_ENABLED=0`.

If you see an internal wrapper for a compound command such as `gf && gl`, the current hook is not the one handling your input: the current plugin explicitly bypasses compound commands and aliases. Reload the plugin as shown above, or close that terminal and open a fresh one. The runner accepts both the current command argument and the older `-- COMMAND` form, but compatibility parsing does not restore parent-shell aliases to an old runner hook. Do not use an old intercepted alias command to test Git operations; test in the fresh shell instead. If you need immediate recovery, run `npm run plugin:uninstall` from this directory and open a new terminal. The configuration changes and backups are described above.

## Resource use and turning it off

The plugin has no daemon, background polling, or repeating timer. While the shell sits at a prompt, it runs no Node or glow process. Each eligible command starts one Node runner and a PTY child shell; those exit when the command finishes. A watch command keeps its runner alive for as long as that watch command runs. There is per-command startup and memory overhead from Node and node-pty; this is not a zero-cost feature.

Glow runs only for detected Markdown blocks, with a three-second rendering timeout and a 4 MiB output limit. The renderer availability check has a two-second timeout. The 180 ms flush timer is a one-shot timer created only when text is buffered; it is cleared at command completion. Candidate block buffering is limited to 64 KiB. Very frequent Markdown output can still consume CPU; bypass such tools or disable rendering when needed.

```zsh
auto-glow-disable  # removes this plugin's interception and history hooks now
auto-glow-enable   # restores them
auto-glow-status  # shows the current enable setting
```

These functions change only the current shell, not `.zshrc`. Turning it off does not terminate a command already running under the PTY; stop that command normally first. To keep the plugin disabled in new terminals, set `AUTO_GLOW_ENABLED=0` in `.zshrc` before Oh My Zsh loads. To remove its managed setup entirely, run `npm run plugin:uninstall` in this directory and open a new terminal. Configuration impacts and backup recovery are described above.

The local regression fixtures in `test/fixtures/markdown` are snapshots of the seven Markdown fixtures from `/test/markdown`. Tests feed each through the detector with 1-, 17-, and 4096-character terminal chunks, checking that it renders and preserves all text. This includes a CRLF newline split across chunks. The cheatsheet fixture credits the Markdown Here syntax categories in its own text.

To run every producer test in the terminal suite, omit the name filter:

```sh
npx vitest run test/markdown/markdown-terminal.test.ts
```

The `-t "markdown-cheatsheet.md"` filter selects five producer tests for that one fixture. It excludes the other 30 producer tests and the fixture-presence test, which Vitest reports as 31 skipped. Those filtered skips are not failures. Producers may additionally skip if their runtime is unavailable.
