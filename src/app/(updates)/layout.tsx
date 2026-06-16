import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Project Updates | Brightex Solutions",
  robots: { index: false, follow: false },
};

export default function UpdatesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
