import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { transporter, SENDERS, SITE_NAME, SITE_URL } from "@/lib/mail";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;
  const supabase = createAdminClient();

  const { data: client, error } = await supabase
    .from("clients")
    .select("id, name, email, intake_token")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error || !client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }
  if (!client.email) {
    return NextResponse.json({ error: "Client has no email address" }, { status: 400 });
  }
  if (!client.intake_token) {
    return NextResponse.json({ error: "Client has no intake token" }, { status: 400 });
  }

  const firstName = client.name.split(" ")[0];
  const intakeUrl = `${SITE_URL}/intake/${client.intake_token}`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Tell us about your project</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Header -->
          <tr>
            <td style="background:#152238;border-radius:12px 12px 0 0;padding:24px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background:#f9a825;border-radius:4px;width:32px;height:32px;text-align:center;vertical-align:middle;">
                          <span style="color:#152238;font-weight:800;font-size:14px;">B</span>
                        </td>
                        <td style="padding-left:10px;">
                          <span style="color:#ffffff;font-weight:700;font-size:15px;">${SITE_NAME}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:36px 32px;">
              <p style="margin:0 0 8px 0;font-size:22px;font-weight:700;color:#152238;line-height:1.3;">
                Hi ${firstName}, welcome to ${SITE_NAME}! 👋
              </p>
              <p style="margin:0 0 20px 0;font-size:15px;color:#475569;line-height:1.6;">
                We're excited to work with you. Before we dive in, we'd love to get a better understanding of what you have in mind — your vision, goals, and what you're hoping to achieve.
              </p>
              <p style="margin:0 0 28px 0;font-size:15px;color:#475569;line-height:1.6;">
                We've put together a short requirements form that walks you through a few simple questions. There are no right or wrong answers — just share your thoughts in your own words and we'll take it from there.
              </p>

              <!-- CTA button -->
              <table cellpadding="0" cellspacing="0" style="margin:0 0 28px 0;">
                <tr>
                  <td style="background:#f9a825;border-radius:10px;text-align:center;">
                    <a href="${intakeUrl}" target="_blank"
                      style="display:inline-block;padding:14px 32px;color:#152238;font-weight:700;font-size:15px;text-decoration:none;">
                      Share My Requirements →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 6px 0;font-size:13px;color:#94a3b8;">Or copy and open this link in your browser:</p>
              <p style="margin:0 0 28px 0;font-size:13px;color:#152238;word-break:break-all;">
                <a href="${intakeUrl}" style="color:#152238;">${intakeUrl}</a>
              </p>

              <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 24px 0;" />

              <p style="margin:0 0 4px 0;font-size:14px;color:#334155;font-weight:600;">What happens next?</p>
              <p style="margin:0 0 20px 0;font-size:14px;color:#64748b;line-height:1.6;">
                Once you've submitted the form, we'll review your requirements and reach out to schedule a discovery call so we can go through everything together and get things moving.
              </p>

              <p style="margin:0;font-size:14px;color:#475569;line-height:1.6;">
                Talk soon,<br />
                <strong style="color:#152238;">The Brightex Team</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;border-radius:0 0 12px 12px;padding:20px 32px;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
                ${SITE_NAME} &middot;
                <a href="${SITE_URL}" style="color:#94a3b8;">${SITE_URL.replace(/^https?:\/\//, "")}</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  const text = `Hi ${firstName},

Welcome to ${SITE_NAME}!

We'd love to understand your project needs before we start. Please fill in this short requirements form — it only takes a few minutes:

${intakeUrl}

Once you've submitted it, we'll review your requirements and reach out to schedule a call.

Talk soon,
The Brightex Team
`;

  try {
    await transporter.sendMail({
      from: SENDERS.info,
      to: client.email,
      subject: `${firstName}, tell us about your project 📋`,
      html,
      text,
    });
  } catch (err) {
    console.error("[send-intake]", err);
    return NextResponse.json({ error: "Email delivery failed" }, { status: 500 });
  }

  await Promise.all([
    supabase.from("communications").insert({
      client_id: client.id,
      type: "email",
      subject: `${firstName}, tell us about your project 📋`,
      body: `Intake requirements link sent to ${client.email}`,
      direction: "out",
      status: "sent",
    }),
    supabase.from("clients").update({ intake_sent_at: new Date().toISOString() }).eq("id", client.id),
  ]);

  return NextResponse.json({ success: true });
}
