"use client";

import {
  AlertCircle,
  Check,
  Clipboard,
  Download,
  FileImage,
  Loader2,
  ScanText,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { ChangeEvent, DragEvent, useEffect, useRef, useState } from "react";
import { createWorker } from "tesseract.js";

type OCRLanguage = {
  value: string;
  label: string;
};

const OCR_LANGUAGES: OCRLanguage[] = [
  { value: "eng", label: "English" },
  { value: "hin", label: "Hindi" },
  { value: "fra", label: "French" },
  { value: "deu", label: "German" },
  { value: "spa", label: "Spanish" },
];

const MAX_FILE_SIZE = 20 * 1024 * 1024;

export default function OCRPage() {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [language, setLanguage] = useState("eng");
  const [extractedText, setExtractedText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [copied, setCopied] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [file]);

  const resetMessages = () => {
    setError("");
    setSuccess("");
    setCopied(false);
  };

  const validateFile = (selectedFile: File): boolean => {
    resetMessages();

    if (!selectedFile.type.startsWith("image/")) {
      setError("Please upload a valid image file.");
      return false;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setError("Image size must be 20 MB or smaller.");
      return false;
    }

    return true;
  };

  const handleFile = (selectedFile: File | undefined) => {
    if (!selectedFile) return;

    if (!validateFile(selectedFile)) {
      return;
    }

    setFile(selectedFile);
    setExtractedText("");
    setProgress(0);
    setStatusMessage("");
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    handleFile(event.target.files?.[0]);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);

    handleFile(event.dataTransfer.files?.[0]);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const startOCR = async () => {
    if (!file) {
      setError("Please upload an image first.");
      return;
    }

    resetMessages();
    setIsProcessing(true);
    setProgress(0);
    setStatusMessage("Starting OCR engine...");

    let worker: Awaited<ReturnType<typeof createWorker>> | null = null;

    try {
      worker = await createWorker(language, 1, {
        logger: (message) => {
          if (message.status) {
            setStatusMessage(formatOCRStatus(message.status));
          }

          if (
            typeof message.progress === "number" &&
            Number.isFinite(message.progress)
          ) {
            setProgress(Math.round(message.progress * 100));
          }
        },
      });

      setStatusMessage("Analyzing image...");
      setProgress((current) => Math.max(current, 5));

      const result = await worker.recognize(file);

      const text = result.data.text.trim();

      if (!text) {
        setExtractedText("");
        setError(
          "No readable text was detected in this image. Try a clearer image with better lighting or resolution."
        );
        return;
      }

      setExtractedText(text);
      setProgress(100);
      setStatusMessage("OCR completed successfully.");
      setSuccess("Text extracted successfully from your image.");
    } catch (ocrError) {
      console.error("OCR error:", ocrError);

      setError(
        "OCR could not process this image. Please try another image or check your selected language."
      );
      setStatusMessage("");
      setProgress(0);
    } finally {
      if (worker) {
        try {
          await worker.terminate();
        } catch (terminateError) {
          console.error("Could not terminate OCR worker:", terminateError);
        }
      }

      setIsProcessing(false);
    }
  };

  const formatOCRStatus = (status: string) => {
    const normalized = status.replace(/_/g, " ").trim();

    if (!normalized) {
      return "Processing image...";
    }

    return normalized.charAt(0).toUpperCase() + normalized.slice(1) + "...";
  };

  const copyText = async () => {
    if (!extractedText.trim()) return;

    try {
      await navigator.clipboard.writeText(extractedText);
      setCopied(true);
      setSuccess("Extracted text copied to clipboard.");

      window.setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      setError("Could not copy the text. Please copy it manually.");
    }
  };

  const downloadText = () => {
    if (!extractedText.trim()) {
      setError("There is no extracted text to download.");
      return;
    }

    const blob = new Blob([extractedText], {
      type: "text/plain;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    const originalName = file?.name
      ? file.name.replace(/\.[^/.]+$/, "")
      : "document";

    anchor.href = url;
    anchor.download = `${originalName}-ocr.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    URL.revokeObjectURL(url);

    setSuccess("Extracted text downloaded successfully.");
  };

  const clearAll = () => {
    setFile(null);
    setExtractedText("");
    setProgress(0);
    setStatusMessage("");
    setError("");
    setSuccess("");
    setCopied(false);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const removeImage = () => {
    setFile(null);
    setExtractedText("");
    setProgress(0);
    setStatusMessage("");
    setError("");
    setSuccess("");
    setCopied(false);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const hasText = extractedText.trim().length > 0;

  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <div className="background-grid pointer-events-none fixed inset-0 opacity-30" />

      <div className="relative mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10">
                <ScanText className="h-5 w-5 text-cyan-300" />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">
                  DocuFlow Tool
                </p>

                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  OCR
                </h1>
              </div>
            </div>

            <p className="max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
              Extract editable text from images using optical character
              recognition. Everything is processed directly in your browser.
            </p>
          </div>

          <button
            type="button"
            onClick={clearAll}
            disabled={!file && !extractedText && !error && !success}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:border-white/20 hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 className="h-4 w-4" />
            Clear all
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />

            <div className="min-w-0 flex-1">
              <p className="font-semibold">OCR error</p>
              <p className="mt-1 leading-6 text-red-200/80">{error}</p>
            </div>

            <button
              type="button"
              onClick={() => setError("")}
              className="rounded-lg p-1 text-red-200/70 transition hover:bg-red-400/10 hover:text-red-100"
              aria-label="Dismiss error"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {success && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
            <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />

            <div>
              <p className="font-semibold">Done</p>
              <p className="mt-1 leading-6 text-emerald-200/80">
                {success}
              </p>
            </div>
          </div>
        )}

        {/* Main workspace */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          {/* Left: Image */}
          <section className="surface-card overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035]">
            <div className="border-b border-white/10 px-5 py-4 sm:px-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="font-semibold text-white">Source image</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Upload an image containing readable text
                  </p>
                </div>

                <div className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-300">
                  Max 20 MB
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-6">
              {!file ? (
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => inputRef.current?.click()}
                  className={`group flex min-h-[420px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-6 text-center transition ${
                    isDragging
                      ? "border-cyan-300 bg-cyan-400/10"
                      : "border-white/15 bg-black/10 hover:border-cyan-400/40 hover:bg-cyan-400/[0.04]"
                  }`}
                >
                  <input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 transition group-hover:scale-105 group-hover:bg-cyan-400/15">
                    <Upload className="h-7 w-7 text-cyan-300" />
                  </div>

                  <h3 className="text-lg font-semibold text-white">
                    Drop your image here
                  </h3>

                  <p className="mt-2 max-w-sm text-sm leading-6 text-slate-400">
                    Drag and drop an image, or click to browse your computer.
                    JPG, PNG, WebP and other common image formats are
                    supported.
                  </p>

                  <span className="mt-6 inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300">
                    <FileImage className="h-4 w-4" />
                    Choose image
                  </span>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/30">
                    <div className="flex min-h-[420px] items-center justify-center p-4">
                      {previewUrl && (
                        <img
                          src={previewUrl}
                          alt="Uploaded image for OCR"
                          className="max-h-[500px] max-w-full rounded-xl object-contain"
                        />
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={removeImage}
                      disabled={isProcessing}
                      className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-black/60 text-slate-300 backdrop-blur transition hover:bg-black/80 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label="Remove image"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10">
                        <FileImage className="h-5 w-5 text-cyan-300" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">
                          {file.name}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {formatFileSize(file.size)} · {file.type || "Image"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* OCR controls */}
              <div className="mt-5 rounded-2xl border border-white/10 bg-black/10 p-4">
                <label
                  htmlFor="ocr-language"
                  className="mb-2 block text-sm font-medium text-slate-200"
                >
                  Text language
                </label>

                <select
                  id="ocr-language"
                  value={language}
                  onChange={(event) => setLanguage(event.target.value)}
                  disabled={isProcessing}
                  className="w-full rounded-xl border border-white/10 bg-[#0b1120] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {OCR_LANGUAGES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>

                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Choose the language that appears in the image for better
                  recognition accuracy.
                </p>
              </div>

              {/* Progress */}
              {isProcessing && (
                <div className="mt-5 rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.04] p-4">
                  <div className="mb-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-cyan-300" />
                      <span className="text-sm font-medium text-slate-200">
                        {statusMessage || "Processing..."}
                      </span>
                    </div>

                    <span className="text-sm font-semibold text-cyan-300">
                      {progress}%
                    </span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-cyan-400 transition-all duration-300"
                      style={{
                        width: `${Math.max(2, progress)}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={startOCR}
                disabled={!file || isProcessing}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-3.5 text-sm font-bold text-slate-950 shadow-[0_0_30px_rgba(34,211,238,0.12)] transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Extracting text...
                  </>
                ) : (
                  <>
                    <ScanText className="h-4 w-4" />
                    Extract text
                  </>
                )}
              </button>
            </div>
          </section>

          {/* Right: Result */}
          <section className="surface-card overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035]">
            <div className="border-b border-white/10 px-5 py-4 sm:px-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-semibold text-white">Extracted text</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Review, edit, copy, or download your OCR result
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={copyText}
                    disabled={!hasText || isProcessing}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-emerald-300" />
                    ) : (
                      <Clipboard className="h-4 w-4" />
                    )}
                    {copied ? "Copied" : "Copy"}
                  </button>

                  <button
                    type="button"
                    onClick={downloadText}
                    disabled={!hasText || isProcessing}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </button>
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-6">
              <textarea
                value={extractedText}
                onChange={(event) => setExtractedText(event.target.value)}
                placeholder={
                  isProcessing
                    ? "OCR is extracting text..."
                    : "Your extracted text will appear here..."
                }
                disabled={isProcessing}
                className="min-h-[520px] w-full resize-y rounded-2xl border border-white/10 bg-[#080d1b] p-5 text-sm leading-7 text-slate-200 outline-none placeholder:text-slate-600 transition focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-70"
              />

              <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Sparkles className="h-4 w-4 text-cyan-300" />

                  <span>
                    {hasText
                      ? `${countWords(extractedText)} words · ${extractedText.length} characters`
                      : "No extracted text yet"}
                  </span>
                </div>

                {hasText && (
                  <span className="text-xs text-emerald-300">
                    Text is editable
                  </span>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* How it works */}
        <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.025] p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-400/10">
              <Sparkles className="h-5 w-5 text-violet-300" />
            </div>

            <div>
              <h2 className="font-semibold text-white">How OCR works</h2>
              <p className="mt-1 text-xs text-slate-500">
                Turn text inside images into editable digital content
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <InfoCard
              number="01"
              title="Upload"
              description="Choose an image containing printed or handwritten text."
            />

            <InfoCard
              number="02"
              title="Recognize"
              description="Tesseract analyzes the image and identifies the characters it can read."
            />

            <InfoCard
              number="03"
              title="Use the text"
              description="Edit the extracted result, copy it, or download it as a text file."
            />
          </div>
        </section>

        {/* Privacy note */}
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-400/10">
            <ScanText className="h-4 w-4 text-cyan-300" />
          </div>

          <div>
            <p className="text-sm font-medium text-slate-200">
              Browser-side processing
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              OCR processing is performed in your browser using Tesseract.js.
              The uploaded image is not sent to your DocuFlow server by this
              page.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

function InfoCard({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-bold tracking-[0.2em] text-cyan-300">
          {number}
        </span>

        <div className="h-px w-12 bg-white/10" />
      </div>

      <h3 className="text-sm font-semibold text-white">{title}</h3>

      <p className="mt-2 text-xs leading-5 text-slate-500">{description}</p>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function countWords(text: string): number {
  const trimmed = text.trim();

  if (!trimmed) {
    return 0;
  }

  return trimmed.split(/\s+/).length;
}