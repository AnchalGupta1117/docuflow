"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Download,
  FileText,
  GripVertical,
  Loader2,
  RotateCcw,
  RotateCw,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import Link from "next/link";
import { PDFDocument, degrees } from "pdf-lib";

import { downloadBlob, formatFileSize } from "@/lib/utils";

interface PageItem {
  id: string;
  originalPage: number;
  rotation: number;
  thumbnailUrl: string;
}

type ExportMode = "all" | "selected";

const MAX_FILE_SIZE_MB = 50;

function createPageId() {
  return `page-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}

export default function EditPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [selectedPages, setSelectedPages] = useState<Set<string>>(
    new Set()
  );

  const [exportMode, setExportMode] =
    useState<ExportMode>("all");

  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedCount = selectedPages.size;

  const canExport =
    pages.length > 0 &&
    (exportMode === "all" || selectedCount > 0);

  const orderedPages = useMemo(
    () => pages.map((page) => page.originalPage),
    [pages]
  );

  useEffect(() => {
    return () => {
      pages.forEach((page) => {
        URL.revokeObjectURL(page.thumbnailUrl);
      });
    };
  }, [pages]);

  function clearPages() {
    pages.forEach((page) => {
      URL.revokeObjectURL(page.thumbnailUrl);
    });

    setPages([]);
    setSelectedPages(new Set());
  }

  function resetTool() {
    clearPages();
    setFile(null);
    setProgress(0);
    setError("");
    setSuccess("");
    setIsLoading(false);
    setIsExporting(false);
  }

  async function handleFile(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) return;

    setError("");
    setSuccess("");

    if (
      selectedFile.type !== "application/pdf" &&
      !selectedFile.name.toLowerCase().endsWith(".pdf")
    ) {
      setError("Please select a valid PDF file.");
      event.target.value = "";
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(
        `PDF size must be below ${MAX_FILE_SIZE_MB} MB.`
      );
      event.target.value = "";
      return;
    }

    setIsLoading(true);
    clearPages();

    try {
      /*
       * pdfjs-dist is imported dynamically so that it is never
       * evaluated during Next.js server prerendering.
       */
      const pdfjsLib = await import("pdfjs-dist");

      if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url
        ).toString();
      }

      const arrayBuffer = await selectedFile.arrayBuffer();

      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(arrayBuffer),
      });

      const pdf = await loadingTask.promise;

      const generatedPages: PageItem[] = [];

      for (
        let pageNumber = 1;
        pageNumber <= pdf.numPages;
        pageNumber++
      ) {
        const page = await pdf.getPage(pageNumber);

        const viewport = page.getViewport({
          scale: 0.65,
        });

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        if (!context) {
          throw new Error("Unable to create PDF preview.");
        }

        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);

        await page.render({
          canvas,
          canvasContext: context,
          viewport,
        }).promise;

        const blob = await new Promise<Blob>(
          (resolve, reject) => {
            canvas.toBlob(
              (result) => {
                if (result) {
                  resolve(result);
                } else {
                  reject(
                    new Error(
                      `Unable to generate preview for page ${pageNumber}.`
                    )
                  );
                }
              },
              "image/jpeg",
              0.78
            );
          }
        );

        const thumbnailUrl = URL.createObjectURL(blob);

        generatedPages.push({
          id: createPageId(),
          originalPage: pageNumber,
          rotation: 0,
          thumbnailUrl,
        });

        setProgress(
          Math.round((pageNumber / pdf.numPages) * 100)
        );

        canvas.width = 1;
        canvas.height = 1;
      }

      setFile(selectedFile);
      setPages(generatedPages);
      setSelectedPages(new Set());
      setProgress(0);
    } catch (err) {
      console.error(err);

      clearPages();

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load this PDF."
      );
    } finally {
      setIsLoading(false);
    }

    event.target.value = "";
  }

  function togglePage(id: string) {
    setSelectedPages((current) => {
      const next = new Set(current);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  }

  function selectAllPages() {
    setSelectedPages(new Set(pages.map((page) => page.id)));
  }

  function deselectAllPages() {
    setSelectedPages(new Set());
  }

  function deletePage(id: string) {
    if (pages.length <= 1) {
      setError("A PDF must contain at least one page.");
      return;
    }

    setPages((current) => {
      const page = current.find((item) => item.id === id);

      if (page) {
        URL.revokeObjectURL(page.thumbnailUrl);
      }

      return current.filter((item) => item.id !== id);
    });

    setSelectedPages((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });

    setSuccess("");
  }

  function deleteSelectedPages() {
    if (selectedPages.size === 0) {
      setError("Select at least one page first.");
      return;
    }

    if (pages.length - selectedPages.size < 1) {
      setError("A PDF must contain at least one page.");
      return;
    }

    setPages((current) => {
      current.forEach((page) => {
        if (selectedPages.has(page.id)) {
          URL.revokeObjectURL(page.thumbnailUrl);
        }
      });

      return current.filter(
        (page) => !selectedPages.has(page.id)
      );
    });

    setSelectedPages(new Set());

    setSuccess(
      `${selectedPages.size} ${
        selectedPages.size === 1 ? "page" : "pages"
      } removed.`
    );
  }

  function movePage(index: number, direction: "up" | "down") {
    const targetIndex =
      direction === "up" ? index - 1 : index + 1;

    if (
      targetIndex < 0 ||
      targetIndex >= pages.length
    ) {
      return;
    }

    setPages((current) => {
      const next = [...current];

      [next[index], next[targetIndex]] = [
        next[targetIndex],
        next[index],
      ];

      return next;
    });

    setSuccess("");
  }

  function rotatePage(id: string, direction: "left" | "right") {
    setPages((current) =>
      current.map((page) => {
        if (page.id !== id) return page;

        const change = direction === "right" ? 90 : -90;

        return {
          ...page,
          rotation:
            (page.rotation + change + 360) % 360,
        };
      })
    );

    setSuccess("");
  }

  function rotateSelected(direction: "left" | "right") {
    if (selectedPages.size === 0) {
      setError("Select at least one page first.");
      return;
    }

    setPages((current) =>
      current.map((page) => {
        if (!selectedPages.has(page.id)) {
          return page;
        }

        const change = direction === "right" ? 90 : -90;

        return {
          ...page,
          rotation:
            (page.rotation + change + 360) % 360,
        };
      })
    );

    setSuccess("");
  }

  async function exportPdf() {
    if (!file || !canExport) {
      setError("Please select pages to export.");
      return;
    }

    setError("");
    setSuccess("");
    setIsExporting(true);
    setProgress(0);

    try {
      const sourceBytes = await file.arrayBuffer();

      const sourcePdf = await PDFDocument.load(sourceBytes);

      const sourcePageIndexByOriginalPage = new Map<
        number,
        number
      >();

      orderedPages.forEach((originalPage, index) => {
        sourcePageIndexByOriginalPage.set(
          originalPage,
          index
        );
      });

      let exportPages = pages;

      if (exportMode === "selected") {
        exportPages = pages.filter((page) =>
          selectedPages.has(page.id)
        );
      }

      if (exportPages.length === 0) {
        throw new Error("No pages selected for export.");
      }

      const outputPdf = await PDFDocument.create();

      for (
        let index = 0;
        index < exportPages.length;
        index++
      ) {
        const pageItem = exportPages[index];

        const sourceIndex =
          sourcePageIndexByOriginalPage.get(
            pageItem.originalPage
          );

        if (sourceIndex === undefined) {
          continue;
        }

        const [copiedPage] = await outputPdf.copyPages(
          sourcePdf,
          [sourceIndex]
        );

        copiedPage.setRotation(
          degrees(pageItem.rotation)
        );

        outputPdf.addPage(copiedPage);

        setProgress(
          Math.round(
            ((index + 1) / exportPages.length) * 100
          )
        );
      }

      const pdfBytes = await outputPdf.save();

      const safeBytes = new Uint8Array(pdfBytes);

      const blob = new Blob(
        [safeBytes.buffer as ArrayBuffer],
        {
          type: "application/pdf",
        }
      );

      const originalName =
        file.name.replace(/\.pdf$/i, "");

      const suffix =
        exportMode === "selected"
          ? "-selected-pages"
          : "-edited";

      downloadBlob(
        blob,
        `${originalName}${suffix}.pdf`
      );

      setSuccess(
        `${exportPages.length} ${
          exportPages.length === 1 ? "page" : "pages"
        } exported successfully.`
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to create the edited PDF."
      );
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-400 transition hover:border-cyan-400/30 hover:bg-cyan-400/10 hover:text-cyan-300"
              aria-label="Back to dashboard"
            >
              <ArrowLeft size={17} />
            </Link>

            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
                <FileText size={19} />
              </div>

              <div>
                <h1 className="text-sm font-semibold text-white">
                  PDF Page Editor
                </h1>

                <p className="hidden text-[11px] text-slate-500 sm:block">
                  Delete, reorder, rotate, and extract pages
                </p>
              </div>
            </div>
          </div>

          <Link
            href="/dashboard"
            className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs font-medium text-slate-300 transition hover:border-white/20 hover:bg-white/[0.06] sm:flex"
          >
            Workspace
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Intro */}
        <div className="mb-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/10 bg-cyan-400/5 px-3 py-1.5 text-[11px] font-medium text-cyan-300">
            <Sparkles size={12} />
            PDF page workspace
          </div>

          <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Edit your PDF pages
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Rearrange pages, remove unwanted content, rotate pages,
            or export only the pages you need.
          </p>
        </div>

        {!file && !isLoading ? (
          <label className="group block cursor-pointer">
            <input
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={handleFile}
            />

            <div className="flex min-h-[360px] flex-col items-center justify-center rounded-3xl border border-dashed border-white/15 bg-white/[0.025] px-6 text-center transition hover:border-cyan-400/30 hover:bg-cyan-400/[0.02]">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300 transition group-hover:scale-105">
                <Upload size={28} />
              </div>

              <h3 className="mt-6 text-base font-semibold text-white">
                Upload a PDF to start editing
              </h3>

              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                DocuFlow will generate page previews so you can
                visually manage your document.
              </p>

              <span className="mt-6 rounded-xl bg-cyan-400 px-5 py-2.5 text-xs font-semibold text-slate-950 transition group-hover:bg-cyan-300">
                Choose PDF
              </span>

              <p className="mt-4 text-[11px] text-slate-600">
                Maximum file size: {MAX_FILE_SIZE_MB} MB
              </p>
            </div>
          </label>
        ) : isLoading ? (
          <div className="flex min-h-[360px] flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/[0.025]">
            <Loader2
              size={30}
              className="animate-spin text-cyan-300"
            />

            <p className="mt-5 text-sm font-medium text-white">
              Loading PDF pages...
            </p>

            <div className="mt-4 w-64">
              <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full bg-cyan-400 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <p className="mt-2 text-center text-[10px] text-slate-600">
                {progress}%
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            {/* Editor */}
            <section className="space-y-5">
              {/* File bar */}
              <div className="surface-card flex items-center justify-between gap-4 rounded-2xl border border-white/10 p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-400/10 text-red-300">
                    <FileText size={19} />
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-white">
                      {file?.name}
                    </p>

                    <p className="mt-1 text-[10px] text-slate-600">
                      {formatFileSize(file?.size || 0)} ·{" "}
                      {pages.length}{" "}
                      {pages.length === 1 ? "page" : "pages"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={resetTool}
                  disabled={isExporting}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-red-400/10 hover:text-red-300 disabled:opacity-30"
                  aria-label="Close PDF"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Toolbar */}
              <div className="surface-card flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 p-3">
                <button
                  type="button"
                  onClick={selectAllPages}
                  disabled={isExporting}
                  className="rounded-lg border border-white/10 px-3 py-2 text-[11px] font-medium text-slate-400 transition hover:bg-white/[0.05] hover:text-white disabled:opacity-40"
                >
                  Select all
                </button>

                <button
                  type="button"
                  onClick={deselectAllPages}
                  disabled={isExporting}
                  className="rounded-lg border border-white/10 px-3 py-2 text-[11px] font-medium text-slate-400 transition hover:bg-white/[0.05] hover:text-white disabled:opacity-40"
                >
                  Clear selection
                </button>

                <div className="h-5 w-px bg-white/10" />

                <button
                  type="button"
                  onClick={() => rotateSelected("left")}
                  disabled={
                    isExporting || selectedCount === 0
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-[11px] font-medium text-slate-400 transition hover:bg-cyan-400/10 hover:text-cyan-300 disabled:opacity-30"
                >
                  <RotateCcw size={13} />
                  Rotate left
                </button>

                <button
                  type="button"
                  onClick={() => rotateSelected("right")}
                  disabled={
                    isExporting || selectedCount === 0
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-[11px] font-medium text-slate-400 transition hover:bg-cyan-400/10 hover:text-cyan-300 disabled:opacity-30"
                >
                  <RotateCw size={13} />
                  Rotate right
                </button>

                <button
                  type="button"
                  onClick={deleteSelectedPages}
                  disabled={
                    isExporting || selectedCount === 0
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-400/10 px-3 py-2 text-[11px] font-medium text-red-300 transition hover:bg-red-400/10 disabled:opacity-30"
                >
                  <Trash2 size={13} />
                  Delete selected
                </button>
              </div>

              {/* Pages */}
              <div className="surface-card rounded-2xl border border-white/10 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      Pages
                    </h3>

                    <p className="mt-1 text-[11px] text-slate-600">
                      Click a page to select it. Use the controls to
                      change its position or rotation.
                    </p>
                  </div>

                  <span className="rounded-full border border-cyan-400/10 bg-cyan-400/5 px-2.5 py-1 text-[10px] font-medium text-cyan-300">
                    {selectedCount} selected
                  </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {pages.map((page, index) => {
                    const isSelected = selectedPages.has(
                      page.id
                    );

                    return (
                      <div
                        key={page.id}
                        className={`group overflow-hidden rounded-xl border transition ${
                          isSelected
                            ? "border-cyan-400/40 bg-cyan-400/[0.04]"
                            : "border-white/10 bg-white/[0.02] hover:border-white/20"
                        }`}
                      >
                        {/* Thumbnail */}
                        <button
                          type="button"
                          onClick={() => togglePage(page.id)}
                          disabled={isExporting}
                          className="relative flex h-64 w-full items-center justify-center overflow-hidden bg-slate-900 p-3"
                        >
                          <img
                            src={page.thumbnailUrl}
                            alt={`Page ${page.originalPage}`}
                            className="max-h-full max-w-full rounded-md object-contain shadow-2xl transition duration-200 group-hover:scale-[1.01]"
                            style={{
                              transform: `rotate(${page.rotation}deg)`,
                            }}
                          />

                          <div className="absolute left-3 top-3 flex items-center gap-1.5">
                            <span className="flex h-6 min-w-6 items-center justify-center rounded-md border border-white/10 bg-slate-950/80 px-1.5 text-[10px] font-semibold text-white backdrop-blur">
                              {index + 1}
                            </span>

                            {isSelected && (
                              <span className="rounded-md bg-cyan-400 px-2 py-1 text-[9px] font-bold text-slate-950">
                                Selected
                              </span>
                            )}
                          </div>

                          <div className="absolute bottom-3 right-3 rounded-md border border-white/10 bg-slate-950/80 px-2 py-1 text-[9px] text-slate-400 backdrop-blur">
                            Original page {page.originalPage}
                          </div>
                        </button>

                        {/* Controls */}
                        <div className="flex items-center justify-between border-t border-white/10 p-2">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                movePage(index, "up")
                              }
                              disabled={
                                index === 0 || isExporting
                              }
                              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition hover:bg-white/[0.05] hover:text-cyan-300 disabled:opacity-20"
                              aria-label="Move page up"
                            >
                              <ArrowUp size={13} />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                movePage(index, "down")
                              }
                              disabled={
                                index === pages.length - 1 ||
                                isExporting
                              }
                              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition hover:bg-white/[0.05] hover:text-cyan-300 disabled:opacity-20"
                              aria-label="Move page down"
                            >
                              <ArrowDown size={13} />
                            </button>

                            <span className="mx-1 h-4 w-px bg-white/10" />

                            <button
                              type="button"
                              onClick={() =>
                                rotatePage(
                                  page.id,
                                  "left"
                                )
                              }
                              disabled={isExporting}
                              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition hover:bg-white/[0.05] hover:text-cyan-300 disabled:opacity-20"
                              aria-label="Rotate left"
                            >
                              <RotateCcw size={13} />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                rotatePage(
                                  page.id,
                                  "right"
                                )
                              }
                              disabled={isExporting}
                              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition hover:bg-white/[0.05] hover:text-cyan-300 disabled:opacity-20"
                              aria-label="Rotate right"
                            >
                              <RotateCw size={13} />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              deletePage(page.id)
                            }
                            disabled={isExporting}
                            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-600 transition hover:bg-red-400/10 hover:text-red-300 disabled:opacity-20"
                            aria-label="Delete page"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Export */}
              <div className="surface-card rounded-2xl border border-white/10 p-5">
                <div className="mb-5">
                  <h3 className="text-sm font-semibold text-white">
                    Export PDF
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    Choose whether to export the complete edited
                    document or only selected pages.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setExportMode("all")}
                    disabled={isExporting}
                    className={`rounded-xl border p-4 text-left transition ${
                      exportMode === "all"
                        ? "border-cyan-400/30 bg-cyan-400/10"
                        : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]"
                    }`}
                  >
                    <p
                      className={`text-xs font-semibold ${
                        exportMode === "all"
                          ? "text-cyan-300"
                          : "text-slate-300"
                      }`}
                    >
                      Export edited PDF
                    </p>

                    <p className="mt-1 text-[10px] leading-4 text-slate-600">
                      Export all remaining pages in their current
                      order.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setExportMode("selected")
                    }
                    disabled={isExporting}
                    className={`rounded-xl border p-4 text-left transition ${
                      exportMode === "selected"
                        ? "border-cyan-400/30 bg-cyan-400/10"
                        : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]"
                    }`}
                  >
                    <p
                      className={`text-xs font-semibold ${
                        exportMode === "selected"
                          ? "text-cyan-300"
                          : "text-slate-300"
                      }`}
                    >
                      Extract selected pages
                    </p>

                    <p className="mt-1 text-[10px] leading-4 text-slate-600">
                      Create a new PDF containing only selected
                      pages.
                    </p>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={exportPdf}
                  disabled={
                    isExporting || !canExport
                  }
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isExporting ? (
                    <>
                      <Loader2
                        size={17}
                        className="animate-spin"
                      />
                      Creating PDF...
                    </>
                  ) : (
                    <>
                      <Download size={17} />
                      {exportMode === "selected"
                        ? "Extract & Download"
                        : "Export & Download"}
                    </>
                  )}
                </button>

                {isExporting && (
                  <div className="mt-4">
                    <div className="mb-2 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">
                        Building PDF
                      </span>

                      <span className="font-medium text-cyan-300">
                        {progress}%
                      </span>
                    </div>

                    <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                      <div
                        className="h-full rounded-full bg-cyan-400 transition-all"
                        style={{
                          width: `${progress}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div className="rounded-2xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-xs leading-5 text-red-300">
                  {error}
                </div>
              )}

              {success && (
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 px-4 py-3 text-xs leading-5 text-emerald-300">
                  {success}
                </div>
              )}
            </section>

            {/* Sidebar */}
            <aside className="space-y-4">
              <div className="surface-card rounded-2xl border border-white/10 p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
                  <GripVertical size={19} />
                </div>

                <h3 className="mt-4 text-sm font-semibold text-white">
                  Page controls
                </h3>

                <ul className="mt-3 space-y-3">
                  {[
                    "Select individual pages",
                    "Reorder pages",
                    "Delete pages",
                    "Rotate individual pages",
                    "Rotate multiple selected pages",
                    "Extract selected pages",
                    "Export the complete edited PDF",
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex gap-2.5 text-xs leading-5 text-slate-500"
                    >
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-cyan-400" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
                  <Sparkles
                    size={14}
                    className="text-cyan-300"
                  />
                  Non-destructive workspace
                </div>

                <p className="mt-2 text-[11px] leading-5 text-slate-600">
                  Your original PDF is kept unchanged. DocuFlow
                  creates a new PDF when you export your edits.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                <p className="text-[11px] font-medium text-slate-400">
                  Current document
                </p>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                    <p className="text-lg font-semibold text-white">
                      {pages.length}
                    </p>
                    <p className="mt-1 text-[10px] text-slate-600">
                      Pages
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                    <p className="text-lg font-semibold text-cyan-300">
                      {selectedCount}
                    </p>
                    <p className="mt-1 text-[10px] text-slate-600">
                      Selected
                    </p>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}