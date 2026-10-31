import type { Metadata } from "next";
import { ClientsPageClient } from "./clients-client";

export const metadata: Metadata = { title: "Clients" };

export default function ClientsPage() {
  return <ClientsPageClient />;
}
