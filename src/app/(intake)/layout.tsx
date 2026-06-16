import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Project Intake | Brightex Solutions",
  description: "Share your project requirements with the Brightex team.",
  robots: { index: false, follow: false },
};

export default function IntakeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
