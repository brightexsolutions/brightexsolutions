import { PublicNav } from "@/components/public/nav";
import { PublicFooter } from "@/components/public/footer";
import { BrixoWidget } from "@/components/public/brixo-widget";
import { AnnouncementBanner } from "@/components/public/announcement-banner";
import { AnnouncementDialog } from "@/components/public/announcement-dialog";
import { RevealObserver } from "@/components/public/reveal-observer";
import { PopupManager, type SitePopup } from "@/components/public/popup-manager";

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
      .select("id, title, body, cta_label, cta_url, display_location")
      .eq("active", true)
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

/** Active announcements that have pop-up settings switched on. */
async function getPopups(): Promise<SitePopup[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return [];
  try {
    const { createAdminClient } = await import("@/lib/supabase/server");
    const { loadPopups } = await import("@/lib/popup-store");
    const supabase = createAdminClient();
    const configs = await loadPopups(supabase);
    const ids = [...configs].filter(([, c]) => c.enabled).map(([id]) => id);
    if (ids.length === 0) return [];
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("announcements")
      .select("id, title, body, cta_label, cta_url")
      .in("id", ids)
      .eq("active", true)
      .is("deleted_at", null)
      .or(`starts_at.is.null,starts_at.lte.${now}`)
      .or(`ends_at.is.null,ends_at.gte.${now}`)
      .order("created_at", { ascending: false })
      .limit(10);
    if (error || !data) return [];
    return data.map((a) => ({ ...a, popup: configs.get(a.id)! }));
  } catch {
    return [];
  }
}

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [announcement, popups] = await Promise.all([getActiveAnnouncement(), getPopups()]);
  // An announcement with its own pop-up settings is shown by PopupManager, not the legacy dialog
  const legacyDialog = announcement && !popups.some((p) => p.id === announcement.id) ? announcement : null;

  return (
    <div className="force-light min-h-screen bg-white text-[#1e2840] flex flex-col">
      <AnnouncementBanner announcement={announcement} />
      <AnnouncementDialog announcement={legacyDialog} />
      <PublicNav />
      <main className="flex-1">{children}</main>
      <PublicFooter />
      <BrixoWidget />
      <RevealObserver />
      <PopupManager popups={popups} />
    </div>
  );
}
