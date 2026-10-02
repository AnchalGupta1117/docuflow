"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CheckCircle2,
  Download,
  FileText,
  GripVertical,
  Info,
  Loader2,
  Merge,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { PDFDocument } from "pdf-lib";

import UploadZone from "@/components/UploadZone";
import { downloadBlob, formatFileSize } from "@/lib/utils";

interface PDFFile {
  id: string;
  file: File;
}

export default function MergePDFPage() {
  const [files, setFiles] = useState<PDFFile[]>([]);
  const [isMerging, setIsMerging] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState("");

  const totalSize = useMemo(() => {
    return files.reduce((total, item) => total + item.file.size, 0);
  }, [files]);

  const handleFiles = (selectedFiles: File[]) => {
    const newFiles = selectedFiles.map((file, index) => ({
      id: `${Date.now()}-${index}-${file.name}`,
      file,
    }));

    setFiles((previous) => [...previous, ...newFiles]);
    setError("");
    setDownloadUrl(null);
  };

  const removeFile = (id: string) => {
    setFiles((previous) =>
      previous.filter((item) => item.id !== id)
    );

    setDownloadUrl(null);
  };

  const moveFile = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;

    if (newIndex < 0 || newIndex >= files.length) {
      return;
    }

    const reordered = [...files];
    const [movedFile] = reordered.splice(index, 1);

    reordered.splice(newIndex, 0, movedFile);

    setFiles(reordered);
    setDownloadUrl(null);
  };

  const clearFiles = () => {
    setFiles([]);
    setError("");
    setDownloadUrl(null);
  };

  const mergePDFs = async () => {
    if (files.length < 2) {
      setError("Please add at least two PDF files to merge.");
      return;
    }

    setIsMerging(true);
    setError("");
    setDownloadUrl(null);

    try {
      const mergedPdf = await PDFDocument.create();

      for (const item of files) {
        const fileBytes = await item.file.arrayBuffer();
        const sourcePdf = await PDFDocument.load(fileBytes);

        const pages = await mergedPdf.copyPages(
          sourcePdf,
          sourcePdf.getPageIndices()
        );

        pages.forEach((page) => {
          mergedPdf.addPage(page);
        });
      }

      const mergedBytes = await mergedPdf.save();

      const blob = new Blob([mergedBytes], {
        type: "application/pdf",
      });

      const url = URL.createObjectURL(blob);

      setDownloadUrl(url);
    } catch (mergeError) {
      console.error("PDF merge failed:", mergeError);

      setError(
        "Unable to merge these PDFs. Make sure all selected files are valid PDF documents."
      );
    } finally {
      setIsMerging(false);
    }
  };

  const downloadMergedPDF = () => {
    if (!downloadUrl) {
      return;
    }

    fetch(downloadUrl)
      .then((response) => response.blob())
      .then((blob) => {
        downloadBlob(blob, "docuflow-merged.pdf");
      })
      .catch(() => {
        setError("Unable to download the merged PDF.");
      });
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.025] text-slate-400 transition hover:bg-white/[0.05] hover:text-white"
              aria-label="Back to dashboard"
            >
              <ArrowLeft size={17} />
            </Link>

            <div className="h-6 w-px bg-white/10" />

            <Link
              href="/"
              className="flex items-center gap-2.5"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-400 text-slate-950">
                <FileText size={17} strokeWidth={2.5} />
              </div>

              <span className="text-lg font-bold tracking-tight">
                Docu<span className="text-cyan-400">Flow</span>
              </span>
            </Link>
          </div>

          <Link
            href="/dashboard"
            className="text-xs font-medium text-slate-500 transition hover:text-slate-200"
          >
            Workspace
          </Link>
        </div>
      </header>

      {/* Main */}
      <div className="mx-auto max-w-5xl px-6 py-10 lg:px-8 lg:py-14">
        {/* Heading */}
        <section className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300">
            <Merge size={25} />
          </div>

          <p className="mt-5 text-xs font-medium uppercase tracking-[0.2em] text-cyan-400">
            PDF Tool
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Merge PDF files
          </h1>

          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500">
            Combine multiple PDF documents into a single file. Arrange
            the documents in the order you want before merging.
          </p>
        </section>

        {/* Upload */}
        <section className="mt-10">
          <UploadZone
            multiple
            maxSizeMB={50}
            title="Drop PDF files here"
            description="or click to browse from your computer"
            onFileSelect={(file) => handleFiles([file])}
          />
        </section>

        {/* Selected Files */}
        {files.length > 0 && (
          <section className="mt-8">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-cyan-400">
                  Selected files
                </p>

                <h2 className="mt-1 text-lg font-semibold text-white">
                  Arrange your documents
                </h2>

                <p className="mt-1 text-xs text-slate-600">
                  {files.length}{" "}
                  {files.length === 1 ? "file" : "files"} ·{" "}
                  {formatFileSize(totalSize)}
                </p>
              </div>

              <button
                type="button"
                onClick={clearFiles}
                className="inline-flex items-center gap-1.5 self-start rounded-lg px-2.5 py-2 text-xs text-slate-500 transition hover:bg-white/[0.04] hover:text-red-300 sm:self-auto"
              >
                <X size={14} />
                Clear all
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {files.map((item, index) => (
                <div
                  key={item.id}
                  className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.025] p-4 transition hover:border-white/15 hover:bg-white/[0.04]"
                >
                  <div className="hidden text-slate-700 sm:block">
                    <GripVertical size={17} />
                  </div>

                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-400/10 text-red-300">
                    <FileText size={20} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-200">
                      {item.file.name}
                    </p>

                    <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-600">
                      <span>Position {index + 1}</span>
                      <span className="h-1 w-1 rounded-full bg-slate-700" />
                      <span>{formatFileSize(item.file.size)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => moveFile(index, "up")}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition hover:bg-white/[0.05] hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-20"
                      aria-label={`Move ${item.file.name} up`}
                    >
                      <ArrowUp size={15} />
                    </button>

                    <button
                      type="button"
                      disabled={index === files.length - 1}
                      onClick={() => moveFile(index, "down")}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition hover:bg-white/[0.05] hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-20"
                      aria-label={`Move ${item.file.name} down`}
                    >
                      <ArrowDown size={15} />
                    </button>

                    <button
                      type="button"
                      onClick={() => removeFile(item.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition hover:bg-red-400/10 hover:text-red-300"
                      aria-label={`Remove ${item.file.name}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Error */}
        {error && (
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-red-400/15 bg-red-400/[0.04] p-4">
            <Info
              size={17}
              className="mt-0.5 shrink-0 text-red-300"
            />

            <div>
              <p className="text-xs font-medium text-red-200">
                Something went wrong
              </p>

              <p className="mt-1 text-xs leading-5 text-red-300/70">
                {error}
              </p>
            </div>
          </div>
        )}

        {/* Success */}
        {downloadUrl && (
          <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.04] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-300">
                <CheckCircle2 size={18} />
              </div>

              <div>
                <p className="text-sm font-semibold text-emerald-200">
                  PDF merged successfully
                </p>

                <p className="mt-1 text-xs text-emerald-300/60">
                  Your combined document is ready to download.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={downloadMergedPDF}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-2.5 text-xs font-semibold text-slate-950 transition hover:bg-emerald-300"
            >
              <Download size={15} />
              Download PDF
            </button>
          </div>
        )}

        {/* Action */}
        <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:flex-row">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-300">
              <Merge size={17} />
            </div>

            <div>
              <p className="text-xs font-medium text-slate-300">
                Ready to merge?
              </p>

              <p className="mt-0.5 text-[11px] text-slate-600">
                {files.length < 2
                  ? "Add at least two PDF files."
                  : `${files.length} PDFs will be combined in the selected order.`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={mergePDFs}
            disabled={files.length < 2 || isMerging}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-400/10 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-35 sm:w-auto"
          >
            {isMerging ? (
              <>
                <Loader2 size={17} className="animate-spin" />
                Merging...
              </>
            ) : (
              <>
                <Merge size={17} />
                Merge PDFs
              </>
            )}
          </button>
        </div>

        {/* Information */}
        <section className="mt-10 grid gap-4 sm:grid-cols-3">
          <InfoCard
            icon={Upload}
            title="1. Upload"
            description="Select two or more PDF files from your computer."
          />

          <InfoCard
            icon={ArrowDown}
            title="2. Arrange"
            description="Move files up or down to choose the final order."
          />

          <InfoCard
            icon={Download}
            title="3. Download"
            description="Merge the files and download your new PDF."
          />
        </section>

        {/* Footer */}
        <footer className="mt-14 border-t border-white/10 pt-6">
          <div className="flex flex-col items-center justify-between gap-3 text-xs text-slate-700 sm:flex-row">
            <p>
              DocuFlow · PDF tools for your document workspace
            </p>

            <Link
              href="/dashboard"
              className="text-slate-600 transition hover:text-slate-300"
            >
              Back to workspace
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
}

function InfoCard({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Upload;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.04] text-slate-400">
        <Icon size={17} />
      </div>

      <h3 className="mt-4 text-xs font-semibold text-slate-200">
        {title}
      </h3>

      <p className="mt-1.5 text-[11px] leading-5 text-slate-600">
        {description}
      </p>
    </div>
  );
}