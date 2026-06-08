import type { Metadata } from "next";
import { SalesPageClient } from "./sales-client";

export const metadata: Metadata = { title: "Sales Pipeline | Admin" };

export default function SalesPipelinePage() {
  return <SalesPageClient />;
}
