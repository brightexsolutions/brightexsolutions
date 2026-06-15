import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "../globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Project Updates | Brightex Solutions",
  robots: { index: false, follow: false },
};

export default function UpdatesLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${plusJakartaSans.variable}`}>
      <body className="font-body bg-[#f8fafc] text-slate-800 min-h-screen">
        {children}
      </body>
    </html>
  );
}
