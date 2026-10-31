import type { Metadata } from "next";
import { PortfolioPageClient } from "./portfolio-client";

export const metadata: Metadata = { title: "Portfolio" };

export default function PortfolioPage() {
  return <PortfolioPageClient />;
}
