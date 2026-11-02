import type { Metadata } from "next";
import { CommunicationsPageClient } from "./communications-client";

export const metadata: Metadata = { title: "Communications" };

export default function CommunicationsPage() {
  return <CommunicationsPageClient />;
}
