import { createAdminClient } from "@/lib/supabase/server";

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  tagline?: string | null;
  description?: string | null;
  category?: string | null;
  features?: unknown;
  screenshots?: string[] | null;
  demo_url?: string | null;
  trial_days?: number | null;
  pricing_tiers?: unknown;
  target_industries?: string[] | null;
  status?: string | null;
  created_at?: string | null;
};

export type ProductFeature = {
  title: string;
  description: string;
  icon?: string;
};

export type ProductPricingTier = {
  name: string;
  price_monthly: number;
  price_yearly: number;
  currency: string;
  features: string[];
};

export type ProductRecord = {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  category: string;
  features: ProductFeature[];
  screenshots: string[];
  demoUrl: string;
  trialDays: number;
  pricingTiers: ProductPricingTier[];
  targetIndustries: string[];
  pricingFrom: string;
  status: string;
  createdAt: string | null;
};

function normalizeFeatures(value: unknown): ProductFeature[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => {
      if (typeof entry === "string") {
        return { title: entry, description: "" };
      }

      if (!entry || typeof entry !== "object") return null;

      const raw = entry as Record<string, unknown>;
      const title = typeof raw.title === "string" ? raw.title.trim() : "";
      const description = typeof raw.description === "string" ? raw.description.trim() : "";
      const icon = typeof raw.icon === "string" ? raw.icon.trim() : undefined;

      if (!title && !description) return null;

      return {
        title: title || description,
        description: title && description ? description : "",
        icon,
      };
    })
    .filter((entry): entry is ProductFeature => entry !== null);
}

function normalizePricingTiers(value: unknown): ProductPricingTier[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;

      const raw = entry as Record<string, unknown>;
      const name = typeof raw.name === "string" ? raw.name.trim() : "";
      const monthly = Number(raw.price_monthly ?? 0);
      const yearly = Number(raw.price_yearly ?? 0);
      const currency = typeof raw.currency === "string" && raw.currency.trim() ? raw.currency.trim() : "KES";
      const features = Array.isArray(raw.features)
        ? raw.features.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        : [];

      if (!name && !monthly && !yearly) return null;

      return {
        name: name || "Standard",
        price_monthly: Number.isFinite(monthly) ? monthly : 0,
        price_yearly: Number.isFinite(yearly) ? yearly : 0,
        currency,
        features,
      };
    })
    .filter((entry): entry is ProductPricingTier => entry !== null);
}

function getPricingFrom(pricingTiers: ProductPricingTier[]): string {
  const prices = pricingTiers
    .flatMap((tier) => [
      tier.price_monthly > 0 ? { amount: tier.price_monthly, suffix: "/month", currency: tier.currency } : null,
      tier.price_yearly > 0 ? { amount: tier.price_yearly, suffix: "/year", currency: tier.currency } : null,
    ])
    .filter((entry): entry is { amount: number; suffix: string; currency: string } => entry !== null);

  if (prices.length === 0) return "custom quote";

  const lowest = prices.reduce((best, current) => (current.amount < best.amount ? current : best));
  return `${lowest.currency} ${lowest.amount.toLocaleString()}${lowest.suffix}`;
}

export function normalizeProduct(product: ProductRow): ProductRecord {
  const features = normalizeFeatures(product.features);
  const pricingTiers = normalizePricingTiers(product.pricing_tiers);
  const tagline = (product.tagline ?? "").trim();
  const description = (product.description ?? "").trim();

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    tagline,
    description: description || tagline,
    category: (product.category ?? "other").trim() || "other",
    features,
    screenshots: Array.isArray(product.screenshots) ? product.screenshots.filter(Boolean) : [],
    demoUrl: (product.demo_url ?? "").trim(),
    trialDays: product.trial_days && product.trial_days > 0 ? product.trial_days : 7,
    pricingTiers,
    targetIndustries: Array.isArray(product.target_industries) ? product.target_industries.filter(Boolean) : [],
    pricingFrom: getPricingFrom(pricingTiers),
    status: (product.status ?? "draft").trim() || "draft",
    createdAt: product.created_at ?? null,
  };
}

async function fetchProducts(status?: "published" | "draft") {
  const configured = !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  if (!configured) return [];

  const supabase = createAdminClient();
  let query = supabase.from("products").select("*").order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[products] fetch failed:", error);
    return [];
  }

  return (data ?? []).map((row) => normalizeProduct(row as ProductRow));
}

export async function getPublishedProducts() {
  return fetchProducts("published");
}

export async function getProductBySlug(slug: string) {
  const configured = !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  if (!configured) return null;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (error) {
    if (error.code !== "PGRST116") {
      console.error("[products] slug lookup failed:", error);
    }
    return null;
  }

  return normalizeProduct(data as ProductRow);
}
