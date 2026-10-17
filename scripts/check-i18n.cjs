#!/usr/bin/env node
// Checks magpie's i18n tables after a merge. Since upstream moved pages to
// plugins, words live in the main table plus one per plugin (each registers
// at runtime via magpie.strings, ON TOP of the main table):
//   main:   internal/gui/assets/i18n.js          (const I18N = { … };)
//   plugin: internal/gui/assets/plugins/<name>/i18n.js (magpie.strings({ … });)
// The kernel warns "is said twice" when a plugin key is already in main —
// this checker must fire BEFORE that, at merge time, across ALL plugins
// (library, usage, sessions, routing, …whatever comes next).
//
// What it catches, per file: duplicate keys within one language section,
// entries at the wrong indent, stray lines that are neither entries nor
// structure (a hand-spliced merge's leftovers). Across files: a key in both
// tables — the plugin registers later and silently wins, so the main copy
// is stale and must go (upstream-first; see docs/agents/upstream-sync.md).
//
//   node scripts/check-i18n.cjs              check both files + cross-file
//   node scripts/check-i18n.cjs FILE         check one file (any of the two shapes)
//   node scripts/check-i18n.cjs --vs REF     diff per-language key sets against
//                                           REF (upstream's file): "only in
//                                           ref" keys that the plugin table
//                                           has are reported as moved there,
//                                           not lost — this is what separates
//                                           a prune from a mistake.
//   node scripts/check-i18n.cjs --selftest   fixtures for the checks below;
//                                           a checker that drives merges (and
//                                           once, a destructive dedupe) earns
//                                           its own tests. The zh-TW incident:
//                                           a head regex that missed the
//                                           uppercase W filed 4k entries under
//                                           the wrong section.
const fs = require("fs");
const path = require("path");

const MAIN = path.join(__dirname, "..", "internal/gui/assets/i18n.js");
const PLUGINS = path.join(__dirname, "..", "internal/gui/assets/plugins");

function pluginTables() {
  if (!fs.existsSync(PLUGINS)) return [];
  return fs.readdirSync(PLUGINS)
    .map((d) => path.join(PLUGINS, d, "i18n.js"))
    .filter((f) => fs.existsSync(f));
}

// A section head accepts quoted and bare names, any case, hyphens: zh,
// "zh-TW". [A-Za-z] both halves — the W cost an afternoon once.
const head = /^ {2}"?([A-Za-z][A-Za-z-]*)"?: \{$/;
const entry = /^ {4}"((?:[^"\\]|\\.)+)":/;
const structural = /^(?:\s*$|\/\/.*|const | {2}\/\/.*| {4}\/\/.*|magpie\.strings\(\{| {2}},?\s*$|},?\s*$|\}\);\s*$)/;

const label = (f) => f.includes(path.join("assets", "plugins")) ? "plugins/" + path.basename(path.dirname(f)) : path.basename(f);
function parse(file, strictIndent) {
  const lines = fs.readFileSync(file, "utf8").split("\n");
  const problems = [];
  let section = "?", seen = new Map();
  const keys = new Map(); // lang → Set of keys
  let stopped = false;
  lines.forEach((l, i) => {
    if (stopped) return;
    const h = l.match(head);
    if (h) { section = h[1]; if (!keys.has(section)) keys.set(section, new Set()); return; }
    if (/^\};\s*$/.test(l) || /^\}\);\s*$/.test(l)) { stopped = true; return; }
    const m = l.match(entry);
    if (m) {
      const k = section + "\u0000" + m[1];
      if (seen.has(k)) problems.push(`${path.basename(file)}:${i + 1}: duplicate key in ${section}: ${JSON.stringify(m[1].slice(0, 60))} (first at ${seen.get(k)})`);
      else seen.set(k, i + 1);
      keys.get(section)?.add(m[1]);
      return;
    }
    if (/^\s*"/.test(l)) { if (strictIndent) problems.push(`${label(file)}:${i + 1}: entry at the wrong indent: ${JSON.stringify(l.slice(0, 60))}`); return; }
    if (!structural.test(l)) problems.push(`${label(file)}:${i + 1}: not an entry, not structure: ${JSON.stringify(l.slice(0, 60))}`);
  });
  return { file, problems, keys, count: seen.size };
}

