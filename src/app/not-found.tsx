import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-brand-navy flex items-center justify-center px-4">
      {/* Decorative circles */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full border border-white/5 pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full border border-brand-gold/8 pointer-events-none" />

      <div className="relative text-center max-w-lg">
        <div className="font-display text-[120px] sm:text-[160px] font-bold text-white/5 leading-none select-none">
          404
        </div>
        <div className="-mt-8">
          <span className="text-brand-gold text-xs font-semibold tracking-widest uppercase block mb-4">
            Page Not Found
          </span>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">
            This page doesn't exist.
          </h1>
          <p className="text-white/50 text-base leading-relaxed mb-8">
            The page you're looking for may have been moved, deleted, or never existed. Let's get you back on track.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-sm bg-brand-gold text-brand-navy font-semibold text-sm hover:bg-brand-gold-hover transition-colors"
            >
              <ArrowLeft size={14} />
              Back to Home
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-sm border border-white/20 text-white font-semibold text-sm hover:border-white/40 transition-colors"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
