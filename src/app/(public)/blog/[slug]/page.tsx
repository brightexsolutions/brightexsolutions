import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllPosts, getPostBySlug } from "@/lib/blog";
import { FadeIn } from "@/components/public/fade-in";
import { CtaSection } from "@/components/public/cta-section";
import { SectionErrorBoundary } from "@/components/section-error-boundary";
import { ArrowLeft, Clock, Tag } from "lucide-react";
import Link from "next/link";

export const revalidate = 3600;

export async function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.date,
      authors: [post.author],
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  // Dynamically import the MDX file
  let Content: React.ComponentType;
  try {
    const mod = await import(`@/content/blog/${slug}.mdx`);
    Content = mod.default;
  } catch {
    notFound();
  }

  const blogPostingSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    author: { "@type": "Organization", name: post.author },
    publisher: {
      "@type": "Organization",
      name: "Brightex Solutions",
      url: "https://www.brightexsolutions.com",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogPostingSchema) }}
      />

      {/* Hero */}
      <section className="pt-32 pb-12 bg-brand-navy">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-white/50 hover:text-white text-sm mb-8 transition-colors"
            >
              <ArrowLeft size={14} />
              Back to Blog
            </Link>
            <div className="flex items-center gap-3 mb-5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-gold/15 text-brand-gold text-xs font-semibold">
                <Tag size={10} />
                {post.category}
              </span>
              <span className="flex items-center gap-1 text-xs text-white/50">
                <Clock size={11} />
                {post.readingTime} min read
              </span>
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-white mb-4 leading-tight">
              {post.title}
            </h1>
            <div className="text-white/50 text-sm">
              {new Date(post.date).toLocaleDateString("en-KE", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}{" "}
              · {post.author}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Body */}
      <section className="py-16 bg-white dark:bg-brand-navy-dark">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <article className="prose-custom">
              <Content />
            </article>
          </FadeIn>
        </div>
      </section>

      <SectionErrorBoundary>
        <CtaSection />
      </SectionErrorBoundary>
    </>
  );
}
