import type { Metadata } from "next";
import { SubscriptionsPageClient } from "./subscriptions-client";

export const metadata: Metadata = { title: "Subscriptions | Admin" };

export default function SubscriptionsPage() {
  return <SubscriptionsPageClient />;
}
