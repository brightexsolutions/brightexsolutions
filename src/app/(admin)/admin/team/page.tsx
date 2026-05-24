import type { Metadata } from "next";
import { Users, UserPlus, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TeamInviteModal } from "@/components/admin/team-invite-modal";

export const metadata: Metadata = { title: "Team | Admin" };

export default function AdminTeamPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Team</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage subcontractors, marketing, and finance team members.
          </p>
        </div>
        <TeamInviteModal />
      </div>

      <Card className="border-amber-200 bg-amber-50 dark:border-amber-800/30 dark:bg-amber-950/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-700 dark:text-amber-300 mb-1">Supabase required</p>
              <p className="text-sm text-muted-foreground">
                Connect Supabase to enable team invites, portal access, and role management. Team members will receive login invites via email.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users size={16} />
            Team Members
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Users size={40} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">No team members yet.</p>
            <p className="text-xs mt-1">Invite someone using the button above.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
