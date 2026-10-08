import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

/*
 * CSS size budget (scripts/size-report.mjs), run as CI runs it: the real CLI, its exit code,
 * and the baseline file it writes, against a small fixture package (--root).
 *
 * The last two tests are the reason the baseline has the shape it has. Until 2026-10-07 every
 * PR that touched component CSS rewrote the same baseline lines (the two bundle totals), so any
 * two open PRs conflicted on a file neither had authored. An --update now writes only the
 * entries of the stylesheets that change resized, and git has to be able to merge two of them.
 */

const SCRIPT = fileURLToPath(new URL("../scripts/size-report.mjs", import.meta.url));

/** ~60 bytes of rule per line under a comment, so a "minified" copy is clearly smaller. */
const rules = (name, count) =>
  `/* ${name} — authored source, with the comments and indentation a minifier removes. */\n` +
  `@layer uix.components {\n` +
  Array.from({ length: count }, (_, i) => `  .uix-${name}__part-${i} {\n    padding: var(--uix-space-${i % 8});\n  }\n`).join("") +
  `}\n`;

const minify = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, "");

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "uix-css-size-"));
  const write = (rel, content) => {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), content);
  };
  const read = (rel) => readFileSync(join(root, rel), "utf8");
  const components = ["alert", "badge", "button"];

  mkdirSync(join(root, "tests"), { recursive: true });
  write("build/css/tokens.css", `:root {\n${Array.from({ length: 8 }, (_, i) => `  --uix-space-${i}: ${i * 4}px;\n`).join("")}}\n`);
  write("styles/tokens.css", `/* re-export */\n@import "../build/css/tokens.css";\n`);
  write("styles/base.css", rules("base", 12));
  write("styles/main.css", `@layer uix.tokens, uix.base, uix.components;\n@import "tokens.css";\n@import "base.css";\n@import "component-list.css";\n`);
  write("styles/components.css", `@layer uix.components;\n@import "component-list.css";\n`);
  for (const name of components) write(`styles/components/${name}.css`, rules(name, 20));

  const api = {
    root,
    write,
    read,
    /** Add or replace a component and (re)list it, the way a PR does. */
    component(name, count) {
      if (!components.includes(name)) components.push(name);
      write(`styles/components/${name}.css`, rules(name, count));
    },
    remove(name) {
      components.splice(components.indexOf(name), 1);
      rmSync(join(root, `styles/components/${name}.css`));
    },
    /** Stand-in for build-styles.mjs: inline the imports, optionally minify. */
    build({ minified = true } = {}) {
      write("styles/component-list.css", components.map((name) => `@import "components/${name}.css";\n`).join(""));
      const all = components.map((name) => read(`styles/components/${name}.css`)).join("");
      const out = minified ? minify : (css) => css;
      write("build/css/styles.css", out(read("build/css/tokens.css") + read("styles/base.css") + all));
      write("build/css/components.css", out(all));
    },
    run(mode) {
      const result = spawnSync(process.execPath, [SCRIPT, mode, "--root", root], { encoding: "utf8" });
      return { code: result.status, out: result.stdout + result.stderr };
    },
    baseline: () => read("tests/css-size.baseline.json"),
    sizes: () => JSON.parse(read("tests/css-size.baseline.json")).sizes,
    dispose: () => rmSync(root, { recursive: true, force: true }),
  };
  api.build();
  return api;
}

const withFixture = (body) => () => {
  const fx = fixture();
  try {
    return body(fx);
  } finally {
    fx.dispose();
  }
};

test("the first --update records every stylesheet a bundle is made of, and no bundle", withFixture((fx) => {
  assert.equal(fx.run("--check").code, 1, "no baseline yet");
  assert.equal(fx.run("--update").code, 0);
  assert.deepEqual(Object.keys(fx.sizes()), [
    "build/css/tokens.css",
    "styles/base.css",
    "styles/components/alert.css",
    "styles/components/badge.css",
    "styles/components/button.css",
  ]);
  const check = fx.run("--check");
  assert.equal(check.code, 0, check.out);
  assert.match(check.out, /build\/css\/styles\.css: .* of its inputs/, "bundle sizes stay in the log");
}));

test("a change inside the tolerance passes --check and --update leaves the file byte-identical", withFixture((fx) => {
  fx.run("--update");
  const before = fx.baseline();
  fx.write("styles/components/alert.css", fx.read("styles/components/alert.css") + "/* a note */\n");
  fx.build();
  assert.equal(fx.run("--check").code, 0);
  assert.equal(fx.run("--update").code, 0);
  assert.equal(fx.baseline(), before);
}));

test("growth past the tolerance fails --check; --update rewrites that entry and nothing else", withFixture((fx) => {
  fx.run("--update");
  const before = fx.sizes();
  fx.component("badge", 40);
  fx.build();
  const check = fx.run("--check");
  assert.equal(check.code, 1);
  assert.match(check.out, /styles\/components\/badge\.css: raw grew/);
  assert.doesNotMatch(check.out, /alert\.css|button\.css|base\.css/);

  assert.equal(fx.run("--update").code, 0);
  const after = fx.sizes();
  assert.ok(after["styles/components/badge.css"].raw > before["styles/components/badge.css"].raw);
  delete before["styles/components/badge.css"];
  delete after["styles/components/badge.css"];
  assert.deepEqual(after, before);
  assert.equal(fx.run("--check").code, 0);
}));

