const sgr = /\x1b\[[0-9;]*m/g;
const heading = /^ {0,3}#{1,6} +\S/;
const fence = /^ {0,3}(`{3,}|~{3,})/;
const separator = /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/;

export function isMarkdown(text) {
  const lines = text.replace(sgr, '').split(/\r?\n/);
  if (lines.some(line => heading.test(line))) return true;
  for (let i = 0; i < lines.length; i++) {
    const opening = lines[i].match(fence);
    if (opening && lines.slice(i + 1).some(line => new RegExp(`^ {0,3}${opening[1][0]}{${opening[1].length},}\\s*$`).test(line))) return true;
    if (i && separator.test(lines[i]) && lines[i - 1].includes('|')) return true;
  }
  return false;
}

/** Buffer possible Markdown blocks; pass terminal controls through and resume
 * detection on clean lines. Alternate screens and interactive input remain raw.
 */
export class MarkdownStream {
  constructor({ write, render, delay = 180, limit = 65536 }) {
    Object.assign(this, { write, render, delay, limit });
    this.pending = ''; this.block = ''; this.passthrough = false;
    this.unsafeLine = false; this.alternateScreen = false;
  }
  controls(text) {
    for (const match of text.matchAll(/\x1b\[\?(?:47|1047|1049)([hl])/g)) {
      this.alternateScreen = match[1] === 'h';
    }
    const plain = text.replace(sgr, '').replace(/\r\n/g, '\n');
    return /[\x00-\x08\x0b-\x1f\x7f]/.test(plain);
  }
  push(data) {
    if (this.passthrough) return this.write(data);
    clearTimeout(this.timer);
    this.pending += data;
    let end;
    while ((end = this.pending.indexOf('\n')) !== -1) {
      const line = this.pending.slice(0, end + 1);
      this.pending = this.pending.slice(end + 1);
      const controlled = this.controls(line);
      if (controlled || this.unsafeLine || this.alternateScreen) {
        this.flushBlock(); this.write(line); this.unsafeLine = false;
        continue;
      }
      const clean = line.replace(sgr, '').trimEnd();
      // A table's trailing blank line separates it from test-runner summaries.
      if (!clean && this.block && this.block.split(/\r?\n/).some(row => separator.test(row.replace(sgr, '')))) {
        this.flushBlock(); this.write(line);
      } else if (this.block || heading.test(clean) || fence.test(clean) || clean.includes('|')) this.block += line;
      else this.write(line);
      if (this.block.length >= this.limit) { this.raw(); this.passthrough = true; break; }
    }
    if (this.passthrough) { this.write(this.pending); this.pending = ''; return; }
    if (this.pending && (this.controls(this.pending.replace(/\r$/, '')) || this.unsafeLine || this.alternateScreen)) {
      this.flushBlock(); this.write(this.pending); this.pending = ''; this.unsafeLine = true;
    }
    if (this.block || this.pending) this.timer = setTimeout(() => this.flush(), this.delay);
  }
  flushBlock() {
    const block = this.block; this.block = '';
    if (block) this.write(isMarkdown(block) ? this.render(block) : block);
  }
  raw() {
    clearTimeout(this.timer);
    this.write(this.block + this.pending); this.block = ''; this.pending = '';
  }
  flush() {
    clearTimeout(this.timer);
    // A partial line is often a prompt: never send it to the renderer.
    this.flushBlock();
    if (this.pending) {
      this.write(this.pending); this.pending = ''; this.passthrough = true;
    }
  }
}
