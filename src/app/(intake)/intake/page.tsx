"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { IntakeWizard } from "./[token]/wizard";

export const dynamic = "force-dynamic";

function GenericIntakeContent() {
  const searchParams = useSearchParams();
  const service = searchParams.get("service") ?? "";
  return <IntakeWizard isGeneric defaultServiceType={service} />;
}

export default function GenericIntakePage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: "#f1f5f9" }} />}>
      <GenericIntakeContent />
    </Suspense>
  );
}
