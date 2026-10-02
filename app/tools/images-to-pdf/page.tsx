"use client";

import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Download,
  FileImage,
  FilePlus2,
  GripVertical,
  Image as ImageIcon,
  Loader2,
  RotateCcw,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { PDFDocument } from "pdf-lib";

import {
  downloadBlob,
  formatFileSize,
  getFileExtension,
  getFileNameWithoutExtension,
  isImageFile,
} from "@/lib/utils";

interface ImageItem {
  id: string;
  file: File;
  previewUrl: string;
}

type PageSize = "fit" | "a4" | "letter";
type Orientation = "auto" | "portrait" | "landscape";

const MAX_FILES = 50;
const MAX_FILE_SIZE_MB = 20;

function createItemId() {
  return `image-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function getImageDimensions(
  image: HTMLImageElement
): { width: number; height: number } {
  return {
    width: image.naturalWidth,
    height: image.naturalHeight,
  };
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Unable to read ${file.name}.`));
    };

    image.src = url;
  });
}

function getPageDimensions(
  pageSize: PageSize,
  orientation: Orientation,
  imageWidth: number,
  imageHeight: number
) {
  if (pageSize === "fit") {
    const maxDimension = 595;

    if (imageWidth >= imageHeight) {
      return {
        width: maxDimension,
        height: (imageHeight / imageWidth) * maxDimension,
      };
    }

    return {
      width: (imageWidth / imageHeight) * maxDimension,
      height: maxDimension,
    };
  }

  let width = pageSize === "a4" ? 595.28 : 612;
  let height = pageSize === "a4" ? 841.89 : 792;

  if (orientation === "landscape") {
    [width, height] = [height, width];
  }

  if (orientation === "auto") {
    const imageIsLandscape = imageWidth > imageHeight;
    const pageIsLandscape = width > height;

    if (imageIsLandscape !== pageIsLandscape) {
      [width, height] = [height, width];
    }
  }

  return { width, height };
}

