import { lstatSync, readdirSync, realpathSync, rmSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, sep } from 'node:path';

/** Remove only a smoke directory we made, unlinking links without traversing them. */
export function removeConsumer(path) {
  const resolved = realpathSync(path);
  const parent = realpathSync(tmpdir());
  const target = process.platform === 'win32' ? resolved.toLowerCase() : resolved;
  const temp = process.platform === 'win32' ? parent.toLowerCase() : parent;
  if (!target.startsWith(`${temp}${sep}`) || !basename(resolved).startsWith('uix-smoke-')) throw new Error('Refusing to remove a non-smoke directory');
  const pending = [resolved];
  while (pending.length) {
    const dir = pending.pop();
    for (const name of readdirSync(dir)) {
      const child = join(dir, name);
      const stat = lstatSync(child);
      if (stat.isSymbolicLink()) { unlinkSync(child); continue; }
      if (stat.isDirectory()) pending.push(child);
    }
  }
  rmSync(resolved, { recursive: true, force: true });
}
