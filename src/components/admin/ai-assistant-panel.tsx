"use client";

import { useState } from "react";
import { SuggestedActionsCard } from "@/components/admin/suggested-actions-card";
import { PendingActionsCard } from "@/components/admin/pending-actions-card";

type DraftKind = "invoice_reminder" | "lead_followup" | "client_checkin";
interface DraftableAction {
  draft?: { kind: DraftKind; clientId: string; invoiceId?: string; saleId?: string };
}

/** Combines the read-only "what needs attention" surface with the
 * human-in-the-loop approval queue — one AI drafts, you approve, nothing
 * sends on its own. */
export function AiAssistantPanel() {
  const [refreshKey, setRefreshKey] = useState(0);

  async function handleDraft(action: DraftableAction) {
    if (!action.draft) return;
    await fetch("/api/admin/pending-actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: action.draft.kind,
        clientId: action.draft.clientId,
        invoiceId: action.draft.invoiceId,
        saleId: action.draft.saleId,
      }),
    });
    setRefreshKey((k) => k + 1);
  }

  return (
    <div className="space-y-5">
      <PendingActionsCard refreshKey={refreshKey} />
      <SuggestedActionsCard onDraft={handleDraft} />
    </div>
  );
}
