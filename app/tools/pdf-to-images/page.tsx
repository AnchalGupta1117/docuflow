"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Download,
  FileImage,
  FileText,
  Image as ImageIcon,
  Loader2,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import Link from "next/link";
import * as pdfjsLib from "pdfjs-dist";

import { downloadBlob, formatFileSize } from "@/lib/utils";

interface GeneratedImage {
  pageNumber: number;
  blob: Blob;
  url: string;
  width: number;
  height: number;
}

type ImageFormat = "png" | "jpeg";

const MAX_FILE_SIZE_MB = 50;

function configurePdfJsWorker() {
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url
    ).toString();
  }
}

function parsePageRange(value: string, totalPages: number): number[] {
  if (!value.trim()) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>();

  const parts = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  for (const part of parts) {
    if (part.includes("-")) {
      const [startText, endText] = part.split("-").map((item) => item.trim());

      const start = Number(startText);
      const end = Number(endText);

      if (
        !Number.isInteger(start) ||
        !Number.isInteger(end) ||
        start < 1 ||
        end > totalPages ||
        start > end
      ) {
        throw new Error(`Invalid page range: ${part}`);
      }

      for (let page = start; page <= end; page++) {
        pages.add(page);
      }
    } else {
      const page = Number(part);

      if (
        !Number.isInteger(page) ||
        page < 1 ||
        page > totalPages
      ) {
        throw new Error(`Invalid page number: ${part}`);
      }

      pages.add(page);
    }
  }

  return Array.from(pages).sort((a, b) => a - b);
}

