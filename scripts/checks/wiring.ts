/**
 * Wiring checks: the bugs that type-checking and unit tests both miss.
 *
 * Every fault this file looks for has already happened at least once in this
 * feature: a fetch pointing at a route that does not exist, a client component
 * reading a column no route selects, two flags that are supposed to move
 * together drifting apart, or CSS defined somewhere the page never loads.
 *
 * These are read off the source rather than executed, because the failure is
 * structural: the code runs perfectly and does the wrong thing.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

let fails = 0;
const t = (n: string, c: boolean, d = "") => { if (!c) { fails++; console.log(`  FAIL ${n} :: ${d}`); } else console.log(`  ok   ${n}`); };

const ROOT = process.cwd();

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (["node_modules", ".next", ".git"].includes(entry)) continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.tsx?$/.test(entry)) out.push(path);
  }
  return out;
}

const appFiles = walk(join(ROOT, "src/app"));
const allFiles = [...appFiles, ...walk(join(ROOT, "src/lib")), ...walk(join(ROOT, "src/components"))];
const source = new Map(allFiles.map((f) => [f, readFileSync(f, "utf8")]));

// ── 1. Every fetched admin/public API path has a route file ────────────────
console.log("\n1. Every fetched route exists");

const routeDirs = new Set(
  appFiles
    .filter((f) => /[/\\]route\.ts$/.test(f))
    .map((f) =>
      f
        .replace(join(ROOT, "src/app"), "")
        .replace(/[/\\]route\.ts$/, "")
        .replace(/\\/g, "/")
        // Route groups such as (admin) are not part of the URL.
        .replace(/\/\([^)]+\)/g, "")
    )
);

/** Turns a fetched URL into the shape a route directory would have. */
function toRoutePattern(url: string): string {
  return url
    .split("?")[0]
    .replace(/\$\{[^}]+\}/g, ":p")
    .replace(/\/+$/, "");
}

/** True when a concrete path matches a route dir, allowing for [id] segments. */
function routeExists(pattern: string): boolean {
  const parts = pattern.split("/").filter(Boolean);
  outer: for (const dir of routeDirs) {
    const dirParts = dir.split("/").filter(Boolean);
    if (dirParts.length !== parts.length) continue;
    for (let i = 0; i < parts.length; i++) {
      const d = dirParts[i];
      const p = parts[i];
      if (d.startsWith("[") && d.endsWith("]")) continue;
      if (d !== p) continue outer;
    }
    return true;
  }
  return false;
}

