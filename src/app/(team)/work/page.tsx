import type { Metadata } from "next";
import { ClipboardList } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "My Tasks | Brightex" };

export default function WorkPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">My Tasks</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tasks assigned to you across active projects.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList size={16} />
            Assigned Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <ClipboardList size={40} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">No tasks assigned yet.</p>
            <p className="text-xs mt-1">Check back when a project manager assigns work to you.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
