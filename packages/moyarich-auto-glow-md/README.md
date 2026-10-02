# moyarich-auto-glow-md

An Oh My Zsh plugin that automatically renders Markdown from external commands with [glow](https://github.com/charmbracelet/glow). Type `node script.js`, `python3 script.py`, `go run .`, `npm test`, `git …`, or `curl …` as usual. Ordinary terminal output passes through; headings, complete fenced blocks, and tables with separator rows are candidates for rendering. This includes Markdown logged by test runners after npm spinners and progress updates.

## Installation

Requires macOS or Linux, interactive Zsh, Node.js 20+, npm, and glow. On macOS:

```sh
brew install node glow
cd /moyarich-auto-glow-md
npm install
npm run doctor
npm test
```

`npm install` fixes missing execute permissions on node-pty's packaged `spawn-helper`. The runner also checks the helper before opening a PTY. If npm blocks node-pty installation scripts, the packaged prebuilt binary may still work; `npm run doctor` checks it by actually spawning a PTY.

### Easy Oh My Zsh setup

Once dependencies are installed, run:

```sh
npm run plugin:install
```

Open a new terminal. The installer creates the custom plugin symlink and adds a small managed block before the existing `source "$ZSH/oh-my-zsh.sh"` line in your `.zshrc`. The block adds this plugin while preserving your existing plugins. It backs up `.zshrc` before every change, validates Zsh syntax, refuses conflicting plugin files, and is safe to run again.

To uninstall:

```sh
cd moyarich-auto-glow-md
npm run plugin:uninstall
```

Open a new terminal. Uninstall removes only the managed configuration block and the symlink pointing to this project. It keeps the source folder, dependencies, backups, and all other plugins. To immediately disable an already loaded copy, type `AUTO_GLOW_ENABLED=0`.

These commands are for this custom plugin; it does not need to be added to Oh My Zsh's upstream repository. Oh My Zsh documents custom plugins in its [plugin instructions](https://github.com/ohmyzsh/ohmyzsh/wiki/Customization#overriding-and-adding-plugins).

For a custom configuration or plugin directory:

```sh
npm run plugin:install -- --zshrc /path/to/.zshrc --custom /path/to/custom
npm run plugin:uninstall -- --zshrc /path/to/.zshrc --custom /path/to/custom
```

Use the same paths for installation and removal. The custom directory must match the `ZSH_CUSTOM` value used by your `.zshrc`; the installer does not change that setting. It otherwise uses exported `ZSH_CUSTOM`, exported `ZSH`, or the standard `~/.oh-my-zsh/custom` directory, and exported `ZDOTDIR` or `~/.zshrc`. If your configuration uses a nonstandard Oh My Zsh loader, automatic installation refuses to edit it; use manual loading below. If you previously added a source line or plugins-list entry manually, remove that entry yourself when uninstalling.

### Manual loading

For direct loading without Oh My Zsh, add this to `~/.zshrc`:

```zsh
source /moyarich-auto-glow-md/moyarich-auto-glow-md.plugin.zsh
```

To remove a manual installation, delete that source line and open a new terminal.

## Example

Save this as `demo.js`, then type `node demo.js`:

```js
console.log(`# Tables

| Project Name | Framework | Language | Status |
| :--- | :---: | :---: | :--- |
| web-editor | React | TypeScript | 🟢 Active |
| terminal-parser | Node.js | JavaScript | 🟡 Paused |
| api-service | Go | Go | 🔴 Archived |`);
```
