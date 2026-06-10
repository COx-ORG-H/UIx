#!/usr/bin/env node
/** Tiny static server for dist/r — local registry consumption + smoke tests.
 *  Usage: node scripts/serve-registry.mjs [port]  (default 8377) */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'r');
const port = Number(process.argv[2] ?? 8377);

createServer(async (req, res) => {
  const rel = normalize(decodeURIComponent((req.url ?? '/').split('?')[0])).replace(/^([/\\]|\.\.)+/, '');
  try {
    const data = await readFile(join(root, rel));
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('not found');
  }
}).listen(port, () => console.log(`@uix registry: serving ${root} on http://127.0.0.1:${port}`));
