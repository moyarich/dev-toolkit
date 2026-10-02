#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { fixHelpers } from './fix-helper.mjs';
import { MarkdownStream } from './markdown.mjs';

// Accept the conventional separator used by older plugin hooks as well.
const args = process.argv.slice(2);
const separated = args[0] === '--';
if (separated) args.shift();
const command = args[0];
if (args.length !== 1) {
  console.error('auto-glow: expected one command string (optionally after --).');
  process.exit(2);
}
const glow = process.env.AUTO_GLOW_BIN || 'glow';
const probe = spawnSync(glow, ['--version'], { stdio: 'ignore', timeout: 2000 });
if (!separated && command === '--doctor') {
  try {
    await fixHelpers();
    const pty = await import('node-pty');
    const child = pty.spawn('/bin/zsh', ['-f', '-c', '[[ -t 0 && -t 1 && -t 2 ]]'], { cols: 80, rows: 24, env: process.env });
    child.onExit(({ exitCode }) => {
      console.log(`PTY: ${exitCode === 0 ? 'OK' : 'FAILED'}; glow: ${probe.status === 0 ? 'OK' : 'missing'}`);
      process.exitCode = exitCode || (probe.status === 0 ? 0 : 1);
    });
  } catch (error) { console.error(error.message); process.exitCode = 1; }
} else if (command !== undefined) {
  if (!process.stdin.isTTY || !process.stdout.isTTY || probe.status !== 0) {
    const result = spawnSync('/bin/zsh', ['-f', '-c', command], { stdio: 'inherit' });
    process.exitCode = result.status ?? 1;
  } else {
    try {
      await fixHelpers();
      const pty = await import('node-pty');
      const child = pty.spawn('/bin/zsh', ['-f', '-c', command], {
        name: process.env.TERM || 'xterm-256color',
        cols: process.stdout.columns || 80, rows: process.stdout.rows || 24,
        cwd: process.cwd(), env: { ...process.env, AUTO_GLOW_CHILD: '1' }
      });
      const stream = new MarkdownStream({
        write: data => process.stdout.write(data),
        render: markdown => {
          const result = spawnSync(glow, ['-s', process.env.AUTO_GLOW_STYLE || 'dark', '-w', String(process.stdout.columns || 80), '-'], {
            input: markdown, encoding: 'utf8', timeout: 3000, maxBuffer: 4 * 1024 * 1024,
            env: { ...process.env, CLICOLOR_FORCE: '1', FORCE_COLOR: '1' }
          });
          return result.status === 0 && result.stdout ? result.stdout.replace(/\r?\n/g, '\r\n') : markdown;
        }
      });
      const wasRaw = process.stdin.isRaw;
      process.stdin.setRawMode(true); process.stdin.resume();
      const input = data => { stream.raw(); stream.passthrough = true; child.write(data.toString()); };
      const resize = () => child.resize(process.stdout.columns || 80, process.stdout.rows || 24);
      const restore = () => {
        process.stdin.off('data', input); process.stdout.off('resize', resize);
        process.stdin.setRawMode(wasRaw); process.stdin.pause();
      };
      process.once('exit', restore);
      process.stdin.on('data', input); process.stdout.on('resize', resize);
      for (const signal of ['SIGTERM', 'SIGHUP']) process.on(signal, () => child.kill(signal));
      child.onData(data => stream.push(data));
      child.onExit(({ exitCode, signal }) => {
        stream.flush(); restore(); process.exitCode = signal ? 128 + signal : exitCode;
      });
    } catch (error) {
      console.error(`auto-glow: ${error.message}. Run npm run doctor in the plugin directory.`);
      process.exitCode = 1;
    }
  }
}
