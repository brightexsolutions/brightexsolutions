import type { Metadata } from "next";
import { TeamCalendarView } from "@/components/team/team-calendar-view";

export const metadata: Metadata = { title: "Renewals Calendar | Brightex Finance" };

export default function FinanceCalendarPage() {
  return (
    <TeamCalendarView
      title="Renewals Calendar"
      subtitle="Upcoming subscription renewals and billing dates."
    />
  );
}
