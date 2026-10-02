import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { MarkdownStream } from '../bin/markdown.mjs';

const directory = new URL('./fixtures/markdown/', import.meta.url);
const files = (await readdir(directory)).filter(name => name.endsWith('.md'));
for (const file of files) {
  for (const size of [1, 17, 4096]) {
    test(`${file}: Markdown survives ${size}-character PTY chunks`, async () => {
      const source = (await readFile(new URL(file, directory), 'utf8')).replace(/\r?\n/g, '\r\n');
      let output = '';
      const rendered = [];
      const stream = new MarkdownStream({
        write: text => {output += text;},
        render: text => {rendered.push(text); return text;}
      });
      for (let offset = 0; offset < source.length; offset += size) stream.push(source.slice(offset, offset + size));
      stream.flush();
      assert.equal(output, source, 'detector must not lose or duplicate document content');
      assert.ok(rendered.length > 0, 'document must reach the renderer');
      const firstHeading = source.match(/^#{1,6} .*/m)?.[0];
      if (firstHeading) assert.ok(rendered.some(text => text.includes(firstHeading)), 'initial heading must render');
    });
  }
}