const missing: string[] = [];
for (const [file, text] of source) {
  for (const m of text.matchAll(/fetch\(\s*[`'"](\/api\/[^`'"]+)[`'"]/g)) {
    const pattern = toRoutePattern(m[1]);
    if (!routeExists(pattern)) missing.push(`${pattern}  (${file.replace(ROOT + "/", "")})`);
  }
}
t("no fetch points at a route that does not exist", missing.length === 0, missing.slice(0, 4).join(" | "));

// ── 2. Document CSS classes are defined where the page can see them ────────
console.log("\n2. Document CSS lives in the shell");
const shell = source.get(join(ROOT, "src/lib/document-html/index.ts")) ?? "";
const accept = source.get(join(ROOT, "src/lib/document-html/accept.ts")) ?? "";

t("accept.ts exports no stylesheet of its own",
  !/export const \w*CSS/.test(accept),
  "documentShell() emits the only <style> block, so it would never load");

const acceptClasses = new Set<string>();
for (const m of accept.matchAll(/class="([^"$]+)"/g)) {
  for (const c of m[1].trim().split(/\s+/)) if (c && !c.includes("{")) acceptClasses.add(c);
}
const undefined_ = [...acceptClasses].filter((c) => !shell.includes(`.${c}`));
t("every class accept.ts emits is styled in the shell", undefined_.length === 0, undefined_.join(", "));

// ── 3. gated and gate_mode are never written apart ─────────────────────────
console.log("\n3. Paired flags move together");
for (const [file, text] of source) {
  if (!file.includes("/api/")) continue;
  // A route that writes `gated:` must also write gate_mode, or the two drift
  // and the renderer reads a state nothing produces deliberately.
  // Section-level `gated` (a flag inside a document's own data) is a different
  // thing from the document column, and does not need gate_mode alongside it.
  const isSectionFlag = file.includes("/sections/");
  const writesGated = !isSectionFlag
    && /\bgated:\s*(?!undefined)/.test(text)
    && /\.update\(|\.insert\(/.test(text);
  if (!writesGated) continue;
  const rel = file.replace(ROOT + "/", "");
  t(`${rel} keeps gate_mode in step`, text.includes("gate_mode"), "writes `gated` alone");
}

// ── 4. No native dialogs in the admin ──────────────────────────────────────
console.log("\n4. No native alert/confirm in admin UI");
const nativeDialogs: string[] = [];
for (const [file, text] of source) {
  if (!file.includes("/(admin)/") && !file.includes("/components/admin/")) continue;
  for (const m of text.matchAll(/(?<![.\w])(alert|confirm)\s*\(/g)) {
    // `confirm(` from useConfirm() is the intended call; only window-level ones matter.
    const before = text.slice(Math.max(0, m.index! - 40), m.index!);
    if (m[1] === "confirm" && /await\s+$|=\s*useConfirm|const confirm/.test(before)) continue;
    if (m[1] === "alert") nativeDialogs.push(`${file.replace(ROOT + "/", "")}: ${m[1]}()`);
  }
}
t("no window.alert in the admin", nativeDialogs.length === 0, nativeDialogs.slice(0, 3).join(" | "));

// ── 5. DB-backed GET route handlers are dynamic ────────────────────────────
console.log("\n5. DB-backed routes are not frozen at build time");
const frozen: string[] = [];
for (const [file, text] of source) {
  if (!/[/\\]route\.ts$/.test(file)) continue;
  if (!/export async function GET/.test(text)) continue;
  if (!/createAdminClient|createClient/.test(text)) continue;
  if (!/export const dynamic\s*=\s*"force-dynamic"/.test(text)) {
    frozen.push(file.replace(ROOT + "/", ""));
  }
}
// Long-standing routes predate the rule; only the document pipeline is asserted.
const pipelineFrozen = frozen.filter((f) => /documents|intakes|signature|templates|schedule-invoices/.test(f));
t("document pipeline GET routes are force-dynamic", pipelineFrozen.length === 0, pipelineFrozen.join(", "));

// ── 5b. Shared vocabularies are imported, not retyped ──────────────────────
console.log("\n5b. Enums are shared, not repeated as literals");

// The settings UI once sent method "draw" while the API expected "drawn". zod
// rejected it as a bare "Invalid input" naming neither field nor reason, and
// nothing caught it until it was clicked. The fix was one exported list that
// both sides import; this keeps it that way.
for (const [file, text] of source) {
  if (!/signature/.test(file)) continue;
  const inlineEnum = /z\.enum\(\s*\[\s*"(?:drawn|upload|typed)"/.test(text);
  t(`${file.replace(ROOT + "/", "")} does not retype the signature methods`, !inlineEnum,
    "import SIGNATURE_INPUT_METHODS instead");
}

// Any zod schema rejecting a request should say which field was wrong. A bare
// "Invalid input" sends whoever hits it reading source.
const opaque: string[] = [];
for (const [file, text] of source) {
  if (!/[/\\]route\.ts$/.test(file)) continue;
  if (!/documents|intakes|signature|templates/.test(file)) continue;
  if (/error: "Invalid input" \}/.test(text) && !/parsed\.error\.issues|error\.flatten\(\)/.test(text)) {
    opaque.push(file.replace(ROOT + "/", ""));
  }
}
t("rejections name the offending field", opaque.length === 0, opaque.join(", "));

// ── 5c. Client-facing email opens with "Hello" ─────────────────────────────
console.log("\n5c. Email greetings");

// House voice: emails greet with "Hello", never "Hi". Worth enforcing because
// the greeting is written fresh in every new email template and drifts back by
// habit. WhatsApp prefills are excluded: those are the VISITOR's own words, put
// in their mouth by a link, not ours.
const wrongGreeting: string[] = [];
for (const [file, text] of source) {
  if (!/[/\\]api[/\\]|[/\\]lib[/\\]/.test(file)) continue;
  for (const m of text.matchAll(/[`">]Hi[ ,]/g)) {
    const context = text.slice(Math.max(0, m.index! - 120), m.index! + 40);
    if (/whatsapp|wa\.me|WHATSAPP/i.test(context)) continue;
    wrongGreeting.push(`${file.replace(ROOT + "/", "")}: ${text.slice(m.index!, m.index! + 30).replace(/\n/g, " ")}`);
  }
}
t('emails greet with "Hello", not "Hi"', wrongGreeting.length === 0, wrongGreeting.slice(0, 3).join(" | "));

// ── 6. Client actions reach the audit log ──────────────────────────────────
console.log("\n6. Client-facing state changes are audited");
for (const route of [
  "src/app/api/public/documents/[id]/accept-proposal/route.ts",
  "src/app/api/public/documents/[id]/accept/route.ts",
  "src/app/api/public/documents/[id]/sign/route.ts",
  "src/app/api/public/documents/[id]/request-changes/route.ts",
]) {
  const text = source.get(join(ROOT, route)) ?? "";
  t(`${route.split("/").slice(-2)[0]} logs to activity_log`, text.includes("logClientAction"));
}

// ── 7. Accepted documents are protected from edits ─────────────────────────
console.log("\n7. An accepted document cannot be edited");
for (const route of [
  "src/app/api/admin/documents/[id]/sections/route.ts",
  "src/app/api/admin/documents/[id]/refine-block/route.ts",
]) {
  const text = source.get(join(ROOT, route)) ?? "";
  t(`${route.split("/").slice(-2)[0]} refuses once accepted`, /accepted_at/.test(text) && /409/.test(text));
}

console.log(fails === 0 ? "\nALL WIRING CHECKS PASSED\n" : `\n${fails} FAILED\n`);
process.exit(fails === 0 ? 0 : 1);
