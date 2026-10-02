"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, Sparkles } from "lucide-react";

interface ToolCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
  badge?: string;
  iconClassName?: string;
  iconBackgroundClassName?: string;
  disabled?: boolean;
}

export default function ToolCard({
  icon: Icon,
  title,
  description,
  href,
  badge,
  iconClassName = "text-cyan-300",
  iconBackgroundClassName = "bg-cyan-400/10",
  disabled = false,
}: ToolCardProps) {
  const content = (
    <div
      className={`group relative h-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025] p-5 transition-all duration-200 ${
        disabled
          ? "cursor-not-allowed opacity-60"
          : "hover:-translate-y-1 hover:border-cyan-400/20 hover:bg-white/[0.04]"
      }`}
    >
      {/* Top glow */}
      <div
        className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent transition-opacity duration-200 ${
          disabled ? "opacity-0" : "opacity-0 group-hover:opacity-100"
        }`}
      />

      {/* Background glow */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-cyan-400/5 blur-2xl transition-all duration-300 group-hover:bg-cyan-400/10" />

      <div className="relative">
        {/* Icon + Badge */}
        <div className="flex items-start justify-between gap-4">
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconBackgroundClassName}`}
          >
            <Icon size={21} className={iconClassName} strokeWidth={2} />
          </div>

          {badge && (
            <span className="inline-flex items-center gap-1 rounded-full border border-cyan-400/15 bg-cyan-400/5 px-2.5 py-1 text-[10px] font-medium text-cyan-300">
              <Sparkles size={11} />
              {badge}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="mt-5">
          <h3 className="text-sm font-semibold text-slate-100 transition-colors group-hover:text-white">
            {title}
          </h3>

          <p className="mt-2 min-h-[42px] text-xs leading-5 text-slate-500">
            {description}
          </p>
        </div>

        {/* Action */}
        <div className="mt-5 flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500 transition-colors group-hover:text-cyan-300">
            {disabled ? "Coming soon" : "Open tool"}
          </span>

          {!disabled && (
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/5 bg-white/[0.03] text-slate-500 transition-all duration-200 group-hover:border-cyan-400/20 group-hover:bg-cyan-400/10 group-hover:text-cyan-300">
              <ArrowRight
                size={14}
                className="transition-transform duration-200 group-hover:translate-x-0.5"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (disabled) {
    return <div className="h-full">{content}</div>;
  }

  return (
    <Link
      href={href}
      className="block h-full rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
      aria-label={`Open ${title}`}
    >
      {content}
    </Link>
  );
}