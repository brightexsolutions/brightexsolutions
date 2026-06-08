import type { MDXComponents } from "mdx/types";

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: ({ children }) => (
      <h1 className="font-display text-4xl font-bold text-[--color-brand-navy] dark:text-white mt-10 mb-4 leading-tight">
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="font-display text-2xl font-bold text-[--color-brand-navy] dark:text-white mt-8 mb-3">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="font-display text-xl font-semibold text-[--color-brand-navy] dark:text-white mt-6 mb-2">
        {children}
      </h3>
    ),
    p: ({ children }) => (
      <p className="text-[--color-brand-text] dark:text-white/80 leading-relaxed mb-4">
        {children}
      </p>
    ),
    a: ({ href, children }) => (
      <a
        href={href}
        className="text-[--color-brand-gold] hover:underline"
        target={href?.startsWith("http") ? "_blank" : undefined}
        rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
      >
        {children}
      </a>
    ),
    ul: ({ children }) => (
      <ul className="list-disc list-inside space-y-2 mb-4 text-[--color-brand-text] dark:text-white/80">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="list-decimal list-inside space-y-2 mb-4 text-[--color-brand-text] dark:text-white/80">
        {children}
      </ol>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-[--color-brand-gold] pl-4 italic text-[--color-brand-muted] my-6">
        {children}
      </blockquote>
    ),
    code: ({ children }) => (
      <code className="bg-[--color-brand-bg] dark:bg-white/10 text-[--color-brand-navy] dark:text-white px-1.5 py-0.5 rounded text-sm font-mono">
        {children}
      </code>
    ),
    ...components,
  };
}
