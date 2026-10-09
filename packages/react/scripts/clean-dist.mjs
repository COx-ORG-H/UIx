#!/usr/bin/env node
/* Removes dist/ once, before tsup starts.
 *
 * tsup runs the configs of an array in parallel (one Promise.all), and `clean` belongs to
 * a single config: it lists dist/ and then unlinks what it listed, whenever that config
 * gets there. With `clean: true` on the ESM config, the CJS bundles were deleted whenever
 * the CJS config had written them first, and the build still exited 0 (2026-10-08). So no
 * config cleans; this runs before either of them exists.
 */
import { rmSync } from 'node:fs';

// maxRetries: on Windows a virus scanner or a watcher can hold a file for a moment (EBUSY/EPERM).
rmSync(new URL('../dist', import.meta.url), { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
