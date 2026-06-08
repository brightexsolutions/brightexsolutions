import type { Metadata } from "next";
import { PaymentsPageClient } from "./payments-client";

export const metadata: Metadata = { title: "Payments | Admin" };

export default function PaymentsPage() {
  return <PaymentsPageClient />;
}