export default function PdfToImagesPage() {
  const [file, setFile] = useState<File | null>(null);
  const [totalPages, setTotalPages] = useState<number | null>(null);

  const [pageRange, setPageRange] = useState("");
  const [format, setFormat] = useState<ImageFormat>("png");
  const [scale, setScale] = useState("1.5");

  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedPageCount = useMemo(() => {
    if (!totalPages) return 0;

    try {
      return parsePageRange(pageRange, totalPages).length;
    } catch {
      return 0;
    }
  }, [pageRange, totalPages]);

  function clearGeneratedImages() {
    images.forEach((image) => URL.revokeObjectURL(image.url));
    setImages([]);
  }

  function resetTool() {
    clearGeneratedImages();

    setFile(null);
    setTotalPages(null);
    setPageRange("");
    setProgress(0);
    setCurrentPage(0);
    setError("");
    setSuccess("");
  }

  async function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) return;

    setError("");
    setSuccess("");
    clearGeneratedImages();

    if (
      selectedFile.type !== "application/pdf" &&
      !selectedFile.name.toLowerCase().endsWith(".pdf")
    ) {
      setError("Please select a valid PDF file.");
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(`PDF size must be below ${MAX_FILE_SIZE_MB} MB.`);
      return;
    }

    try {
      configurePdfJsWorker();

      const arrayBuffer = await selectedFile.arrayBuffer();

      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(arrayBuffer),
      });

      const pdf = await loadingTask.promise;

      setFile(selectedFile);
      setTotalPages(pdf.numPages);
      setPageRange("");
      setProgress(0);
      setCurrentPage(0);
    } catch (err) {
      console.error(err);
      setError("Unable to read this PDF. Please try another file.");
      setFile(null);
      setTotalPages(null);
    }
  }

  async function convertToImages() {
    if (!file || !totalPages) {
      setError("Please upload a PDF first.");
      return;
    }

    setError("");
    setSuccess("");
    clearGeneratedImages();

    let pages: number[];

    try {
      pages = parsePageRange(pageRange, totalPages);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Invalid page selection."
      );
      return;
    }

    if (pages.length === 0) {
      setError("Please select at least one page.");
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setCurrentPage(0);

    try {
      configurePdfJsWorker();

      const arrayBuffer = await file.arrayBuffer();

      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(arrayBuffer),
      });

      const pdf = await loadingTask.promise;

      const generated: GeneratedImage[] = [];

      for (let index = 0; index < pages.length; index++) {
        const pageNumber = pages[index];

        setCurrentPage(pageNumber);

        const page = await pdf.getPage(pageNumber);

        const viewport = page.getViewport({
          scale: Number(scale),
        });

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        if (!context) {
          throw new Error("Unable to create image canvas.");
        }

        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);

        await page.render({
          canvasContext: context,
          viewport,
        }).promise;

        const mimeType =
          format === "jpeg" ? "image/jpeg" : "image/png";

        const quality = format === "jpeg" ? 0.92 : undefined;

        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (result) => {
              if (result) {
                resolve(result);
              } else {
                reject(new Error("Failed to create image."));
              }
            },
            mimeType,
            quality
          );
        });

        const url = URL.createObjectURL(blob);

        generated.push({
          pageNumber,
          blob,
          url,
          width: canvas.width,
          height: canvas.height,
        });

        const percentage = Math.round(
          ((index + 1) / pages.length) * 100
        );

        setProgress(percentage);

        canvas.width = 1;
        canvas.height = 1;
      }

      setImages(generated);

      setSuccess(
        `${generated.length} ${
          generated.length === 1 ? "page was" : "pages were"
        } converted successfully.`
      );
    } catch (err) {
      console.error(err);

      clearGeneratedImages();

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while converting the PDF."
      );
    } finally {
      setIsProcessing(false);
    }
  }

  function downloadImage(image: GeneratedImage) {
    const extension = format === "jpeg" ? "jpg" : "png";

    downloadBlob(
      image.blob,
      `${getBaseFileName(file?.name || "document")}-page-${image.pageNumber}.${extension}`
    );
  }

  function getBaseFileName(name: string) {
    return name.replace(/\.[^/.]+$/, "");
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
                <FileImage size={19} />
              </div>

              <div>
                <h1 className="text-sm font-semibold text-white">
                  PDF to Images
                </h1>
                <p className="hidden text-[11px] text-slate-500 sm:block">
                  Convert PDF pages into high-quality images
                </p>
              </div>
            </div>
          </div>

          <Link
            href="/dashboard"
            className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs font-medium text-slate-300 transition hover:border-white/20 hover:bg-white/[0.06] sm:flex"
          >
            <FileText size={14} />
            Workspace
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Intro */}
        <div className="mb-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/10 bg-cyan-400/5 px-3 py-1.5 text-[11px] font-medium text-cyan-300">
            <Sparkles size={12} />
            Browser-based conversion
          </div>

          <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Turn PDF pages into images
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Convert selected pages from your PDF into PNG or JPEG images
            directly in your browser. Your document stays on your device.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          {/* Main */}
          <section className="space-y-6">
            {!file ? (
              <label className="group block cursor-pointer">
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  onChange={handleFileChange}
                />

                <div className="flex min-h-[330px] flex-col items-center justify-center rounded-3xl border border-dashed border-white/15 bg-white/[0.025] px-6 text-center transition hover:border-cyan-400/30 hover:bg-cyan-400/[0.02]">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300 transition group-hover:scale-105">
                    <Upload size={27} />
                  </div>

                  <h3 className="mt-6 text-base font-semibold text-white">
                    Upload your PDF
                  </h3>

                  <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                    Click to browse and select a PDF file. You can convert
                    individual pages or the entire document.
                  </p>

                  <span className="mt-6 rounded-xl bg-cyan-400 px-4 py-2.5 text-xs font-semibold text-slate-950 transition group-hover:bg-cyan-300">
                    Choose PDF
                  </span>

                  <p className="mt-4 text-[11px] text-slate-600">
                    Maximum file size: {MAX_FILE_SIZE_MB} MB
                  </p>
                </div>
              </label>
            ) : (
              <>
                {/* Uploaded file */}
                <div className="surface-card rounded-2xl border border-white/10 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-400/10 text-red-300">
                        <FileText size={22} />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">
                          {file.name}
                        </p>

                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
                          <span>{formatFileSize(file.size)}</span>
                          <span>{totalPages} pages</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={resetTool}
                      disabled={isProcessing}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-red-400/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="Remove PDF"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                {/* Settings */}
                <div className="surface-card rounded-2xl border border-white/10 p-5">
                  <div className="mb-5">
                    <h3 className="text-sm font-semibold text-white">
                      Conversion settings
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Choose which pages to export and the image format.
                    </p>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    {/* Pages */}
                    <div>
                      <label className="mb-2 block text-xs font-medium text-slate-300">
                        Pages
                      </label>

                      <input
                        type="text"
                        value={pageRange}
                        onChange={(event) =>
                          setPageRange(event.target.value)
                        }
                        placeholder={`All pages or e.g. 1-3, 5, 8-${Math.min(
                          totalPages || 10,
                          10
                        )}`}
                        disabled={isProcessing}
                        className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/10 disabled:opacity-50"
                      />

                      <p className="mt-2 text-[11px] text-slate-600">
                        Leave empty to convert all {totalPages} pages.
                      </p>
                    </div>

                    {/* Format */}
                    <div>
                      <label className="mb-2 block text-xs font-medium text-slate-300">
                        Image format
                      </label>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setFormat("png")}
                          disabled={isProcessing}
                          className={`rounded-xl border px-3 py-3 text-left transition ${
                            format === "png"
                              ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-300"
                              : "border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.05]"
                          }`}
                        >
                          <div className="text-xs font-semibold">PNG</div>
                          <div className="mt-1 text-[10px] opacity-70">
                            Lossless quality
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setFormat("jpeg")}
                          disabled={isProcessing}
                          className={`rounded-xl border px-3 py-3 text-left transition ${
                            format === "jpeg"
                              ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-300"
                              : "border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.05]"
                          }`}
                        >
                          <div className="text-xs font-semibold">JPEG</div>
                          <div className="mt-1 text-[10px] opacity-70">
                            Smaller file size
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Scale */}
                  <div className="mt-5">
                    <div className="mb-2 flex items-center justify-between">
                      <label className="text-xs font-medium text-slate-300">
                        Image resolution
                      </label>

                      <span className="text-[11px] text-cyan-300">
                        {scale}×
                      </span>
                    </div>

                    <input
                      type="range"
                      min="1"
                      max="2.5"
                      step="0.25"
                      value={scale}
                      onChange={(event) => setScale(event.target.value)}
                      disabled={isProcessing}
                      className="w-full accent-cyan-400 disabled:opacity-50"
                    />

                    <div className="mt-1 flex justify-between text-[10px] text-slate-600">
                      <span>Standard</span>
                      <span>High resolution</span>
                    </div>
                  </div>

                  {/* Convert */}
                  <button
                    type="button"
                    onClick={convertToImages}
                    disabled={isProcessing}
                    className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 size={17} className="animate-spin" />
                        Converting page {currentPage}...
                      </>
                    ) : (
                      <>
                        <ImageIcon size={17} />
                        Convert to Images
                      </>
                    )}
                  </button>

                  {isProcessing && (
                    <div className="mt-4">
                      <div className="mb-2 flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">
                          Processing {selectedPageCount}{" "}
                          {selectedPageCount === 1 ? "page" : "pages"}
                        </span>

                        <span className="font-medium text-cyan-300">
                          {progress}%
                        </span>
                      </div>

                      <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                        <div
                          className="h-full rounded-full bg-cyan-400 transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Messages */}
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

                {/* Generated images */}
                {images.length > 0 && (
                  <div className="surface-card rounded-2xl border border-white/10 p-5">
                    <div className="mb-5 flex items-center justify-between gap-4">
                      <div>
                        <h3 className="text-sm font-semibold text-white">
                          Generated images
                        </h3>
                        <p className="mt-1 text-xs text-slate-500">
                          {images.length}{" "}
                          {images.length === 1 ? "image" : "images"} ready
                          to download
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={clearGeneratedImages}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-[11px] font-medium text-slate-400 transition hover:border-red-400/20 hover:bg-red-400/5 hover:text-red-300"
                      >
                        <Trash2 size={13} />
                        Clear
                      </button>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      {images.map((image) => (
                        <div
                          key={image.pageNumber}
                          className="overflow-hidden rounded-xl border border-white/10 bg-slate-950/50"
                        >
                          <div className="relative flex min-h-[220px] items-center justify-center bg-white/[0.02] p-3">
                            <img
                              src={image.url}
                              alt={`Converted page ${image.pageNumber}`}
                              className="max-h-[330px] max-w-full rounded-lg object-contain shadow-2xl"
                            />

                            <span className="absolute left-3 top-3 rounded-lg border border-white/10 bg-slate-950/80 px-2 py-1 text-[10px] font-medium text-slate-300 backdrop-blur">
                              Page {image.pageNumber}
                            </span>
                          </div>

                          <div className="flex items-center justify-between border-t border-white/10 px-3 py-3">
                            <div>
                              <p className="text-[11px] font-medium text-slate-300">
                                {image.width} × {image.height}
                              </p>
                              <p className="mt-0.5 text-[10px] text-slate-600">
                                {formatFileSize(image.blob.size)}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => downloadImage(image)}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-400/10 px-3 py-2 text-[11px] font-medium text-cyan-300 transition hover:bg-cyan-400/20"
                            >
                              <Download size={13} />
                              Download
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </section>

          {/* Sidebar */}
          <aside className="space-y-4">
            <div className="surface-card rounded-2xl border border-white/10 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
                <ImageIcon size={19} />
              </div>

              <h3 className="mt-4 text-sm font-semibold text-white">
                What you can do
              </h3>

              <ul className="mt-3 space-y-3">
                {[
                  "Convert all PDF pages",
                  "Export selected page ranges",
                  "Choose PNG or JPEG",
                  "Adjust image resolution",
                  "Preview every generated image",
                  "Download individual pages",
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
                <Sparkles size={14} className="text-cyan-300" />
                Privacy first
              </div>

              <p className="mt-2 text-[11px] leading-5 text-slate-600">
                PDF rendering happens directly in your browser. Your file
                is not uploaded to a server by this tool.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}