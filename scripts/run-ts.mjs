#!/usr/bin/env node
/**
 * Runs a TypeScript file that imports from src/ via the `@/` alias.
 *
 * Next compiles the app, but these scripts (checks, seeds) run outside it and
 * still need the same module graph, so they are bundled on the fly with esbuild
 * rather than duplicating logic into plain JS. Bundling to a temp file inside
 * the project, not /tmp, so node resolves runtime dependencies from
 * node_modules normally.
 *
 * Usage: node scripts/run-ts.mjs <file.ts> [--env]
 */
import { build } from "esbuild";
import { spawnSync } from "node:child_process";
import { rmSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const entry = process.argv[2];
const withEnv = process.argv.includes("--env");

if (!entry) {
  console.error("Usage: node scripts/run-ts.mjs <file.ts> [--env]");
  process.exit(1);
}

const outfile = resolve(root, ".run-ts.tmp.cjs");

try {
  await build({
    entryPoints: [resolve(root, entry)],
    bundle: true,
    platform: "node",
    format: "cjs",
    outfile,
    alias: { "@": resolve(root, "src") },
    // Runtime deps stay external so they load from node_modules as usual.
    packages: "external",
    logLevel: "error",
  });

  const args = [];
  if (withEnv) {
    if (!existsSync(resolve(root, ".env.local"))) {
      console.error("No .env.local found, and --env was requested.");
      process.exit(1);
    }
    args.push("--env-file=.env.local");
  }
  args.push(outfile);

  const result = spawnSync(process.execPath, args, { cwd: root, stdio: "inherit" });
  process.exit(result.status ?? 1);
} finally {
  rmSync(outfile, { force: true });
}
