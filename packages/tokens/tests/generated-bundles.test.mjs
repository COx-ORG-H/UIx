import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

/*
 * build/css/styles.css and build/css/components.css are built, never committed.
 *
 * Each is a single minified line, so two branches that both rebuild it always conflict, whatever
 * they changed: on 2026-10-07 one merge turned ten open PRs DIRTY on these two files alone. They
 * are ignored now (.gitignore), and the docs pages that link the bundle load the authored
 * stylesheet when it is absent. Both halves are easy to undo without noticing — a `git add -f`
 * while resolving a conflict, a tidy-up of <head> — and neither would turn any other gate red.
 */

const PKG = fileURLToPath(new URL("..", import.meta.url));
const git = (...args) => spawnSync("git", args, { cwd: PKG, encoding: "utf8" });

test("the minified bundles are not tracked", () => {
  // tokens.css sits next to them and IS committed: it proves the query can see this directory.
  const tracked = git("ls-files", "--", "build/css");
  assert.equal(tracked.status, 0, tracked.stderr);
  const files = tracked.stdout.trim().split("\n");
  assert.ok(files.includes("build/css/tokens.css"), `git ls-files saw: ${files.join(", ")}`);
  assert.deepEqual(
    files.filter((file) => file !== "build/css/tokens.css"),
    [],
    "run: git rm --cached packages/tokens/build/css/styles.css packages/tokens/build/css/components.css",
  );
});

test("git ignores the bundles, so `git add -A` after a build cannot bring them back", () => {
  for (const file of ["build/css/styles.css", "build/css/components.css"]) {
    assert.equal(git("check-ignore", "-q", file).status, 0, `${file} is not ignored`);
  }
  assert.equal(git("check-ignore", "-q", "build/css/tokens.css").status, 1, "tokens.css must stay committed");
});

const htmlFiles = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  if (entry.name === "node_modules" || entry.name === "build") return [];
  const path = join(dir, entry.name);
  return entry.isDirectory() ? htmlFiles(path) : entry.name.endsWith(".html") ? [path] : [];
});

test("every docs page that links the bundle falls back to the authored stylesheet", () => {
  const pages = htmlFiles(PKG)
    .map((path) => [path, readFileSync(path, "utf8").match(/<link\b[^>]*build\/css\/styles\.css[^>]*>/)?.[0]])
    .filter(([, link]) => link);
  assert.deepEqual(pages.map(([path]) => relative(PKG, path).replaceAll("\\", "/")).sort(), ["docs/explorer.html", "tables.html"]);

  for (const [path, link] of pages) {
    const fallback = link.match(/onerror="this\.onerror=null;this\.href='([^']+)'"/)?.[1];
    assert.ok(fallback, `${path}: the bundle <link> has no onerror fallback — ${link}`);
    assert.equal(resolve(dirname(path), fallback), join(PKG, "styles", "main.css"));
    assert.ok(existsSync(resolve(dirname(path), fallback)));
  }
});
