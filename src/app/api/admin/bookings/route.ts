import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { transporter } from "@/lib/mail";
import { rateLimit } from "@/lib/rate-limit";

const ConfirmSchema = z.object({
  id: z.string().uuid(),
  meeting_link: z.string().url().optional().or(z.literal("")),
  action: z.enum(["confirm", "cancel"]),
});

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  let query = supabase
    .from("bookings")
    .select("*")
    .order("scheduled_at");

  if (status && status !== "all") query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, "admin");
  if (limited) return limited;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const result = ConfirmSchema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: "Invalid input", details: result.error.flatten() }, { status: 400 });

  const newStatus = result.data.action === "confirm" ? "confirmed" : "cancelled";
  const { data: booking, error } = await supabase
    .from("bookings")
    .update({ status: newStatus, meeting_link: result.data.meeting_link })
    .eq("id", result.data.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Send confirmation or cancellation email
  if (booking.booker_email) {
    const subject = result.data.action === "confirm"
      ? "Your booking is confirmed — Brightex Solutions"
      : "Your booking has been cancelled — Brightex Solutions";

    const html = result.data.action === "confirm"
      ? `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:#152238;padding:24px;text-align:center;">
            <h1 style="color:#f9a825;font-size:20px;margin:0;font-family:Georgia,serif;">Brightex Solutions</h1>
          </div>
          <div style="padding:24px;">
            <p>Hi <strong>${booking.booker_name}</strong>, your booking is confirmed!</p>
            <p><strong>Date:</strong> ${new Date(booking.scheduled_at).toLocaleString("en-KE", { dateStyle: "full", timeStyle: "short", timeZone: "Africa/Nairobi" })}</p>
            <p><strong>Purpose:</strong> ${booking.purpose.replace("_", " ")}</p>
            ${result.data.meeting_link ? `<p><strong>Meeting link:</strong> <a href="${result.data.meeting_link}">${result.data.meeting_link}</a></p>` : ""}
            <p>See you then! — Brightex Solutions</p>
          </div>
        </div>`
      : `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
          <p>Hi <strong>${booking.booker_name}</strong>, your booking on ${new Date(booking.scheduled_at).toLocaleDateString("en-KE")} has been cancelled.</p>
          <p>To rebook, visit <a href="${process.env.NEXT_PUBLIC_SITE_URL}/book">${process.env.NEXT_PUBLIC_SITE_URL}/book</a></p>
          <p>— Brightex Solutions</p>
        </div>`;

    await transporter.sendMail({
      from: `"Brightex Solutions" <${process.env.SMTP_USER}>`,
      to: booking.booker_email,
      subject,
      html,
    });
  }

  // Add to calendar on confirm
  if (result.data.action === "confirm") {
    await supabase.from("calendar_events").insert({
      title: `${booking.purpose.replace("_", " ")} — ${booking.booker_name}`,
      type: "booking",
      start_at: booking.scheduled_at,
      end_at: new Date(new Date(booking.scheduled_at).getTime() + (booking.duration_minutes as number) * 60000).toISOString(),
      entity_type: "booking",
      entity_id: booking.id as string,
    });
  }

  return NextResponse.json({ data: booking });
}
