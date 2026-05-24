import type { Metadata } from "next";
import { CreditCard, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/admin/stat-card";

export const metadata: Metadata = { title: "Payments | Admin" };

const methods = ["M-Pesa", "Bank Transfer", "PayPal", "Cash"];

export default function PaymentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Payments</h1>
          <p className="text-sm text-muted-foreground mt-1">Record incoming payments and send receipts.</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-sm bg-brand-gold text-brand-navy font-semibold text-sm hover:bg-brand-gold-hover transition-colors">
          <Plus size={15} />
          Record Payment
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Total Received" value="KES —" icon={CreditCard} iconColor="text-emerald-400" iconBg="bg-emerald-400/10" />
        <StatCard title="This Month" value="KES —" icon={CreditCard} iconColor="text-brand-gold" iconBg="bg-brand-gold/10" />
        <StatCard title="Transactions" value="—" icon={CreditCard} />
        <StatCard title="Pending Receipts" value="—" icon={CreditCard} iconColor="text-amber-400" iconBg="bg-amber-400/10" />
      </div>

      {/* Methods info */}
      <div className="flex gap-2 flex-wrap">
        {methods.map((m) => (
          <span key={m} className="px-2.5 py-1 rounded-sm text-xs font-medium border border-border bg-muted text-muted-foreground">
            {m}
          </span>
        ))}
      </div>

      {/* Payment list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard size={16} />
            Payment Records
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <CreditCard size={40} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">No payments recorded yet.</p>
            <p className="text-xs mt-1">Record a payment against an invoice to start tracking.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
