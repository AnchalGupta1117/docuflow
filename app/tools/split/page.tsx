"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  FileText,
  Info,
  Scissors,
  Trash2,
  XCircle,
} from "lucide-react";
import { PDFDocument } from "pdf-lib";
import UploadZone from "@/components/UploadZone";
import { downloadBlob, formatFileSize } from "@/lib/utils";

function parsePageRanges(
  input: string,
  totalPages: number
): { pages: number[]; error: string | null } {
  const cleaned = input.replace(/\s+/g, "");

  if (!cleaned) {
    return {
      pages: [],
      error: "Please enter at least one page or page range.",
    };
  }

  const parts = cleaned.split(",");
  const pages = new Set<number>();

  for (const part of parts) {
    if (!part) {
      return {
        pages: [],
        error: "Invalid page range format.",
      };
    }

    if (part.includes("-")) {
      const rangeParts = part.split("-");

      if (rangeParts.length !== 2) {
        return {
          pages: [],
          error: `Invalid range "${part}". Use formats such as 1-3.`,
        };
      }

      const start = Number(rangeParts[0]);
      const end = Number(rangeParts[1]);

      if (
        !Number.isInteger(start) ||
        !Number.isInteger(end) ||
        start < 1 ||
        end < 1
      ) {
        return {
          pages: [],
          error: `Invalid range "${part}". Page numbers must be positive integers.`,
        };
      }

      if (start > end) {
        return {
          pages: [],
          error: `Invalid range "${part}". The starting page must be less than or equal to the ending page.`,
        };
      }

      if (end > totalPages) {
        return {
          pages: [],
          error: `Page ${end} does not exist. This PDF has ${totalPages} pages.`,
        };
      }

      for (let page = start; page <= end; page++) {
        pages.add(page);
      }
    } else {
      const page = Number(part);

      if (!Number.isInteger(page) || page < 1) {
        return {
          pages: [],
          error: `Invalid page "${part}".`,
        };
      }

      if (page > totalPages) {
        return {
          pages: [],
          error: `Page ${page} does not exist. This PDF has ${totalPages} pages.`,
        };
      }

      pages.add(page);
    }
  }

  return {
    pages: Array.from(pages).sort((a, b) => a - b),
    error: null,
  };
}

