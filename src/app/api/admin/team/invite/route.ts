import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { transporter } from "@/lib/mail";
import { rateLimit } from "@/lib/rate-limit";
import { SITE_NAME, SITE_URL, BUSINESS_EMAIL } from "@/lib/constants";
import { logAction } from "@/lib/audit";
import {
  emailTemplate,
  emailAlert,
  emailParagraph,
  emailButton,
  emailDivider,
  emailSignoff,
} from "@/lib/email-templates";

const roleLabels: Record<string, string> = {
  subcontractor: "Subcontractor",
  marketing: "Marketing",
  finance: "Finance",
  support: "Support",
};

const InviteSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  email: z.string().email().trim(),
  role: z.enum(["subcontractor", "marketing", "finance", "support"]),
  note: z.string().max(500).trim().optional(),
});

// GET — list all pending invitations (no matching team_members record yet)
export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ data: [] });
  }

  const supabase = createAdminClient();

  const [{ data: invites }, { data: members }] = await Promise.all([
    supabase.from("team_invites").select("id, email, name, role, created_at").order("created_at", { ascending: false }),
    supabase.from("team_members").select("email").is("deleted_at", null),
  ]);

  const memberEmails = new Set((members ?? []).map((m: { email: string }) => m.email));
  const pending = (invites ?? []).filter((i: { email: string }) => !memberEmails.has(i.email));

  return NextResponse.json({ data: pending });
}

// POST — send a new or resend invite
export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = InviteSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { name, email, role, note } = result.data;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Supabase not configured." }, { status: 503 });
  }

  try {
    const supabase = createAdminClient();
    // Use the request origin so invite links work on localhost in dev
    // and automatically switch to the production URL in production.
    const origin = request.headers.get("origin") ?? SITE_URL;
    const redirectTo = `${origin}/join?role=${role}`;
    const roleLabel = roleLabels[role] ?? role;

    let inviteLink: string | null = null;
    let isResend = false;
    let invitedUserId: string | null = null;

    const { data: inviteData, error: inviteError } = await supabase.auth.admin.generateLink({
      type: "invite",
      email,
      options: {
        data: { name, role, invited_by: user.id },
        redirectTo,
      },
    });

    if (inviteError) {
      const isAlreadyRegistered =
        inviteError.message.toLowerCase().includes("already") ||
        inviteError.message.toLowerCase().includes("registered") ||
        inviteError.message.toLowerCase().includes("exists");

      if (!isAlreadyRegistered) {
        console.error("[team/invite] generateLink error:", inviteError);
        return NextResponse.json({ error: inviteError.message }, { status: 500 });
      }

      // User exists — send a password recovery link so they can complete setup
      const { data: recoveryData, error: recoveryError } = await supabase.auth.admin.generateLink({
        type: "recovery",
        email,
        options: { redirectTo },
      });

      if (recoveryError) {
        console.error("[team/invite] generateLink recovery error:", recoveryError);
        return NextResponse.json({ error: "Failed to generate invite link." }, { status: 500 });
      }

      inviteLink = recoveryData.properties?.action_link ?? null;
      isResend = true;
    } else {
      inviteLink = inviteData.properties?.action_link ?? null;
      invitedUserId = inviteData.user?.id ?? null;
    }

    if (!inviteLink) {
      return NextResponse.json({ error: "Could not generate invite link." }, { status: 500 });
    }

    const subject = isResend
      ? `Complete your ${SITE_NAME} account setup`
      : `You're invited to join ${SITE_NAME} — ${roleLabel} Portal`;

    const html = emailTemplate({
      title: isResend ? "Complete Your Account Setup" : `You're Invited to ${SITE_NAME}`,
      subtitle: `${roleLabel} Portal`,
      preheader: `You've been invited to join the ${SITE_NAME} ${roleLabel} portal`,
      body:
        emailAlert(
          isResend
            ? `Your invite has been resent. Use the button below to set your password and access the ${roleLabel} portal.`
            : `Hi <strong>${name}</strong>, you've been invited to join the <strong>${SITE_NAME} ${roleLabel} portal</strong>.`,
          "info"
        ) +
        emailParagraph(`Click the button below to set your password and get started. This link expires in <strong>24 hours</strong>.`) +
        (note ? emailParagraph(`<em>Note from admin: ${note}</em>`) : "") +
        emailButton("Accept Invitation & Set Password", inviteLink, "primary") +
        emailDivider() +
        emailParagraph(
          `If you weren't expecting this invitation, you can safely ignore this email. For questions, contact <a href="mailto:${BUSINESS_EMAIL}" style="color:#152238">${BUSINESS_EMAIL}</a>`
        ) +
        emailSignoff(),
    });

    // Plain text version improves deliverability
    const text = [
      `You've been invited to join the ${SITE_NAME} ${roleLabel} portal.`,
      "",
      isResend
        ? "Your invite has been resent. Use the link below to set your password:"
        : `Hi ${name}, click the link below to set your password and get started:`,
      "",
      inviteLink,
      "",
      "This link expires in 24 hours.",
      note ? `Note from admin: ${note}` : "",
      "",
      `If you weren't expecting this invitation, you can safely ignore this email.`,
      `Questions? Contact us at ${BUSINESS_EMAIL}`,
      "",
      `— The ${SITE_NAME} Team`,
    ].filter((l) => l !== undefined).join("\n");

    await transporter.sendMail({
      from: `${SITE_NAME} <${process.env.SMTP_USER}>`,
      replyTo: BUSINESS_EMAIL,
      to: email,
      subject,
      html,
      text,
    });

    await supabase.from("team_invites").upsert(
      { email, name, role, invited_by: user.id },
      { onConflict: "email" }
    );

    await logAction({
      actor_id: user.id,
      actor_name: user.email ?? user.id,
      action: isResend ? "resent_invite" : "invited",
      entity_type: "team",
      entity_label: `${name} <${email}>`,
      notes: `Role: ${roleLabel}${note ? ` · "${note}"` : ""}`,
    });

    return NextResponse.json({ success: true, resent: isResend });
  } catch (err) {
    console.error("[team/invite] Error:", err);
    return NextResponse.json({ error: "Failed to send invite." }, { status: 500 });
  }
}

// DELETE — revoke a pending invitation
export async function DELETE(request: NextRequest) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const supabase = createAdminClient();
  const { data: invite } = await supabase.from("team_invites").select("name, email, role").eq("id", id).single();
  const { error } = await supabase.from("team_invites").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAction({
    actor_id: user.id,
    actor_name: user.email ?? user.id,
    action: "revoked_invite",
    entity_type: "team",
    entity_label: invite ? `${invite.name} <${invite.email}>` : id,
    notes: invite ? `Role: ${roleLabels[invite.role] ?? invite.role}` : undefined,
  });

  return NextResponse.json({ success: true });
}
