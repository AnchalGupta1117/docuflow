"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  FileArchive,
  Loader2,
  Sparkles,
  Trash2,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";
import UploadZone from "@/components/UploadZone";
import { formatFileSize } from "@/lib/utils";

type CompressionLevel = "low" | "balanced" | "high" | "maximum";

interface CompressionResult {
  blob: Blob;
  filename?: string;
  originalSize?: number;
  compressedSize?: number;
  savings?: number;
  format?: string;
}

export default function CompressPdfPage() {
  const [file, setFile] = useState<File | null>(null);

  const [compressionLevel, setCompressionLevel] =
    useState<CompressionLevel>("balanced");

  const [isCompressing, setIsCompressing] = useState(false);

  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");

  const [compressedBlob, setCompressedBlob] =
    useState<Blob | null>(null);

  const [compressedSize, setCompressedSize] =
    useState<number | null>(null);

  const [reduction, setReduction] =
    useState<number | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);

    setCompressedBlob(null);
    setCompressedSize(null);
    setReduction(null);

    setError("");
    setSuccess("");
    setProgress(0);
    setProgressMessage("");
  };

  const handleRemove = () => {
    setFile(null);

    setCompressedBlob(null);
    setCompressedSize(null);
    setReduction(null);

    setError("");
    setSuccess("");
    setProgress(0);
    setProgressMessage("");
  };

  const handleCompress = async () => {
    if (!file) {
      setError("Please select a PDF first.");
      return;
    }

    setIsCompressing(true);

    setError("");
    setSuccess("");

    setCompressedBlob(null);
    setCompressedSize(null);
    setReduction(null);

    setProgress(0);
    setProgressMessage("Preparing PDF...");

    try {
      /*
       * Import only in the browser.
       *
       * @fileslim/compress performs PDF image extraction
       * and recompression in the browser.
       */
      const { compressPDF } = await import(
        "@fileslim/compress"
      );

      setProgressMessage("Analyzing PDF images...");

      const qualityMap: Record<
        CompressionLevel,
        number
      > = {
        low: 0.85,
        balanced: 0.7,
        high: 0.5,
        maximum: 0.3,
      };

      const dimensionMap: Record<
        CompressionLevel,
        number
      > = {
        low: 2000,
        balanced: 1600,
        high: 1200,
        maximum: 1000,
      };

      const result = await compressPDF(file, {
        mode: compressionLevel,

        imageQuality:
          qualityMap[compressionLevel],

        maxImageDimension:
          dimensionMap[compressionLevel],

        stripMetadata: true,

        onProgress: (
          phase: string,
          percent: number
        ) => {
          const safeProgress = Math.max(
            0,
            Math.min(100, Math.round(percent || 0))
          );

          setProgress(safeProgress);

          switch (phase) {
            case "analyzing":
              setProgressMessage(
                "Analyzing PDF images..."
              );
              break;

            case "extracting":
              setProgressMessage(
                "Extracting embedded images..."
              );
              break;

            case "processing":
              setProgressMessage(
                "Recompressing images..."
              );
              break;

            case "rebuilding":
              setProgressMessage(
                "Rebuilding PDF..."
              );
              break;

            case "saving":
              setProgressMessage(
                "Saving optimized PDF..."
              );
              break;

            default:
              setProgressMessage(
                phase || "Compressing PDF..."
              );
          }
        },
      });

      if (!result || !result.blob) {
        throw new Error(
          "The compression engine did not return a PDF."
        );
      }

      const outputBlob = result.blob;

      /*
       * Never give the user a larger file as
       * the "compressed" result.
       */
      if (outputBlob.size >= file.size) {
        setProgress(100);
        setProgressMessage(
          "PDF analysis complete."
        );

        setSuccess(
          "This PDF is already well optimized. No smaller version was produced without unnecessary changes."
        );

        setCompressedBlob(null);
        setCompressedSize(file.size);
        setReduction(0);

        return;
      }

      const bytesSaved =
        file.size - outputBlob.size;

      const percentageSaved =
        (bytesSaved / file.size) * 100;

      setCompressedBlob(outputBlob);
      setCompressedSize(outputBlob.size);
      setReduction(percentageSaved);

      setProgress(100);
      setProgressMessage(
        "Compression complete."
      );

      setSuccess(
        `PDF compressed successfully. ${percentageSaved.toFixed(
          1
        )}% smaller.`
      );
    } catch (compressionError) {
      console.error(
        "DocuFlow compression error:",
        compressionError
      );

      if (compressionError instanceof Error) {
        setError(
          compressionError.message ||
            "The PDF could not be compressed."
        );
      } else {
        setError(
          "The PDF compression engine could not process this document."
        );
      }

      setProgress(0);
      setProgressMessage("");
    } finally {
      setIsCompressing(false);
    }
  };

  const handleDownload = () => {
    if (!compressedBlob || !file) {
      return;
    }

    const url =
      URL.createObjectURL(compressedBlob);

    const anchor =
      document.createElement("a");

    anchor.href = url;

    anchor.download = file.name.replace(
      /\.pdf$/i,
      "-compressed.pdf"
    );

    document.body.appendChild(anchor);

    anchor.click();

    anchor.remove();

    URL.revokeObjectURL(url);
  };

  const compressionOptions = [
    {
      id: "low" as const,
      title: "Less Compression",
      subtitle: "Light",
      description:
        "Gentle optimization with minimal image quality change.",
    },
    {
      id: "balanced" as const,
      title: "Recommended",
      subtitle: "Balanced",
      description:
        "Good reduction while maintaining strong visual quality.",
    },
    {
      id: "high" as const,
      title: "High Compression",
      subtitle: "Aggressive",
      description:
        "Smaller files with more noticeable image compression.",
    },
    {
      id: "maximum" as const,
      title: "Extreme Compression",
      subtitle: "Maximum",
      description:
        "Strongest reduction. Image quality can decrease.",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-white/10 bg-slate-950/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm font-medium text-slate-300 transition hover:text-white"
          >
            <ArrowLeft size={17} />
            Back to Dashboard
          </Link>

          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
              <FileArchive size={18} />
            </div>

            <div>
              <p className="text-sm font-semibold text-white">
                Compress PDF
              </p>

              <p className="text-[11px] text-slate-500">
                Reduce file size
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <section className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/15 bg-cyan-400/5 px-3 py-1 text-xs text-cyan-300">
            <Sparkles size={13} />
            Smart PDF compression
          </div>

          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Compress your PDF
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
            Reduce PDF size by optimizing embedded images while
            keeping the document structure intact.
          </p>
        </div>

        {/* Upload */}
        {!file && (
          <div className="surface-card rounded-3xl border border-white/10 bg-white/[0.02] p-6">
            <UploadZone
              onFileSelect={handleFileSelect}
              acceptedTypes={[
                "application/pdf",
              ]}
              maxSizeMB={50}
              multiple={false}
              title="Drop your PDF here"
              description="PDF files up to 50 MB"
            />
          </div>
        )}

        {file && (
          <div className="space-y-6">
            {/* Selected file */}
            <div className="surface-card rounded-2xl border border-white/10 bg-white/[0.025] p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
                    <FileArchive size={22} />
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">
                      {file.name}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>

                {!isCompressing && (
                  <button
                    type="button"
                    onClick={handleRemove}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-medium text-slate-300 transition hover:border-red-400/20 hover:bg-red-400/5 hover:text-red-300"
                  >
                    <Trash2 size={14} />
                    Remove
                  </button>
                )}
              </div>
            </div>

            {/* Compression options */}
            <div>
              <div className="mb-3">
                <h2 className="text-sm font-semibold text-white">
                  Compression level
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Choose the balance between file size and image
                  quality.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {compressionOptions.map(
                  (option) => {
                    const selected =
                      compressionLevel ===
                      option.id;

                    return (
                      <button
                        key={option.id}
                        type="button"
                        disabled={isCompressing}
                        onClick={() =>
                          setCompressionLevel(
                            option.id
                          )
                        }
                        className={`relative rounded-2xl border p-4 text-left transition ${
                          selected
                            ? "border-cyan-400/40 bg-cyan-400/[0.07]"
                            : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.035]"
                        } ${
                          isCompressing
                            ? "cursor-not-allowed opacity-60"
                            : ""
                        }`}
                      >
                        {option.id ===
                          "balanced" && (
                          <span className="absolute right-3 top-3 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-cyan-300">
                            Best
                          </span>
                        )}

                        <div className="flex items-center gap-3">
                          <div
                            className={`h-4 w-4 rounded-full border ${
                              selected
                                ? "border-cyan-300 bg-cyan-300"
                                : "border-slate-600"
                            }`}
                          />

                          <div>
                            <p className="text-sm font-semibold text-white">
                              {option.title}
                            </p>

                            <p className="mt-0.5 text-[11px] text-cyan-300">
                              {option.subtitle}
                            </p>
                          </div>
                        </div>

                        <p className="mt-4 text-xs leading-5 text-slate-500">
                          {option.description}
                        </p>
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            {/* Compress */}
            {!compressedBlob &&
              !isCompressing && (
                <button
                  type="button"
                  onClick={handleCompress}
                  className="w-full rounded-2xl bg-cyan-400 px-5 py-3.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 active:scale-[0.99]"
                >
                  Compress PDF
                </button>
              )}

            {/* Progress */}
            {isCompressing && (
              <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.04] p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Loader2
                      size={18}
                      className="animate-spin text-cyan-300"
                    />

                    <div>
                      <p className="text-sm font-medium text-white">
                        Compressing PDF...
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {progressMessage ||
                          "Processing..."}
                      </p>
                    </div>
                  </div>

                  <span className="text-sm font-semibold text-cyan-300">
                    {progress}%
                  </span>
                </div>

                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full bg-cyan-400 transition-all duration-300"
                    style={{
                      width: `${progress}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="rounded-2xl border border-red-400/20 bg-red-400/[0.06] p-5">
                <div className="flex gap-3">
                  <AlertCircle
                    size={19}
                    className="mt-0.5 shrink-0 text-red-300"
                  />

                  <div>
                    <p className="text-sm font-semibold text-red-200">
                      Compression failed
                    </p>

                    <p className="mt-2 break-words text-xs leading-5 text-red-200/70">
                      {error}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Success */}
            {success &&
              !isCompressing && (
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.05] p-5">
                  <div className="flex gap-3">
                    <CheckCircle2
                      size={19}
                      className="mt-0.5 shrink-0 text-emerald-300"
                    />

                    <div>
                      <p className="text-sm font-semibold text-emerald-200">
                        Compression complete
                      </p>

                      <p className="mt-2 text-xs leading-5 text-emerald-200/70">
                        {success}
                      </p>
                    </div>
                  </div>
                </div>
              )}

            {/* Result */}
            {compressedBlob &&
              compressedSize !== null && (
                <div className="rounded-3xl border border-white/10 bg-white/[0.025] p-6">
                  <div className="mb-5">
                    <h2 className="text-lg font-semibold text-white">
                      Compression result
                    </h2>

                    <p className="mt-1 text-xs text-slate-500">
                      Text and vector content remain intact.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-white/5 bg-white/[0.025] p-4">
                      <p className="text-[11px] uppercase tracking-wider text-slate-500">
                        Original
                      </p>

                      <p className="mt-2 text-lg font-semibold text-white">
                        {formatFileSize(
                          file.size
                        )}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/5 bg-white/[0.025] p-4">
                      <p className="text-[11px] uppercase tracking-wider text-slate-500">
                        Compressed
                      </p>

                      <p className="mt-2 text-lg font-semibold text-cyan-300">
                        {formatFileSize(
                          compressedSize
                        )}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-emerald-400/10 bg-emerald-400/[0.04] p-4">
                      <p className="text-[11px] uppercase tracking-wider text-emerald-300/70">
                        Reduction
                      </p>

                      <p className="mt-2 text-lg font-semibold text-emerald-300">
                        {reduction?.toFixed(
                          1
                        )}
                        %
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleDownload}
                    className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-5 py-3.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 active:scale-[0.99]"
                  >
                    <Download size={17} />
                    Download Compressed PDF
                  </button>
                </div>
              )}

            {/* Information */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
                    <ShieldCheck size={17} />
                  </div>

                  <p className="text-sm font-semibold text-white">
                    No full-page rasterization
                  </p>
                </div>

                <p className="mt-3 text-xs leading-5 text-slate-500">
                  DocuFlow does not turn every PDF page into a
                  JPEG screenshot. Embedded images are optimized
                  individually while text and vector content stay
                  intact.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
                    <FileArchive size={17} />
                  </div>

                  <p className="text-sm font-semibold text-white">
                    Smart output
                  </p>
                </div>

                <p className="mt-3 text-xs leading-5 text-slate-500">
                  Images are replaced only when the optimized
                  version is smaller, helping prevent accidental
                  file-size increases.
                </p>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}