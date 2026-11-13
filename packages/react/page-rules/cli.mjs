#!/usr/bin/env node
// `uix-page-rules` — the UIx page rules as a product gate (HAR-3874). See README.md.
import { run } from './index.mjs';

process.exitCode = run(process.argv.slice(2));
