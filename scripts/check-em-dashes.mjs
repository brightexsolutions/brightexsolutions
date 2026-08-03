#!/usr/bin/env node
/**
 * Fails the build if an em dash reaches the source tree.
 *
 * Brightex copy does not use em dashes anywhere: UI, email templates,
 * generated documents or AI prompts. They creep back in constantly through
 * AI-drafted copy and pasted text, so this is enforced rather than trusted.
 *
 * The prompt rule that forbids the character has to name it, so those
 * occurrences are written as — escapes and never appear literally.
 *
 * Run: npm run lint:copy
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const ROOTS = ["src"];
const EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mdx", ".md"]);
const SKIP_DIRS = new Set(["node_modules", ".next", ".git", "dist", "build"]);

// U+2014 em dash. The en dash (U+2013) stays allowed: it is correct in
// numeric ranges such as "2–4 weeks".
const EM_DASH = "—";

const offences = [];

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      walk(path);
      continue;
    }
    if (!EXTENSIONS.has(extname(entry))) continue;

    const lines = readFileSync(path, "utf8").split("\n");
    lines.forEach((line, i) => {
      if (line.includes(EM_DASH)) {
        offences.push({ path, line: i + 1, text: line.trim().slice(0, 120) });
      }
    });
  }
}

for (const root of ROOTS) walk(root);

if (offences.length > 0) {
  console.error(`\nFound ${offences.length} em dash(es). Use a colon, a comma, or split the sentence.\n`);
  for (const o of offences) {
    console.error(`  ${o.path}:${o.line}\n    ${o.text}`);
  }
  console.error("");
  process.exit(1);
}

console.log("No em dashes found.");