function crossFile(main, plugins) {
  const out = [];
  const seen = new Map(); // lang\u0000key → first file that has it
  const claim = (file, keys) => {
    for (const [lang, ks] of keys) for (const k of ks) {
      const id = lang + "\u0000" + k;
      if (seen.has(id)) out.push(`${lang} key ${JSON.stringify(k.slice(0, 60))} in both ${path.basename(path.dirname(seen.get(id)))} and ${path.basename(path.dirname(file))} — the later registration wins; drop the earlier copy`);
      else seen.set(id, file);
    }
  };
  claim(main.file, main.keys);
  for (const p of plugins) claim(p.file, p.keys);
  return out;
}

function selftest() {
  const t = (name, src, expect) => {
    fs.writeFileSync("/tmp/i18n-selftest.js", src);
    const r = parse("/tmp/i18n-selftest.js", true);
    const got = r.problems.length;
    if (got !== expect) { console.error(`selftest ${name}: expected ${expect} problems, got ${got}: ${r.problems.join(" | ") || "(none)"}`); process.exit(1); }
  };
  t("clean bare+quoted heads", 'const X = {\n  zh: {\n    "a": "1",\n  },\n  "zh-TW": {\n    "a": "1",\n  },\n};\n', 0);
  t("plugin shape", 'magpie.strings({\n  de: {\n    "a": "1",\n  },\n});\n', 0);
  t("duplicate within section", 'const X = {\n  zh: {\n    "a": "1",\n    "a": "2",\n  },\n};\n', 1);
  t("wrong indent", 'const X = {\n  zh: {\n  "a": "1",\n  },\n};\n', 1);
  t("stray", 'const X = {\n  zh: {\n    "a": "1",\n  },\n  oops\n};\n', 1);
  t("same key two langs is fine", 'const X = {\n  zh: {\n    "a": "1",\n  },\n  ja: {\n    "a": "1",\n  },\n};\n', 0);
  console.log("selftest ok: heads, dups, indents, strays, both shapes");
}

const args = process.argv.slice(2);
if (args[0] === "--selftest") { selftest(); process.exit(0); }

if (args[0] === "--vs") {
  const ref = parse(args[1]);
  const main = parse(MAIN, true);
  const plugins = pluginTables().map(parse);
  const all = (lang) => new Set([...(main.keys.get(lang) || []), ...plugins.flatMap((p) => [...(p.keys.get(lang) || [])])]);
  const out = [];
  for (const [lang, refKeys] of ref.keys) {
    const mine = all(lang);
    const lost = [...refKeys].filter((k) => !mine.has(k));
    const added = [...mine].filter((k) => !refKeys.has(k));
    if (lost.length) out.push(`${lang}: ${lost.length} in ref missing here — truly absent: investigate before trusting the merge`);
    if (added.length) out.push(`${lang}: ${added.length} only here (fork keys expected; a large count means a merge mishap)`);
  }
  console.log(out.length ? out.join("\n") : "--vs: key sets identical");
  process.exit(0);
}

const explicit = args[0] && !args[0].startsWith("-") ? [parse(args[0])] : null;
const files = explicit || [parse(MAIN, true), ...pluginTables().map((f) => parse(f))];
const problems = files.flatMap((f) => f.problems).concat(files.length > 1 ? crossFile(files[0], files.slice(1)) : []);
if (problems.length) { for (const p of problems) console.error(p); process.exit(1); }
console.log(`i18n ok: ${files.map((f) => `${f.file.includes("plugins") ? path.basename(path.dirname(f.file)) : "main"} ${f.count}`).join(" + ")}, no duplicates, no strays${files.length > 1 ? ", no cross-table clashes" : ""}`);
