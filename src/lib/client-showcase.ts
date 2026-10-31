/**
 * Client and partner brand assets for the public site.
 *
 * Logos come from each client's own website; screenshots under /public/work
 * are captures of the live sites we built. Portfolio rows in the database are
 * matched to these by name so the admin can keep editing copy and links
 * without uploading images.
 */

export interface ShowcaseClient {
  key: string;
  name: string;
  sector: string;
  url: string;
  logo: string;
  /** Logo is a square mark rather than a wordmark: render it beside the name. */
  mark?: boolean;
  screenshot?: string;
  partner?: boolean;
}

export const SHOWCASE_CLIENTS: ShowcaseClient[] = [
  {
    key: "dreamville",
    name: "Dreamville Estate",
    sector: "Real estate and hospitality",
    url: "https://www.dreamvilleestate.co.ke/",
    logo: "/clients/dreamville.svg",
    screenshot: "/work/dreamville.jpg",
    partner: true,
  },
  {
    key: "beco",
    name: "Beco Interiors",
    sector: "Interior finishing materials",
    url: "https://www.beco.co.ke/",
    logo: "/clients/beco.png",
    mark: true,
    screenshot: "/work/beco.jpg",
    partner: true,
  },
  {
    key: "cbcapp",
    name: "CBC App by Verb Education",
    sector: "EdTech",
    url: "https://cbcapp.co.ke/",
    logo: "/clients/cbcapp.png",
    screenshot: "/work/cbcapp.jpg",
  },
  {
    key: "talkways",
    name: "Talkways Languages",
    sector: "Language school",
    url: "https://talkwayslanguages.com/",
    logo: "/clients/talkways.png",
    mark: true,
    screenshot: "/work/talkways.jpg",
  },
  {
    key: "afn",
    name: "Africa Feature Network",
    sector: "Media",
    url: "https://africafeaturenetwork.com/",
    logo: "/clients/afn.png",
    mark: true,
    screenshot: "/work/afn.jpg",
  },
  {
    key: "greenhouse",
    name: "The Green House",
    sector: "Worship community",
    url: "https://www.greenhousews.co.ke/",
    logo: "/clients/greenhouse.png",
    mark: true,
    screenshot: "/work/greenhouse.jpg",
  },
];

const ALIASES: Record<string, string> = {
  dreamville: "dreamville",
  beco: "beco",
  cbc: "cbcapp",
  verb: "cbcapp",
  talkways: "talkways",
  "africa feature": "afn",
  greenhouse: "greenhouse",
  "green house": "greenhouse",
};

/** Finds the showcase entry for a portfolio row or client name, if we have one. */
export function findShowcaseClient(name: string): ShowcaseClient | undefined {
  const n = name.toLowerCase();
  const key = Object.entries(ALIASES).find(([alias]) => n.includes(alias))?.[1];
  return key ? SHOWCASE_CLIENTS.find((c) => c.key === key) : undefined;
}

/** Stock photos are placeholders: prefer a real screenshot of the shipped site. */
export function portfolioImage(name: string, imageUrl?: string | null): string | null {
  const shot = findShowcaseClient(name)?.screenshot;
  if (shot && (!imageUrl || imageUrl.includes("images.unsplash.com"))) return shot;
  return imageUrl ?? null;
}
