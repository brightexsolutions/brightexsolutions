import { PublicNav } from "@/components/public/nav";
import { PublicFooter } from "@/components/public/footer";
import { BrixoWidget } from "@/components/public/brixo-widget";
import { AnnouncementBanner } from "@/components/public/announcement-banner";

async function getActiveAnnouncement() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }
  try {
    const { createAdminClient } = await import("@/lib/supabase/server");
    const supabase = createAdminClient();
    const now = new Date().toISOString();
    const { data } = await supabase
      .from("announcements")
      .select("id, title, body, cta_label, cta_url")
      .eq("active", true)
      .contains("display_location", ["banner"])
      .or(`starts_at.is.null,starts_at.lte.${now}`)
      .or(`ends_at.is.null,ends_at.gte.${now}`)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    return data ?? null;
  } catch {
    return null;
  }
}

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const announcement = await getActiveAnnouncement();

  return (
    <>
      <AnnouncementBanner announcement={announcement} />
      <PublicNav />
      <main className="flex-1">{children}</main>
      <PublicFooter />
      <BrixoWidget />
    </>
  );
}
