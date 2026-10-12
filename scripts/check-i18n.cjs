#!/usr/bin/env node
// Checks internal/gui/assets/i18n.js after a merge: duplicate keys within
// one language section, entries at the wrong indent, stray lines that are
// neither entries nor structure. node --check catches only syntax; this
// catches what a hand-spliced merge leaves behind. Run: node scripts/check-i18n.cjs
const fs = require("fs");
const path = require("path");
const lines = fs.readFileSync(path.join(__dirname, "..", "internal/gui/assets/i18n.js"), "utf8").split("\n");
const entry = /^ {4}"((?:[^"\\]|\\.)+)":/;
const head = /^ {2}"?([A-Za-z-]+)"?: \{$/;
const structural = /^(?:\s*$|^\/\/.*|const | {2}\/\/.*| {4}\/\/.*| {2}},?\s*$|},?\s*$)/;
let section = "?", inTable = false, stopped = false;
const seen = new Map();
const problems = [];
lines.forEach((l, i) => {
  if (stopped) return;
  const h = l.match(head);
  if (h) { inTable = true; section = h[1]; return; }
  if (/^};\s*$/.test(l)) { stopped = true; return; }  // table over; code follows
  const m = l.match(entry);
  if (m) {
    const k = section + "\u0000" + m[1];
    if (seen.has(k)) problems.push(`${i + 1}: duplicate key in ${section}: ${JSON.stringify(m[1].slice(0, 60))} (first at ${seen.get(k)})`);
    else seen.set(k, i + 1);
    return;
  }
  if (/^\s*"/.test(l)) { problems.push(`${i + 1}: an entry at the wrong indent: ${JSON.stringify(l.slice(0, 60))}`); return; }
  if (!structural.test(l)) problems.push(`${i + 1}: not an entry, not structure: ${JSON.stringify(l.slice(0, 60))}`);
});
if (problems.length) { for (const p of problems) console.error(p); process.exit(1); }
console.log(`i18n ok: ${seen.size} entries across the table, no duplicates, no strays`);
