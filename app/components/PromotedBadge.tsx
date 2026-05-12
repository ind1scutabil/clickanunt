"use client";

import { cn } from "@/lib/design/utils";

interface PromotedBadgeProps {
  type?: string;
  size?: "xs" | "sm" | "md" | "lg";
  /** Dark imagery / marketplace cards */
  tone?: "default" | "glassDark";
  className?: string;
}

export default function PromotedBadge({
  size = "md",
  tone = "default",
  className = "",
}: PromotedBadgeProps) {
  const sizeClasses = {
    xs: "gap-0.5 rounded-full px-2 py-0.5 text-[6.5px] font-semibold uppercase tracking-[0.14em]",
    sm: "gap-1 px-2 py-0.5 text-[11px]",
    md: "gap-1.5 px-2.5 py-1 text-xs",
    lg: "gap-2 px-3 py-1.5 text-sm",
  };

  const iconSize = {
    xs: "w-2.5 h-2.5",
    sm: "w-3 h-3",
    md: "w-3.5 h-3.5",
    lg: "w-4 h-4",
  };

  const toneClasses =
    tone === "glassDark"
      ? "border border-white/[0.09] bg-white/[0.07] text-zinc-100/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-md"
      : "rounded-md border border-primary-500/25 bg-primary-500/10 text-neutral-800";

  return (
    <div
      className={cn(
        "inline-flex items-center font-medium",
        toneClasses,
        tone === "default" ? "rounded-md" : null,
        sizeClasses[size],
        className
      )}
    >
      <svg className={iconSize[size]} fill="currentColor" viewBox="0 0 20 20" aria-hidden>
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
      <span>Promovat</span>
    </div>
  );
}
