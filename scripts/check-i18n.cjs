#!/usr/bin/env node
// Checks magpie's i18n tables after a merge. Two surfaces since upstream
// moved the Library page to a plugin (its words register at runtime via
// magpie.strings, ON TOP of the main table):
//   main:   internal/gui/assets/i18n.js          (const I18N = { … };)
//   plugin: internal/gui/assets/plugins/library/i18n.js (magpie.strings({ … });)
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
const PLUGIN = path.join(__dirname, "..", "internal/gui/assets/plugins/library/i18n.js");

// A section head accepts quoted and bare names, any case, hyphens: zh,
// "zh-TW". [A-Za-z] both halves — the W cost an afternoon once.
const head = /^ {2}"?([A-Za-z][A-Za-z-]*)"?: \{$/;
const entry = /^ {4}"((?:[^"\\]|\\.)+)":/;
const structural = /^(?:\s*$|\/\/.*|const | {2}\/\/.*| {4}\/\/.*|magpie\.strings\(\{| {2}},?\s*$|},?\s*$|\}\);\s*$)/;

function parse(file) {
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
    if (/^\s*"/.test(l)) { problems.push(`${path.basename(file)}:${i + 1}: entry at the wrong indent: ${JSON.stringify(l.slice(0, 60))}`); return; }
    if (!structural.test(l)) problems.push(`${path.basename(file)}:${i + 1}: not an entry, not structure: ${JSON.stringify(l.slice(0, 60))}`);
  });
  return { file, problems, keys, count: seen.size };
}

function crossFile(main, plugin) {
  const out = [];
  for (const [lang, pkeys] of plugin.keys) {
    for (const k of pkeys) if (main.keys.get(lang)?.has(k))
      out.push(`both tables define ${lang} key ${JSON.stringify(k.slice(0, 60))}: the plugin's registers later and wins — drop the main copy`);
  }
  return out;
}

function selftest() {
  const t = (name, src, expect) => {
    fs.writeFileSync("/tmp/i18n-selftest.js", src);
    const r = parse("/tmp/i18n-selftest.js");
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
  const main = parse(MAIN);
  const plugin = fs.existsSync(PLUGIN) ? parse(PLUGIN) : { keys: new Map() };
  const out = [];
  for (const [lang, refKeys] of ref.keys) {
    const mine = new Set([...(main.keys.get(lang) || []), ...(plugin.keys.get(lang) || [])]);
    const lost = [...refKeys].filter((k) => !mine.has(k));
    const added = [...mine].filter((k) => !refKeys.has(k));
    const moved = lost.filter((k) => plugin.keys.get(lang)?.has(k));
    if (lost.length) out.push(`${lang}: ${lost.length} in ref missing here${moved.length ? ` (${moved.length} moved to the plugin table)` : ""}${lost.length - moved.length ? " — truly absent: investigate before trusting the merge" : ""}`);
    if (added.length) out.push(`${lang}: ${added.length} only here (fork keys expected; a large count means a merge mishap)`);
  }
  console.log(out.length ? out.join("\n") : "--vs: key sets identical");
  process.exit(0);
}

const files = args[0] ? [parse(args[0])] : [parse(MAIN), ...fs.existsSync(PLUGIN) ? [parse(PLUGIN)] : []];
const problems = files.flatMap((f) => f.problems).concat(files.length === 2 ? crossFile(files[0], files[1]) : []);
if (problems.length) { for (const p of problems) console.error(p); process.exit(1); }
console.log(`i18n ok: ${files.map((f) => `${path.basename(path.dirname(f.file))}/${path.basename(f.file)} ${f.count}`).join(" + ")}, no duplicates, no strays${files.length === 2 ? ", no cross-table clashes" : ""}`);
