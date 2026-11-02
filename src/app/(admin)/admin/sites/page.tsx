import type { Metadata } from "next";
import { SiteMonitoringPageClient } from "./sites-client";

export const metadata: Metadata = { title: "Site Monitoring" };

export default function SiteMonitoringPage() {
  return <SiteMonitoringPageClient />;
}
