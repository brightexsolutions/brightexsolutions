import type { Metadata } from "next";
import { DocumentsPageClient } from "./documents-client";

export const metadata: Metadata = { title: "Documents" };

export default function DocumentsPage() {
  return <DocumentsPageClient />;
}
