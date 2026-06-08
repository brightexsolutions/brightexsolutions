import type { Metadata } from "next";
import { PortfolioPageClient } from "./portfolio-client";

export const metadata: Metadata = { title: "Portfolio | Admin" };

export default function PortfolioPage() {
  return <PortfolioPageClient />;
}
