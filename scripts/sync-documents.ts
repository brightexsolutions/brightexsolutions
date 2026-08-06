/**
 * Validates every stored document against the current build, and reports.
 *
 * The schema moves as block kinds and rules are added. A document written last
 * week can therefore stop validating this week, and the failure mode is the bad
 * one: it stores fine, renders half a section, and is discovered by whoever it
 * was sent to. This is the sweep that catches that before a client does.
 *
 * It REPORTS by default and only writes with --fix, because a document already
 * with a client is a record: silently rewriting it to satisfy a new rule would
 * change what someone was shown after they were shown it.
 *
 *   npm run docs:sync         report
 *   npm run docs:sync -- --fix   apply safe normalisation to drafts only
 */
import { createClient } from "@supabase/supabase-js";
import { parseBlockDocument, normaliseCopy } from "../src/lib/document-html/block-schema";
import { renderBlockDocument, isBlockDocument, documentTotal, needsFigureLock, fmtMoney } from "../src/lib/document-html/blocks";
import type { BlockDocument } from "../src/lib/document-html/blocks";

const FIX = process.argv.includes("--fix");

const line = (s = "") => console.log(s);
const ok = (s: string) => line(`  \x1b[32mok\x1b[0m    ${s}`);
const bad = (s: string) => line(`  \x1b[31mFAIL\x1b[0m  ${s}`);
const warn = (s: string) => line(`  \x1b[33m!\x1b[0m     ${s}`);

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { data: docs, error } = await supabase
    .from("generated_documents")
    .select("id, type, title, reference_code, status, gated, gate_mode, accepted_at, data, raw_html")
    .order("created_at", { ascending: false });
  if (error) throw error;

  line("\n\x1b[1m\x1b[36mDOCUMENT SYNC\x1b[0m");
  line(`  ${docs?.length ?? 0} documents, ${FIX ? "fixing drafts" : "reporting only"}\n`);

  let blockDocs = 0, legacy = 0, rawHtml = 0, failures = 0, fixed = 0;

  for (const doc of docs ?? []) {
    const label = `${String(doc.reference_code ?? doc.id.slice(0, 8)).padEnd(24)} ${doc.type}`;

    if (doc.raw_html) {
      rawHtml++;
      warn(`${label}  verbatim HTML: no responsive layout, no A4 print, cannot be signed`);
      continue;
    }
    if (!isBlockDocument(doc.data)) {
      legacy++;
      line(`  \x1b[90m-\x1b[0m     ${label}  legacy shape, renders through the old path`);
      continue;
    }

    blockDocs++;
    const result = parseBlockDocument(doc.data);

    if (!result.ok) {
      failures++;
      bad(`${label}  ${(result.errors ?? []).slice(0, 3).join("; ")}`);

      if (FIX) {
        if (doc.accepted_at || doc.status === "sent" || doc.status === "final") {
          warn(`        not fixed: already ${doc.accepted_at ? "accepted" : doc.status}, and a record is not rewritten`);
        } else {
          const repaired = parseBlockDocument(normaliseCopy(doc.data));
          if (repaired.ok && repaired.doc) {
            await supabase.from("generated_documents").update({ data: repaired.doc }).eq("id", doc.id);
            fixed++;
            ok("        normalised and saved");
          } else {
            warn("        could not be repaired automatically: edit it in the document editor");
          }
        }
      }
      continue;
    }

    // Validating is not the same as rendering. Render it too: a document that
    // parses but throws on render is still broken for the client.
    const document = result.doc as BlockDocument;
    try {
      const html = renderBlockDocument(document, { gated: !!doc.gated });
      const total = documentTotal(document);
      const notes: string[] = [
        `${document.sections.filter((s) => !s.hidden).length} sections`,
        total ? `KES ${fmtMoney(total)}` : "no total",
      ];
      if (needsFigureLock(document)) notes.push("ranged");
      if (doc.gate_mode && doc.gate_mode !== "off") notes.push(`gate: ${doc.gate_mode}`);
      if (html.includes("—")) { notes.push("\x1b[31mem dash\x1b[0m"); failures++; }
      ok(`${label}  ${notes.join(", ")}`);
    } catch (err) {
      failures++;
      bad(`${label}  renders with an error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  line("");
  line(`  block documents : ${blockDocs}`);
  line(`  legacy shape    : ${legacy}`);
  line(`  verbatim HTML   : ${rawHtml}`);
  if (FIX) line(`  fixed           : ${fixed}`);
  line(failures === 0
    ? "\n\x1b[1m\x1b[32mALL DOCUMENTS IN SYNC\x1b[0m\n"
    : `\n\x1b[1m\x1b[31m${failures} PROBLEM(S)\x1b[0m\n`);

  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => { console.error(err); process.exit(1); });
