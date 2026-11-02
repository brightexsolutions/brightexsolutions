import type { Metadata } from "next";
import { AnnouncementsPageClient } from "./announcements-client";

export const metadata: Metadata = { title: "Announcements" };

export default function AnnouncementsPage() {
  return <AnnouncementsPageClient />;
}
