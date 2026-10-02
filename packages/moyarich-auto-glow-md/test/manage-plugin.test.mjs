import test from 'node:test';
import assert from 'node:assert/strict';
import { updateConfig } from '../bin/manage-plugin.mjs';
const rc = 'export ZSH="$HOME/.oh-my-zsh"\nplugins=(git docker)\nsource "$ZSH/oh-my-zsh.sh"\n# Personal settings\n';
test('setup preserves configuration and is reversible and idempotent', () => {
  const installed = updateConfig(rc, 'install');
  assert.ok(installed.includes('plugins=(git docker)'));
  assert.ok(installed.indexOf('plugins+=') < installed.indexOf('source'));
  assert.equal(updateConfig(installed, 'install'), installed);
  assert.equal(updateConfig(installed, 'uninstall'), rc);
  assert.equal(updateConfig(rc, 'uninstall'), rc);
});
test('ambiguous or damaged configuration is rejected', () => {
  assert.throws(() => updateConfig('plugins=(git)\n', 'install'));
  assert.throws(() => updateConfig(rc + rc, 'install'));
  assert.throws(() => updateConfig('# >>> moyarich-auto-glow-md (managed) >>>', 'uninstall'));
});

import { mkdtemp, mkdir, writeFile, readFile, readlink, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
test('install and uninstall change only test configuration and owned symlink', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'auto-glow-setup-'));
  try {
    const ohmyzsh = join(directory, '.oh-my-zsh');
    const custom = join(ohmyzsh, 'custom');
    const config = join(directory, '.zshrc');
    await mkdir(custom, {recursive:true});
    await writeFile(join(ohmyzsh, 'oh-my-zsh.sh'), '# test fixture\n');
    await writeFile(config, rc);
    const run = action => spawnSync(process.execPath, [fileURLToPath(new URL('../bin/manage-plugin.mjs', import.meta.url)), action, '--zshrc', config, '--custom', custom], {encoding:'utf8',env:{...process.env,ZSH:ohmyzsh}});
    let result = run('install'); assert.equal(result.status, 0, result.stderr);
    assert.equal(resolve(await readlink(join(custom,'plugins','moyarich-auto-glow-md'))), resolve(fileURLToPath(new URL('../',import.meta.url))));
    assert.equal(await readFile(config,'utf8'), updateConfig(rc,'install'));
    const loaded = spawnSync('/bin/zsh', ['-f', '-c', 'source "$1"; print -l -- $plugins', 'setup-test', config], {encoding:'utf8',env:{...process.env,HOME:directory}});
    assert.equal(loaded.status,0,loaded.stderr);
    assert.equal(loaded.stdout,'git\ndocker\nmoyarich-auto-glow-md\n');
    result = run('install'); assert.equal(result.status,0,result.stderr);
    assert.equal((await readdir(directory)).filter(name => name.endsWith('.bak')).length,1);
    result = run('uninstall'); assert.equal(result.status,0,result.stderr);
    assert.equal(await readFile(config,'utf8'),rc);
    assert.deepEqual(await readdir(join(custom,'plugins')),[]);
    // A real directory with the same name must never be removed.
    await mkdir(join(custom,'plugins','moyarich-auto-glow-md'));
    result = run('uninstall'); assert.equal(result.status,1);
    assert.match(result.stderr,/unrelated file/);
  } finally { await rm(directory,{recursive:true,force:true}); }
});