test("a stylesheet that shrank keeps passing, and --update lowers its entry", withFixture((fx) => {
  fx.run("--update");
  const before = fx.sizes()["styles/components/button.css"].raw;
  fx.component("button", 5);
  fx.build();
  assert.equal(fx.run("--check").code, 0);
  fx.run("--update");
  assert.ok(fx.sizes()["styles/components/button.css"].raw < before, "or the freed bytes could be re-spent unseen");
}));

test("a new or deleted stylesheet fails --check until --update acknowledges it", withFixture((fx) => {
  fx.run("--update");
  fx.component("card", 10);
  fx.build();
  let check = fx.run("--check");
  assert.equal(check.code, 1);
  assert.match(check.out, /styles\/components\/card\.css: NEW file/);
  fx.run("--update");
  assert.equal(fx.run("--check").code, 0);

  fx.remove("card");
  fx.build();
  check = fx.run("--check");
  assert.equal(check.code, 1);
  assert.match(check.out, /styles\/components\/card\.css: in baseline but MISSING/);
  fx.run("--update");
  assert.equal("styles/components/card.css" in fx.sizes(), false);
}));

test("a bundle that lost its minification fails --check, and --update does not excuse it", withFixture((fx) => {
  fx.run("--update");
  fx.build({ minified: false });
  let check = fx.run("--check");
  assert.equal(check.code, 1);
  assert.match(check.out, /build\/css\/styles\.css: .* of its inputs/);
  assert.match(check.out, /build\/css\/components\.css: .* of its inputs/);
  fx.run("--update");
  check = fx.run("--check");
  assert.equal(check.code, 1, "a build regression is not a number to re-baseline");
}));

test("a bundle entry left in the baseline fails --check and --update drops it", withFixture((fx) => {
  fx.run("--update");
  const baseline = JSON.parse(fx.baseline());
  baseline.sizes["build/css/styles.css"] = { raw: 1, gzip: 1, brotli: 1 };
  fx.write("tests/css-size.baseline.json", JSON.stringify(baseline, null, 2) + "\n");
  const check = fx.run("--check");
  assert.equal(check.code, 1);
  assert.match(check.out, /build\/css\/styles\.css: bundles are no longer baselined/);
  fx.run("--update");
  assert.equal("build/css/styles.css" in fx.sizes(), false);
  assert.equal(fx.run("--check").code, 0);
}));

/** `git merge-file`: the three-way merge GitHub and a local rebase both do on the baseline. */
function mergeBaselines(fx, ours, base, theirs) {
  for (const [name, text] of Object.entries({ ours, base, theirs })) fx.write(`merge/${name}.json`, text);
  const result = spawnSync("git", ["merge-file", "-p", "ours.json", "base.json", "theirs.json"], {
    cwd: join(fx.root, "merge"),
    encoding: "utf8",
  });
  assert.equal(result.error, undefined, "git is on PATH");
  return { conflicts: result.status, text: result.stdout };
}

for (const [label, a, b] of [
  ["neighbouring", "alert", "badge"], // adjacent entries: the closest two unrelated changes can get
  ["distant", "alert", "button"],
]) {
  test(`two PRs that resize ${label} stylesheets merge without a conflict, and the result passes`, withFixture((fx) => {
    fx.run("--update");
    const base = fx.baseline();
    const original = fx.read(`styles/components/${a}.css`);

    // PR A: grows one component.
    fx.component(a, 45);
    fx.build();
    fx.run("--update");
    const fromA = fx.baseline();

    // PR B, branched from the same base: grows another and adds a new one.
    fx.write(`styles/components/${a}.css`, original);
    fx.write("tests/css-size.baseline.json", base);
    fx.component(b, 45);
    fx.component("card", 10);
    fx.build();
    fx.run("--update");
    const fromB = fx.baseline();

    assert.notEqual(fromA, base);
    assert.notEqual(fromB, base);
    const merged = mergeBaselines(fx, fromA, base, fromB);
    assert.equal(merged.conflicts, 0, merged.text);

    // Both PRs on master: the merged baseline is the right one for the merged tree.
    fx.component(a, 45);
    fx.build();
    fx.write("tests/css-size.baseline.json", merged.text);
    const check = fx.run("--check");
    assert.equal(check.code, 0, check.out);
  }));
}

test("the old shape did conflict: a stored bundle total is a line every CSS change rewrites", withFixture((fx) => {
  // Keeps the two tests above honest — the same three-way merge, with the entry this script no
  // longer writes, is the conflict that made ten open PRs DIRTY at once.
  fx.run("--update");
  const withTotal = (raw) => {
    const baseline = JSON.parse(fx.baseline());
    baseline.sizes = { "build/css/styles.css": { raw, gzip: 1, brotli: 1 }, ...baseline.sizes };
    return JSON.stringify(baseline, null, 2) + "\n";
  };
  const merged = mergeBaselines(fx, withTotal(2000), withTotal(1000), withTotal(3000));
  assert.ok(merged.conflicts > 0);
}));
