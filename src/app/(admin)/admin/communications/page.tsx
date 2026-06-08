import type { Metadata } from "next";
import { CommunicationsPageClient } from "./communications-client";

export const metadata: Metadata = { title: "Communications | Admin" };

export default function CommunicationsPage() {
  return <CommunicationsPageClient />;
}
