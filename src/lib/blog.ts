import fs from "fs";
import path from "path";

const BLOG_DIR = path.join(process.cwd(), "src/content/blog");

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  category: string;
  readingTime: number;
  author: string;
}

function parseFrontmatter(content: string): Record<string, string | number> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const frontmatter: Record<string, string | number> = {};
  for (const line of match[1].split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const raw = line.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, "");
    frontmatter[key] = isNaN(Number(raw)) ? raw : Number(raw);
  }
  return frontmatter;
}

export function getAllPosts(): BlogPost[] {
  if (!fs.existsSync(BLOG_DIR)) return [];
  return fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith(".mdx"))
    .map((file) => {
      const content = fs.readFileSync(path.join(BLOG_DIR, file), "utf-8");
      const fm = parseFrontmatter(content);
      return {
        slug: (fm.slug as string) || file.replace(/\.mdx$/, ""),
        title: (fm.title as string) || "",
        description: (fm.description as string) || "",
        date: (fm.date as string) || "",
        category: (fm.category as string) || "General",
        readingTime: (fm.readingTime as number) || 5,
        author: (fm.author as string) || "Brightex Solutions",
      };
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  return getAllPosts().find((p) => p.slug === slug);
}
