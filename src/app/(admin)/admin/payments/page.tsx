import type { Metadata } from "next";
import { PaymentsPageClient } from "./payments-client";

export const metadata: Metadata = { title: "Payments" };

export default function PaymentsPage() {
  return <PaymentsPageClient />;
}