export default function SplitPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [pageRange, setPageRange] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const parsedPages = useMemo(() => {
    if (!pageRange || !totalPages) {
      return {
        pages: [],
        error: null,
      };
    }

    return parsePageRanges(pageRange, totalPages);
  }, [pageRange, totalPages]);

  const handleFileSelect = async (selectedFile: File) => {
    setError("");
    setSuccess("");
    setDownloadUrl(null);
    setPageRange("");
    setTotalPages(null);

    try {
      const bytes = await selectedFile.arrayBuffer();
      const pdf = await PDFDocument.load(bytes);

      setFile(selectedFile);
      setTotalPages(pdf.getPageCount());
    } catch {
      setFile(null);
      setTotalPages(null);
      setError(
        "This file could not be opened as a valid PDF. Please choose another PDF."
      );
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setTotalPages(null);
    setPageRange("");
    setDownloadUrl(null);
    setError("");
    setSuccess("");
  };

  const handleSplit = async () => {
    if (!file || !totalPages) {
      setError("Please upload a PDF first.");
      return;
    }

    const result = parsePageRanges(pageRange, totalPages);

    if (result.error) {
      setError(result.error);
      return;
    }

    if (result.pages.length === 0) {
      setError("Please select at least one page.");
      return;
    }

    setIsProcessing(true);
    setError("");
    setSuccess("");
    setDownloadUrl(null);

    try {
      const sourceBytes = await file.arrayBuffer();
      const sourcePdf = await PDFDocument.load(sourceBytes);

      const outputPdf = await PDFDocument.create();

      const zeroBasedIndexes = result.pages.map((page) => page - 1);

      const copiedPages = await outputPdf.copyPages(
        sourcePdf,
        zeroBasedIndexes
      );

      copiedPages.forEach((page) => {
        outputPdf.addPage(page);
      });

      const outputBytes = await outputPdf.save();

      const safeBytes = new Uint8Array(outputBytes);

      const blob = new Blob(
        [safeBytes.buffer as ArrayBuffer],
        {
          type: "application/pdf",
        }
      );

      const url = URL.createObjectURL(blob);

      setDownloadUrl(url);
      setSuccess(
        `Successfully extracted ${result.pages.length} ${
          result.pages.length === 1 ? "page" : "pages"
        }.`
      );
    } catch {
      setError(
        "Something went wrong while splitting the PDF. Please try another file."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!downloadUrl || !file) return;

    fetch(downloadUrl)
      .then((response) => response.blob())
      .then((blob) => {
        const originalName = file.name.replace(/\.pdf$/i, "");
        downloadBlob(blob, `${originalName}-split.pdf`);
      });
  };

  const selectedPageCount = parsedPages.pages.length;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10">
              <FileText className="text-cyan-300" size={19} />
            </div>

            <div>
              <div className="text-sm font-semibold tracking-tight text-white">
                DocuFlow
              </div>
              <div className="hidden text-[10px] text-slate-500 sm:block">
                AI Document Workspace
              </div>
            </div>
          </Link>

          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
          >
            <ArrowLeft size={14} />
            Dashboard
          </Link>
        </div>
      </header>

      {/* Main */}
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Heading */}
        <div className="mb-8">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10">
            <Scissors className="text-cyan-300" size={23} />
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Split PDF
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
            Extract specific pages from a PDF and create a new document.
            Select individual pages or enter ranges such as{" "}
            <span className="font-medium text-slate-300">
              1-3, 5, 8-10
            </span>
            .
          </p>
        </div>

        {/* Workspace */}
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          {/* Left */}
          <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 sm:p-6">
            {!file ? (
              <UploadZone
                onFileSelect={handleFileSelect}
                acceptedTypes={["application/pdf", ".pdf"]}
                maxSizeMB={50}
                multiple={false}
                title="Upload a PDF to split"
                description="Choose a PDF file up to 50 MB"
              />
            ) : (
              <div>
                {/* Selected file */}
                <div className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.025] p-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-400/10">
                      <FileText className="text-red-300" size={21} />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-200">
                        {file.name}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {formatFileSize(file.size)}
                        {totalPages !== null &&
                          ` • ${totalPages} ${
                            totalPages === 1 ? "page" : "pages"
                          }`}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-red-400/10 hover:text-red-300"
                    aria-label="Remove PDF"
                    title="Remove PDF"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Page selection */}
                <div className="mt-6">
                  <label
                    htmlFor="page-range"
                    className="block text-sm font-semibold text-slate-200"
                  >
                    Pages to extract
                  </label>

                  <p className="mt-1 text-xs text-slate-500">
                    Enter page numbers and ranges separated by commas.
                  </p>

                  <div className="mt-3">
                    <input
                      id="page-range"
                      type="text"
                      value={pageRange}
                      onChange={(event) => {
                        setPageRange(event.target.value);
                        setError("");
                        setSuccess("");
                        setDownloadUrl(null);
                      }}
                      placeholder="Example: 1-3, 5, 8-10"
                      className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-600 transition focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/10"
                    />
                  </div>

                  {/* Quick actions */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (totalPages) {
                          setPageRange(`1-${totalPages}`);
                          setError("");
                          setSuccess("");
                          setDownloadUrl(null);
                        }
                      }}
                      className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-slate-400 transition hover:bg-white/[0.06] hover:text-slate-200"
                    >
                      Select all
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPageRange("");
                        setError("");
                        setSuccess("");
                        setDownloadUrl(null);
                      }}
                      className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-slate-400 transition hover:bg-white/[0.06] hover:text-slate-200"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Selection preview */}
                {pageRange && (
                  <div className="mt-5 rounded-xl border border-white/10 bg-slate-900/40 p-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-400/10">
                        <Info size={15} className="text-cyan-300" />
                      </div>

                      <div className="min-w-0">
                        {parsedPages.error ? (
                          <>
                            <p className="text-xs font-medium text-red-300">
                              Invalid selection
                            </p>
                            <p className="mt-1 text-xs leading-5 text-slate-500">
                              {parsedPages.error}
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-xs font-medium text-slate-300">
                              {selectedPageCount}{" "}
                              {selectedPageCount === 1 ? "page" : "pages"}{" "}
                              selected
                            </p>

                            <p className="mt-1 break-words text-xs leading-5 text-slate-500">
                              Pages: {parsedPages.pages.join(", ")}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Process button */}
                <div className="mt-6">
                  <button
                    type="button"
                    onClick={handleSplit}
                    disabled={
                      isProcessing ||
                      !pageRange ||
                      Boolean(parsedPages.error) ||
                      selectedPageCount === 0
                    }
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Scissors size={17} />
                    {isProcessing ? "Splitting PDF..." : "Split PDF"}
                  </button>
                </div>

                {/* Status */}
                {success && (
                  <div className="mt-4 flex items-start gap-3 rounded-xl border border-emerald-400/15 bg-emerald-400/5 p-4">
                    <CheckCircle2
                      size={18}
                      className="mt-0.5 shrink-0 text-emerald-300"
                    />

                    <div>
                      <p className="text-sm font-medium text-emerald-200">
                        {success}
                      </p>

                      <button
                        type="button"
                        onClick={handleDownload}
                        className="mt-2 inline-flex items-center gap-2 text-xs font-medium text-emerald-300 transition hover:text-emerald-200"
                      >
                        <Download size={14} />
                        Download extracted PDF
                      </button>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-400/15 bg-red-400/5 p-4">
                    <XCircle
                      size={18}
                      className="mt-0.5 shrink-0 text-red-300"
                    />

                    <p className="text-xs leading-5 text-red-200">
                      {error}
                    </p>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Right */}
          <aside className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
              <h2 className="text-sm font-semibold text-white">
                How it works
              </h2>

              <div className="mt-4 space-y-4">
                {[
                  {
                    number: "01",
                    title: "Upload your PDF",
                    text: "Choose the document you want to extract pages from.",
                  },
                  {
                    number: "02",
                    title: "Select pages",
                    text: "Enter individual pages or ranges such as 2-5, 8, 11-13.",
                  },
                  {
                    number: "03",
                    title: "Create PDF",
                    text: "DocuFlow creates a new PDF containing only your selected pages.",
                  },
                ].map((step) => (
                  <div key={step.number} className="flex gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-cyan-400/15 bg-cyan-400/5 text-[10px] font-semibold text-cyan-300">
                      {step.number}
                    </div>

                    <div>
                      <p className="text-xs font-medium text-slate-300">
                        {step.title}
                      </p>

                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        {step.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
              <h2 className="text-sm font-semibold text-white">
                Example
              </h2>

              <div className="mt-3 rounded-xl border border-white/10 bg-slate-900/60 p-3">
                <code className="text-xs text-cyan-300">
                  1-3, 7, 10-12
                </code>
              </div>

              <p className="mt-3 text-xs leading-5 text-slate-500">
                This creates a new PDF containing pages 1, 2, 3, 7, 10, 11,
                and 12 in that order.
              </p>
            </div>

            <div className="rounded-2xl border border-cyan-400/10 bg-cyan-400/[0.03] p-5">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-cyan-300" />
                <h2 className="text-sm font-semibold text-slate-200">
                  Private processing
                </h2>
              </div>

              <p className="mt-2 text-xs leading-5 text-slate-500">
                PDF processing currently happens directly in your browser.
                Your file does not need to be uploaded to a server for this
                operation.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}