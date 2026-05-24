import type { Metadata } from "next";
import { DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Finance Overview | Brightex" };

export default function FinancePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Finance Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track income, expenses, and generate financial reports.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {["Total Income", "Total Expenses", "Net Profit"].map((label) => (
          <Card key={label}>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">{label}</p>
              <p className="text-2xl font-display font-bold text-foreground">KES —</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign size={16} />
            Recent Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <DollarSign size={40} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">No transactions recorded yet.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
