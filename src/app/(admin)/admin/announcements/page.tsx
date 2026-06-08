import type { Metadata } from "next";
import { AnnouncementsPageClient } from "./announcements-client";

export const metadata: Metadata = { title: "Announcements | Admin" };

export default function AnnouncementsPage() {
  return <AnnouncementsPageClient />;
}
