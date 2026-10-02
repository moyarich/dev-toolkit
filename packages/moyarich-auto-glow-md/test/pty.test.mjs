import test from 'node:test';
import assert from 'node:assert/strict';
import * as pty from 'node-pty';
import { fileURLToPath } from 'node:url';
const runner = fileURLToPath(new URL('../bin/auto-glow.mjs', import.meta.url));
function run(command, interact) {
  return new Promise((resolve, reject) => {
    const child = pty.spawn(process.execPath, [runner, command], { cols: 80, rows: 24, env: {...process.env, TERM:'xterm-256color'} });
    let output = '';
    const timeout = setTimeout(() => { child.kill(); reject(new Error(`timeout: ${output}`)); }, 8000);
    child.onData(data => { output += data; interact?.(child, data); });
    child.onExit(result => { clearTimeout(timeout); resolve({...result, output}); });
  });
}
test('arbitrary commands retain all three TTYs and their exit status', async () => {
  const result = await run(`python3 -c 'import os,sys; print("TTYS",*[os.isatty(i) for i in range(3)]); print("stderr-log",file=sys.stderr); sys.exit(7)'`);
  assert.match(result.output, /TTYS True True True/);
  assert.match(result.output, /stderr-log/); assert.equal(result.exitCode, 7);
});
test('Markdown emitted to stderr goes through glow', async () => {
  const result = await run(`python3 -c 'import sys; print("# Tables\\n\\n| Name | State |\\n| --- | --- |\\n| Demo | Ready |",file=sys.stderr)'`);
  assert.equal(result.exitCode, 0);
  assert.match(result.output, /Demo/); assert.doesNotMatch(result.output, /\| --- \| --- \|/);
});
test('keyboard input and resized terminal dimensions reach child', async () => {
  let sent = false;
  const result = await run(`python3 -c 'import os; value=input("INPUT: "); print("ANSWER",value); print("SIZE",os.get_terminal_size().columns)'`, (child, data) => {
    if (!sent && data.includes('INPUT:')) { sent = true; child.resize(101, 30); child.write('hello\r'); }
  });
  assert.match(result.output, /ANSWER hello/); assert.match(result.output, /SIZE 101/);
});
test('plugin submits commands through ZLE and leaves cd in parent shell', async () => {
  const plugin = fileURLToPath(new URL('../moyarich-auto-glow-md.plugin.zsh', import.meta.url));
  const result = await new Promise((resolve, reject) => {
    const child = pty.spawn('/bin/zsh', ['-f'], {cols:80, rows:24, env:{...process.env, TERM:'xterm-256color'}});
    let output = ''; let stage = 0;
    const timeout = setTimeout(() => { child.kill(); reject(new Error(output)); }, 8000);
    child.onData(data => {
      output += data;
      if (stage === 0) { stage++; child.write(`source '${plugin}'; PROMPT='READY> '\r`); }
      else if (stage === 1 && output.includes('READY> ')) {
        stage++; child.write(`python3 -c 'print("# RenderedHeading")'\r`);
        setTimeout(() => child.write(`python3 -c 'print("Normal output — unchanged")'\r`), 500);
        setTimeout(() => child.write(`alias gf='print FETCH_OK' gl='print PULL_OK'\r`), 800);
        setTimeout(() => child.write('gf && gl\r'), 1000);
        setTimeout(() => child.write('cd /tmp\r'), 1200);
        setTimeout(() => child.write('print -r -- PARENT:$PWD; fc -l -4; exit\r'), 1500);
      }
    });
    child.onExit(result => {clearTimeout(timeout); resolve({...result,output});});
  });
  assert.equal(result.exitCode, 0); assert.match(result.output, /PARENT:\/tmp/);
  assert.match(result.output, /RenderedHeading/);
  assert.match(result.output, /\r+\nFETCH_OK\r+\nPULL_OK\r+\n/);
  assert.doesNotMatch(result.output, /string expected after -c/);
  assert.match(result.output, /\r+\nNormal output — unchanged\r+\n/);
  // History should store the user's original command, not the runner command.
  assert.doesNotMatch(result.output, /command node .*auto-glow\.mjs/);
});

import { spawnSync } from 'node:child_process';
test('legacy argument separator does not become the Zsh command', () => {
  const result = spawnSync(process.execPath, [runner, '--', 'print SEPARATOR_OK'], {encoding:'utf8'});
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, 'SEPARATOR_OK\n');
});
test('compound commands, aliases and shell state changes bypass interception', () => {
  const plugin = fileURLToPath(new URL('../moyarich-auto-glow-md.plugin.zsh', import.meta.url));
  const script = `source "$1"
alias gf='git fetch' gl='git pull'
for input in 'gf && gl' 'git fetch && git pull' 'gf' 'gl' 'cd /tmp' 'export NAME=value' 'git status | cat'; do
  if _auto_glow_eligible "$input"; then print -u2 -- "Incorrectly intercepted: $input"; exit 1; fi
done
_auto_glow_eligible 'python3 -c \"print(1)\"'
`;
  const result = spawnSync('/bin/zsh', ['-fi', '-c', script, 'bypass-test', plugin], {encoding:'utf8'});
  assert.equal(result.status, 0, result.stderr);
});

test('re-sourcing updates stale hook definitions without duplicate registration', () => {
  const plugin = fileURLToPath(new URL('../moyarich-auto-glow-md.plugin.zsh', import.meta.url));
  const result = spawnSync('/bin/zsh', ['-fi', '-c', `source "$1"
_auto_glow_line_finish() { print stale-hook; }
source "$1"
source "$1"
[[ $(functions _auto_glow_line_finish) != *stale-hook* ]] || exit 1
[[ $(print -l -- $zshaddhistory_functions | /usr/bin/grep -c '^_auto_glow_history$') == 1 ]] || exit 1
auto-glow-status
`, 'reload-test', plugin], {encoding:'utf8'});
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /auto-glow version: 1.0.1/);
  assert.match(result.stdout, /npm test command: eligible/);
});

test('disable removes interception hooks and enable restores them', () => {
  const plugin = fileURLToPath(new URL('../moyarich-auto-glow-md.plugin.zsh', import.meta.url));
  const result = spawnSync('/bin/zsh', ['-fi', '-c', `source "$1"
auto-glow-disable
[[ $AUTO_GLOW_ENABLED == 0 ]] || exit 1
[[ \${zshaddhistory_functions[*]} != *_auto_glow_history* ]] || exit 1
[[ $(zstyle -a zle-line-finish widgets registered; print -l -- $registered) != *_auto_glow_line_finish* ]] || exit 1
auto-glow-enable
[[ $AUTO_GLOW_ENABLED == 1 ]] || exit 1
[[ \${zshaddhistory_functions[*]} == *_auto_glow_history* ]] || exit 1
`, 'disable-test', plugin], {encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
});
