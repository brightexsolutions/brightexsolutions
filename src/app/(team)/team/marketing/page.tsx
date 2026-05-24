import type { Metadata } from "next";
import { LayoutGrid } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Content Calendar | Brightex Marketing" };

export default function MarketingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Content Calendar</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Plan, draft, and track social media posts for approval.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <LayoutGrid size={16} />
            Scheduled Posts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <LayoutGrid size={40} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">No posts scheduled yet.</p>
            <p className="text-xs mt-1">Create a draft post to get started.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
