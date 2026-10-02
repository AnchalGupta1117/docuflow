"use client";

import Link from "next/link";
import {
  Clock3,
  Download,
  FileText,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";

interface DocumentCardProps {
  id: string;
  name: string;
  size: string;
  pages: number;
  updatedAt: string;
  category?: string;
  onDelete?: (id: string) => void;
  onDownload?: (id: string) => void;
  onRename?: (id: string) => void;
}

export default function DocumentCard({
  id,
  name,
  size,
  pages,
  updatedAt,
  category = "PDF",
  onDelete,
  onDownload,
  onRename,
}: DocumentCardProps) {
  const handleDelete = () => {
    if (onDelete) {
      onDelete(id);
    }
  };

  const handleDownload = () => {
    if (onDownload) {
      onDownload(id);
    }
  };

  const handleRename = () => {
    if (onRename) {
      onRename(id);
    }
  };

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025] transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-400/20 hover:bg-white/[0.04]">
      {/* Top accent */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <Link
            href={`/documents/${id}`}
            className="flex min-w-0 flex-1 items-start gap-3"
          >
            {/* File Icon */}
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-400/10 text-red-300 transition-colors group-hover:bg-red-400/15">
              <FileText size={21} />
            </div>

            {/* File Name */}
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-slate-200 transition-colors group-hover:text-white">
                {name}
              </h3>

              <div className="mt-1.5 flex items-center gap-2">
                <span className="text-xs text-slate-500">
                  {category}
                </span>

                <span className="h-1 w-1 rounded-full bg-slate-700" />

                <span className="text-xs text-slate-500">
                  {pages} {pages === 1 ? "page" : "pages"}
                </span>
              </div>
            </div>
          </Link>

          {/* More Menu */}
          <div className="relative">
            <details className="group/menu">
              <summary
                className="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-lg text-slate-500 transition hover:bg-white/[0.06] hover:text-slate-200 [&::-webkit-details-marker]:hidden"
                aria-label="Document actions"
              >
                <MoreHorizontal size={17} />
              </summary>

              <div className="absolute right-0 top-10 z-20 w-40 overflow-hidden rounded-xl border border-white/10 bg-slate-900 p-1.5 shadow-2xl shadow-black/40">
                <Link
                  href={`/documents/${id}`}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-300 transition hover:bg-white/[0.05] hover:text-white"
                >
                  <FileText size={14} />
                  Open document
                </Link>

                <button
                  type="button"
                  onClick={handleRename}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-slate-300 transition hover:bg-white/[0.05] hover:text-white"
                >
                  <Pencil size={14} />
                  Rename
                </button>

                <button
                  type="button"
                  onClick={handleDownload}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-slate-300 transition hover:bg-white/[0.05] hover:text-white"
                >
                  <Download size={14} />
                  Download
                </button>

                <div className="my-1 border-t border-white/5" />

                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-red-300 transition hover:bg-red-400/10"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            </details>
          </div>
        </div>

        {/* Document Preview */}
        <Link
          href={`/documents/${id}`}
          className="mt-5 block overflow-hidden rounded-xl border border-white/5 bg-slate-950/60"
        >
          <div className="flex h-32 items-center justify-center">
            <div className="relative h-24 w-20 rounded-md bg-white shadow-xl shadow-black/30">
              {/* Fake document lines */}
              <div className="absolute left-3 right-3 top-4 h-1 rounded bg-slate-200" />
              <div className="absolute left-3 right-7 top-8 h-1 rounded bg-slate-200" />
              <div className="absolute left-3 right-4 top-12 h-1 rounded bg-slate-200" />

              <div className="absolute left-3 right-3 top-17 h-6 rounded bg-cyan-50" />

              <div className="absolute left-3 right-8 top-[4.8rem] h-1 rounded bg-slate-200" />
              <div className="absolute left-3 right-5 top-[5.4rem] h-1 rounded bg-slate-200" />

              <div className="absolute bottom-2 right-2 text-[7px] font-bold text-slate-400">
                PDF
              </div>
            </div>
          </div>
        </Link>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Clock3 size={13} />
            <span>{updatedAt}</span>
          </div>

          <span className="text-xs text-slate-600">{size}</span>
        </div>
      </div>
    </article>
  );
}