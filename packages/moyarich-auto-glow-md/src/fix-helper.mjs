import { readdir, stat, chmod } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

/** node-pty tarballs can lose the executable bit on macOS's spawn-helper. */
export async function fixHelpers(dir = fileURLToPath(new URL('../node_modules/node-pty/', import.meta.url))) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) await fixHelpers(path);
    else if (entry.name === 'spawn-helper') {
      const info = await stat(path);
      if (!(info.mode & 0o111)) await chmod(path, info.mode | 0o111);
    }
  }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await fixHelpers();
}
