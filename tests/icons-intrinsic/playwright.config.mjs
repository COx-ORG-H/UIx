import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import base from '../../playwright.config.mjs';
const root = fileURLToPath(new URL('../../', import.meta.url));
export default defineConfig({
  ...base,
  testDir: fileURLToPath(new URL('../', import.meta.url)),
  testMatch: '**/icons-intrinsic.spec.mjs',
  globalSetup: [fileURLToPath(new URL('../require-bundle.mjs', import.meta.url)), fileURLToPath(new URL('../global-setup.mjs', import.meta.url))],
  webServer: { ...base.webServer, cwd: root },
  projects: ['chromium', 'firefox', 'webkit'].flatMap((browserName) => ['light', 'dark'].map((theme) => ({ name: `${browserName}-${theme}`, use: { browserName, colorScheme: theme } }))),
});
