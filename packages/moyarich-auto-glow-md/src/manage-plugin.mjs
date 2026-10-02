#!/usr/bin/env node
import { readFile, writeFile, mkdir, lstat, readlink, symlink, unlink, rename, realpath, copyFile, chmod } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const name = 'moyarich-auto-glow-md';
const root = fileURLToPath(new URL('../', import.meta.url));
const start = `# >>> ${name} (managed) >>>`;
const end = `# <<< ${name} (managed) <<<`;
const block = `${start}\n# Load this custom plugin without replacing your existing plugins.\nif (( ! \${plugins[(Ie)${name}]} )); then\n  plugins+=(${name})\nfi\n${end}\n`;

/** Edit only our own block; refuse ambiguous Oh My Zsh loading arrangements. */
export function updateConfig(text, action) {
  const begin = text.indexOf(start);
  if (begin !== -1) {
    const finish = text.indexOf(end, begin);
    if (finish === -1 || text.indexOf(start, begin + start.length) !== -1) throw new Error('Malformed or duplicate managed block; inspect your .zshrc.');
    text = text.slice(0, begin) + text.slice(finish + end.length).replace(/^\r?\n/, '');
  }
  if (action === 'uninstall') return text;
  const matches = [...text.matchAll(/^[ \t]*(?:source|\.)[ \t]+[^\n;]*oh-my-zsh\.sh[^\n]*$/gm)];
  if (matches.length !== 1) throw new Error('Expected one standard Oh My Zsh source line in .zshrc. No files changed.');
  return text.slice(0, matches[0].index) + block + text.slice(matches[0].index);
}

async function optionalStat(path) {
  try { return await lstat(path); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

async function main() {
  const [action, ...args] = process.argv.slice(2);
  if (!['install', 'uninstall'].includes(action)) throw new Error('Usage: node bin/manage-plugin.mjs install|uninstall [--zshrc PATH] [--custom PATH]');
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    if (!['--zshrc', '--custom'].includes(args[i]) || !args[i + 1]) throw new Error(`Unknown or incomplete option: ${args[i]}`);
    options[args[i]] = args[i + 1];
  }
  const rc = await realpath(resolve(options['--zshrc'] || join(process.env.ZDOTDIR || homedir(), '.zshrc')));
  const custom = resolve(options['--custom'] || process.env.ZSH_CUSTOM || join(process.env.ZSH || join(homedir(), '.oh-my-zsh'), 'custom'));
  const link = join(custom, 'plugins', name);
  const existing = await optionalStat(link);
  if (existing && (!existing.isSymbolicLink() || resolve(dirname(link), await readlink(link)) !== resolve(root))) {
    throw new Error(`Refusing to overwrite or remove an unrelated file: ${link}`);
  }
  if (action === 'install') {
    await readFile(join(root, 'node_modules/node-pty/package.json'));
    if (spawnSync(process.env.AUTO_GLOW_BIN || 'glow', ['--version'], {stdio:'ignore'}).status !== 0) throw new Error('Install glow first (macOS: brew install glow).');
    await readFile(join(dirname(custom), 'oh-my-zsh.sh')).catch(async () => {
      // Custom plugin directories may live outside the Oh My Zsh checkout.
      await readFile(join(process.env.ZSH || join(homedir(), '.oh-my-zsh'), 'oh-my-zsh.sh'));
    });
  }
  const original = await readFile(rc, 'utf8');
  const updated = updateConfig(original, action);
  let temporary;
  let createdLink = false;
  try {
    if (updated !== original) {
      temporary = `${rc}.${name}.${process.pid}.tmp`;
      await writeFile(temporary, updated, {flag:'wx', mode:0o600});
      const check = spawnSync('/bin/zsh', ['-n', temporary], {encoding:'utf8'});
      if (check.status !== 0) throw new Error(`Configuration did not pass Zsh syntax validation: ${check.stderr}`);
      await chmod(temporary, (await lstat(rc)).mode & 0o777);
    }
    if (action === 'install' && !existing) {
      await mkdir(dirname(link), {recursive:true});
      await symlink(root, link); createdLink = true;
    }
    if (temporary) {
      // Back up exact pre-change contents. Never overwrite a previous backup.
      const backup = `${rc}.${name}.${Date.now()}.${process.pid}.bak`;
      await copyFile(rc, backup, 1);
      if (await readFile(rc, 'utf8') !== original) throw new Error('Configuration changed during setup; retry.');
      await rename(temporary, rc); temporary = undefined;
      console.log(`Configuration backup: ${backup}`);
    }
    if (action === 'uninstall' && existing) await unlink(link);
    console.log(`${action === 'install' ? 'Installed' : 'Uninstalled'} ${name}. Open a new terminal to apply.`);
    console.log(`Plugin link: ${link}`);
    if (action === 'uninstall') console.log('Source files and dependencies are kept. Any manually added source line or plugins-list entry must be removed separately.');
  } catch (error) {
    if (createdLink) await unlink(link);
    throw error;
  } finally {
    if (temporary) await unlink(temporary).catch(() => {});
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(`auto-glow setup: ${error.message}`); process.exitCode = 1; });
}
