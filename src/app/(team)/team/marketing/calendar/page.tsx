import type { Metadata } from "next";
import { TeamCalendarView } from "@/components/team/team-calendar-view";

export const metadata: Metadata = { title: "Post Schedule | Brightex Marketing" };

export default function MarketingCalendarPage() {
  return (
    <TeamCalendarView
      title="Post Schedule"
      subtitle="Scheduled social media posts for the month."
    />
  );
}
