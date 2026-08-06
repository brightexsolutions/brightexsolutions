/**
 * Works out whose signatures a document should show, right now.
 *
 * The rule that matters, and the reason this is not a one-liner:
 *
 *   UNSIGNED  our countersignature comes from SETTINGS, live. A draft written
 *             before a signature was uploaded should show it once it exists,
 *             and changing the signature should update every draft. Baking the
 *             image in at creation gave the opposite behaviour, and produced an
 *             agreement stuck showing a typed name after the real one was saved.
 *
 *   SIGNED    everything comes from document_signatures. What matters then is
 *             what was actually signed, not what our signature looks like
 *             today. A signed contract whose countersignature silently changed
 *             would be worse than useless as evidence.
 *
 * Shared by the public link and the admin view so the two cannot disagree about
 * what a client is looking at.
 */
import type { ExecutedParty } from "./index";

export interface SignatureRow {
  party: string;
  signer_name: string;
  signer_title?: string | null;
  entity?: string | null;
  /** drawn | upload | typed. Part of the evidence, so callers pass it through
   * even though the rendered block only needs the image. */
  method?: string | null;
  image_path?: string | null;
  signed_at: string;
}

export interface ResolveInput {
  documentId: string;
  /** Set once the client has signed. Switches the source to the stored record. */
  acceptedAt?: string | null;
  /** Rows from document_signatures for this document. */
  rows: SignatureRow[];
  /** Live countersignature settings, for the unsigned case. */
  settings: { name: string; title: string; hasImage: boolean };
  /** Shown as the client's empty space until they sign. */
  clientLabel: string;
  /** Whose document creation date to date our signature from, when there is no
   * signature row to read it off. */
  createdAt: string;
}

export interface ResolvedSignatures {
  parties: ExecutedParty[];
  awaiting: { role: string; label: string } | null;
}

export function resolveSignatures(input: ResolveInput): ResolvedSignatures {
  const brightexRow = input.rows.find((r) => r.party === "brightex");
  const clientRow = input.rows.find((r) => r.party === "client");
  const signed = !!input.acceptedAt && !!clientRow;

  const parties: ExecutedParty[] = [];

  // ── Our side ─────────────────────────────────────────────────────────────
  if (signed && brightexRow) {
    parties.push({
      role: "For Brightex Solutions",
      name: brightexRow.signer_name,
      title: brightexRow.signer_title,
      imageUrl: brightexRow.image_path ? `/api/public/documents/${input.documentId}/signature/brightex` : null,
      signedAt: brightexRow.signed_at,
    });
  } else {
    // Unsigned: read the current settings, so a signature saved after the
    // document was drafted still appears on it.
    parties.push({
      role: "For Brightex Solutions",
      name: brightexRow?.signer_name || input.settings.name,
      title: brightexRow?.signer_title || input.settings.title,
      imageUrl:
        input.settings.hasImage || brightexRow?.image_path
          ? `/api/public/documents/${input.documentId}/signature/brightex`
          : null,
      signedAt: brightexRow?.signed_at || input.createdAt,
    });
  }

  // ── Their side ───────────────────────────────────────────────────────────
  if (clientRow) {
    parties.push({
      role: "For the Client",
      name: clientRow.signer_name,
      title: clientRow.signer_title,
      entity: clientRow.entity,
      imageUrl: clientRow.image_path ? `/api/public/documents/${input.documentId}/signature/client` : null,
      signedAt: clientRow.signed_at,
    });
  }

  return {
    parties,
    // The empty box is the ask. Omitting it would let a one-sided contract read
    // as complete.
    awaiting: clientRow ? null : { role: "For the Client", label: input.clientLabel },
  };
}