export default function ImagesToPdfPage() {
  const [items, setItems] = useState<ImageItem[]>([]);
  const [pageSize, setPageSize] = useState<PageSize>("fit");
  const [orientation, setOrientation] =
    useState<Orientation>("auto");

  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const totalSize = useMemo(
    () => items.reduce((total, item) => total + item.file.size, 0),
    [items]
  );

  function addFiles(files: FileList | File[]) {
    setError("");
    setSuccess("");

    const incomingFiles = Array.from(files);

    if (items.length + incomingFiles.length > MAX_FILES) {
      setError(`You can add up to ${MAX_FILES} images at a time.`);
      return;
    }

    const validFiles: File[] = [];

    for (const file of incomingFiles) {
      if (!isImageFile(file)) {
        setError(`${file.name} is not a supported image file.`);
        continue;
      }

      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        setError(
          `${file.name} is larger than ${MAX_FILE_SIZE_MB} MB.`
        );
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    const newItems = validFiles.map((file) => ({
      id: createItemId(),
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setItems((current) => [...current, ...newItems]);
  }

  function handleInputChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    if (event.target.files) {
      addFiles(event.target.files);
    }

    event.target.value = "";
  }

  function removeItem(id: string) {
    setItems((current) => {
      const item = current.find((entry) => entry.id === id);

      if (item) {
        URL.revokeObjectURL(item.previewUrl);
      }

      return current.filter((entry) => entry.id !== id);
    });

    setSuccess("");
  }

  function clearAll() {
    items.forEach((item) => URL.revokeObjectURL(item.previewUrl));

    setItems([]);
    setProgress(0);
    setError("");
    setSuccess("");
  }

  function moveItem(index: number, direction: "up" | "down") {
    const targetIndex =
      direction === "up" ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= items.length) {
      return;
    }

    setItems((current) => {
      const updated = [...current];

      [updated[index], updated[targetIndex]] = [
        updated[targetIndex],
        updated[index],
      ];

      return updated;
    });
  }

  async function createPdf() {
    if (items.length === 0) {
      setError("Please add at least one image.");
      return;
    }

    setError("");
    setSuccess("");
    setIsGenerating(true);
    setProgress(0);

    try {
      const pdfDoc = await PDFDocument.create();

      for (let index = 0; index < items.length; index++) {
        const item = items[index];

        const image = await loadImage(item.file);
        const { width: imageWidth, height: imageHeight } =
          getImageDimensions(image);

        const { width: pageWidth, height: pageHeight } =
          getPageDimensions(
            pageSize,
            orientation,
            imageWidth,
            imageHeight
          );

        const page = pdfDoc.addPage([
          pageWidth,
          pageHeight,
        ]);

        const extension = getFileExtension(item.file.name);

        let embeddedImage;

        if (
          extension === "jpg" ||
          extension === "jpeg" ||
          item.file.type === "image/jpeg"
        ) {
          const buffer = await item.file.arrayBuffer();

          embeddedImage = await pdfDoc.embedJpg(buffer);
        } else {
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");

          if (!context) {
            throw new Error(
              `Unable to process ${item.file.name}.`
            );
          }

          canvas.width = imageWidth;
          canvas.height = imageHeight;

          context.drawImage(
            image,
            0,
            0,
            imageWidth,
            imageHeight
          );

          const pngBlob = await new Promise<Blob>(
            (resolve, reject) => {
              canvas.toBlob(
                (blob) => {
                  if (blob) {
                    resolve(blob);
                  } else {
                    reject(
                      new Error(
                        `Unable to process ${item.file.name}.`
                      )
                    );
                  }
                },
                "image/png"
              );
            }
          );

          const pngBuffer = await pngBlob.arrayBuffer();

          embeddedImage = await pdfDoc.embedPng(pngBuffer);

          canvas.width = 1;
          canvas.height = 1;
        }

        const imageRatio = imageWidth / imageHeight;
        const pageRatio = pageWidth / pageHeight;

        let drawWidth: number;
        let drawHeight: number;

        if (imageRatio > pageRatio) {
          drawWidth = pageWidth;
          drawHeight = pageWidth / imageRatio;
        } else {
          drawHeight = pageHeight;
          drawWidth = pageHeight * imageRatio;
        }

        const x = (pageWidth - drawWidth) / 2;
        const y = (pageHeight - drawHeight) / 2;

        page.drawImage(embeddedImage, {
          x,
          y,
          width: drawWidth,
          height: drawHeight,
        });

        setProgress(
          Math.round(((index + 1) / items.length) * 100)
        );
      }

      const pdfBytes = await pdfDoc.save();

      const blob = new Blob([pdfBytes], {
        type: "application/pdf",
      });

      const baseName =
        items.length === 1
          ? getFileNameWithoutExtension(items[0].file.name)
          : "docuflow-images";

      downloadBlob(blob, `${baseName}.pdf`);

      setSuccess(
        `PDF created successfully from ${items.length} ${
          items.length === 1 ? "image" : "images"
        }.`
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while creating the PDF."
      );
    } finally {
      setIsGenerating(false);
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
                <FilePlus2 size={19} />
              </div>

              <div>
                <h1 className="text-sm font-semibold text-white">
                  Images to PDF
                </h1>
                <p className="hidden text-[11px] text-slate-500 sm:block">
                  Combine images into a single PDF
                </p>
              </div>
            </div>
          </div>

          <Link
            href="/dashboard"
            className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs font-medium text-slate-300 transition hover:border-white/20 hover:bg-white/[0.06] sm:flex"
          >
            <ImageIcon size={14} />
            Workspace
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Intro */}
        <div className="mb-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/10 bg-cyan-400/5 px-3 py-1.5 text-[11px] font-medium text-cyan-300">
            <Sparkles size={12} />
            Client-side PDF creation
          </div>

          <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Turn your images into a PDF
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Add photos, screenshots, scanned pages, or other images,
            arrange them in the order you want, and create a single PDF.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Main */}
          <section className="space-y-6">
            {/* Upload */}
            <label className="group block cursor-pointer">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
                multiple
                className="hidden"
                onChange={handleInputChange}
                disabled={isGenerating}
              />

              <div className="flex min-h-[190px] flex-col items-center justify-center rounded-3xl border border-dashed border-white/15 bg-white/[0.025] px-6 text-center transition hover:border-cyan-400/30 hover:bg-cyan-400/[0.02]">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300 transition group-hover:scale-105">
                  <FileImage size={25} />
                </div>

                <h3 className="mt-5 text-sm font-semibold text-white">
                  Add images
                </h3>

                <p className="mt-2 text-xs text-slate-500">
                  Select one or multiple JPG, PNG, WebP, or GIF files
                </p>

                <span className="mt-5 rounded-xl bg-cyan-400 px-4 py-2.5 text-xs font-semibold text-slate-950 transition group-hover:bg-cyan-300">
                  Choose images
                </span>

                <p className="mt-3 text-[10px] text-slate-600">
                  Up to {MAX_FILES} images · {MAX_FILE_SIZE_MB} MB each
                </p>
              </div>
            </label>

            {/* File list */}
            {items.length > 0 && (
              <div className="surface-card rounded-2xl border border-white/10 p-5">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      PDF pages
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      {items.length}{" "}
                      {items.length === 1 ? "image" : "images"} ·{" "}
                      {formatFileSize(totalSize)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={clearAll}
                    disabled={isGenerating}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-[11px] font-medium text-slate-400 transition hover:border-red-400/20 hover:bg-red-400/5 hover:text-red-300 disabled:opacity-40"
                  >
                    <Trash2 size={13} />
                    Clear all
                  </button>
                </div>

                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div
                      key={item.id}
                      className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3"
                    >
                      <GripVertical
                        size={16}
                        className="shrink-0 text-slate-700"
                      />

                      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-white/[0.03]">
                        <img
                          src={item.previewUrl}
                          alt={`Page ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-md bg-cyan-400/10 px-1.5 text-[10px] font-semibold text-cyan-300">
                            {index + 1}
                          </span>

                          <p className="truncate text-xs font-medium text-slate-300">
                            {item.file.name}
                          </p>
                        </div>

                        <p className="mt-1 text-[10px] text-slate-600">
                          {formatFileSize(item.file.size)}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveItem(index, "up")}
                          disabled={
                            index === 0 || isGenerating
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/5 text-slate-500 transition hover:bg-cyan-400/10 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-20"
                          aria-label="Move image up"
                        >
                          <ArrowUp size={14} />
                        </button>

                        <button
                          type="button"
                          onClick={() => moveItem(index, "down")}
                          disabled={
                            index === items.length - 1 ||
                            isGenerating
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/5 text-slate-500 transition hover:bg-cyan-400/10 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-20"
                          aria-label="Move image down"
                        >
                          <ArrowDown size={14} />
                        </button>

                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          disabled={isGenerating}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/5 text-slate-500 transition hover:bg-red-400/10 hover:text-red-300 disabled:opacity-30"
                          aria-label={`Remove ${item.file.name}`}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Settings */}
            {items.length > 0 && (
              <div className="surface-card rounded-2xl border border-white/10 p-5">
                <div className="mb-5">
                  <h3 className="text-sm font-semibold text-white">
                    PDF settings
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    Choose how each image should be placed on its PDF page.
                  </p>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  {/* Page size */}
                  <div>
                    <label className="mb-2 block text-xs font-medium text-slate-300">
                      Page size
                    </label>

                    <div className="space-y-2">
                      {[
                        {
                          value: "fit" as PageSize,
                          title: "Fit to image",
                          description: "Preserve image proportions",
                        },
                        {
                          value: "a4" as PageSize,
                          title: "A4",
                          description: "Standard document size",
                        },
                        {
                          value: "letter" as PageSize,
                          title: "Letter",
                          description: "US letter format",
                        },
                      ].map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setPageSize(option.value)}
                          disabled={isGenerating}
                          className={`flex w-full items-center justify-between rounded-xl border px-3.5 py-3 text-left transition ${
                            pageSize === option.value
                              ? "border-cyan-400/30 bg-cyan-400/10"
                              : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]"
                          }`}
                        >
                          <div>
                            <div
                              className={`text-xs font-medium ${
                                pageSize === option.value
                                  ? "text-cyan-300"
                                  : "text-slate-300"
                              }`}
                            >
                              {option.title}
                            </div>

                            <div className="mt-0.5 text-[10px] text-slate-600">
                              {option.description}
                            </div>
                          </div>

                          {pageSize === option.value && (
                            <span className="h-2 w-2 rounded-full bg-cyan-400" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Orientation */}
                  <div>
                    <label className="mb-2 block text-xs font-medium text-slate-300">
                      Orientation
                    </label>

                    <div className="space-y-2">
                      {[
                        {
                          value: "auto" as Orientation,
                          title: "Automatic",
                          description: "Match the image orientation",
                        },
                        {
                          value: "portrait" as Orientation,
                          title: "Portrait",
                          description: "Vertical page",
                        },
                        {
                          value: "landscape" as Orientation,
                          title: "Landscape",
                          description: "Horizontal page",
                        },
                      ].map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() =>
                            setOrientation(option.value)
                          }
                          disabled={isGenerating}
                          className={`flex w-full items-center justify-between rounded-xl border px-3.5 py-3 text-left transition ${
                            orientation === option.value
                              ? "border-cyan-400/30 bg-cyan-400/10"
                              : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]"
                          }`}
                        >
                          <div>
                            <div
                              className={`text-xs font-medium ${
                                orientation === option.value
                                  ? "text-cyan-300"
                                  : "text-slate-300"
                              }`}
                            >
                              {option.title}
                            </div>

                            <div className="mt-0.5 text-[10px] text-slate-600">
                              {option.description}
                            </div>
                          </div>

                          {orientation === option.value && (
                            <span className="h-2 w-2 rounded-full bg-cyan-400" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={createPdf}
                  disabled={isGenerating || items.length === 0}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isGenerating ? (
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
                      Create & Download PDF
                    </>
                  )}
                </button>

                {isGenerating && (
                  <div className="mt-4">
                    <div className="mb-2 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">
                        Processing images
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
            )}

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
          </section>

          {/* Sidebar */}
          <aside className="space-y-4">
            <div className="surface-card rounded-2xl border border-white/10 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
                <FileImage size={19} />
              </div>

              <h3 className="mt-4 text-sm font-semibold text-white">
                Supported workflow
              </h3>

              <ul className="mt-3 space-y-3">
                {[
                  "Add multiple images",
                  "Arrange page order",
                  "Remove unwanted pages",
                  "Choose A4, Letter, or image-fit",
                  "Automatically preserve proportions",
                  "Download one combined PDF",
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
                <RotateCcw size={14} className="text-cyan-300" />
                Images stay on your device
              </div>

              <p className="mt-2 text-[11px] leading-5 text-slate-600">
                PDF generation happens locally in your browser. This tool
                does not upload your images to a server.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}