import test from 'node:test';
import assert from 'node:assert/strict';
import { MarkdownStream, isMarkdown } from '../bin/markdown.mjs';

test('conservative detection', () => {
  for (const value of ['# Tables\n\n| A | B |\n| --- | :---: |\n| a | b |\n', '```js\nconst x=1;\n```\n', '| A | B |\n| --- | --- |\n']) assert.ok(isMarkdown(value));
  for (const value of ['log # hello\n', 'a * b | c\n', '```unfinished\n', '| plain | text |\n', '##hashtag\n']) assert.equal(isMarkdown(value), false);
});
function fixture() {
  let output = '';
  const stream = new MarkdownStream({ write: text => { output += text; }, render: text => `<render>${text}</render>` });
  return { stream, output: () => output };
}
test('mixed logs, chunked Markdown and end of command', () => {
  const f = fixture();
  f.stream.push('normal log\r\n# He'); f.stream.push('ading\r\nbody\r\n'); f.stream.flush();
  assert.equal(f.output(), 'normal log\r\n<render># Heading\r\nbody\r\n</render>');
});
test('ANSI logs and cursor controls remain unchanged', () => {
  const f = fixture();
  const value = '\x1b[32mlog\x1b[0m\r\nprogress\r\x1b[2Kdone';
  f.stream.push(value); f.stream.flush(); assert.equal(f.output(), value);
});
test('prompts and incomplete lines pass through without rendering', () => {
  const f = fixture(); f.stream.push('Password: '); f.stream.flush(); f.stream.push('# answer\r\n');
  assert.equal(f.output(), 'Password: # answer\r\n');
});
test('bounded buffering fails open', () => {
  let output = '';
  const stream = new MarkdownStream({write: s => { output += s; }, render: () => 'bad', limit: 10});
  stream.push('# Heading\nlong line\n'); stream.flush();
  assert.equal(output, '# Heading\nlong line\n');
});

test('npm spinner and Vitest cursor updates do not disable subsequent Markdown', () => {
  const f = fixture();
  f.stream.push('⠙\x1b[1G\x1b[0Knpm notice run tests\r\n\x1b[?25l');
  f.stream.push('\x1b[2K\rbuilding...\r\n\x1b[?2026h\x1b[K\x1b[1Astdout | tests\r\n\r\n## Mapping table\r\n\r\n| A | B |\r\n| --- | --- |\r\n| a | b |\r\n\r\n✓ 16 tests passed\r\n\x1b[?2026l');
  f.stream.flush();
  assert.match(f.output(), /<render>## Mapping table/);
  assert.match(f.output(), /<\/render>\r\n✓ 16 tests passed/);
  assert.ok(f.output().startsWith('⠙\x1b[1G\x1b[0Knpm notice run tests'));
});
test('alternate-screen content stays raw until normal screen returns', () => {
  const f = fixture();
  f.stream.push('\x1b[?1049h\r\n# Fullscreen\r\n\x1b[?1049l\r\n# Document\r\n');
  f.stream.flush();
  assert.match(f.output(), /# Fullscreen\r\n/);
  assert.doesNotMatch(f.output(), /<render># Fullscreen/);
  assert.match(f.output(), /<render># Document/);
});
