"use client";

import Link from "next/link";
import { useState } from "react";
import {
  FileText,
  Menu,
  X,
  LayoutDashboard,
  Sparkles,
  Wrench,
} from "lucide-react";

const navigation = [
  {
    label: "Features",
    href: "/#features",
  },
  {
    label: "How it works",
    href: "/#workflow",
  },
  {
    label: "PDF Tools",
    href: "/#tools",
  },
];

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
        {/* Logo */}
        <Link
          href="/"
          onClick={closeMobileMenu}
          className="flex items-center gap-2.5"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-400/20">
            <FileText size={20} strokeWidth={2.5} />
          </div>

          <span className="text-xl font-bold tracking-tight">
            Docu<span className="text-cyan-400">Flow</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-8 md:flex">
          {navigation.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="text-sm text-slate-300 transition hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* Desktop Workspace Button */}
        <div className="hidden md:block">
          <Link
            href="/dashboard"
            className="group flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            Open Workspace

            <LayoutDashboard
              size={16}
              className="transition-transform group-hover:scale-105"
            />
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          type="button"
          aria-label={
            mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"
          }
          aria-expanded={mobileMenuOpen}
          onClick={() => setMobileMenuOpen((previous) => !previous)}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-300 transition hover:border-cyan-400/20 hover:text-white md:hidden"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="border-t border-white/10 bg-slate-950 px-6 py-5 md:hidden">
          <div className="mx-auto max-w-7xl space-y-2">
            {navigation.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={closeMobileMenu}
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-300 transition hover:bg-white/[0.04] hover:text-white"
              >
                {item.label === "Features" && <Sparkles size={17} />}
                {item.label === "How it works" && <LayoutDashboard size={17} />}
                {item.label === "PDF Tools" && <Wrench size={17} />}

                {item.label}
              </Link>
            ))}

            <div className="pt-2">
              <Link
                href="/dashboard"
                onClick={closeMobileMenu}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
              >
                <LayoutDashboard size={17} />
                Open Workspace
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}