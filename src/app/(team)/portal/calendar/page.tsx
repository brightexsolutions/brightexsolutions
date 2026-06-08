import type { Metadata } from "next";
import { TeamCalendarView } from "@/components/team/team-calendar-view";

export const metadata: Metadata = { title: "My Schedule | Brightex" };

export default function WorkCalendarPage() {
  return (
    <TeamCalendarView
      title="My Schedule"
      subtitle="Task deadlines and bookings relevant to your work."
    />
  );
}
