"use client";

import {
  ChangeEvent,
  DragEvent,
  useRef,
  useState,
} from "react";
import {
  CheckCircle2,
  FileText,
  Trash2,
  Upload,
  X,
} from "lucide-react";

interface UploadZoneProps {
  onFileSelect?: (file: File) => void;
  acceptedTypes?: string[];
  maxSizeMB?: number;
  multiple?: boolean;
  title?: string;
  description?: string;
}

export default function UploadZone({
  onFileSelect,
  acceptedTypes = ["application/pdf"],
  maxSizeMB = 20,
  multiple = false,
  title = "Upload your document",
  description = "Drag and drop your PDF here, or click to browse",
}: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [error, setError] = useState("");

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) {
      return "0 Bytes";
    }

    const units = ["Bytes", "KB", "MB", "GB"];
    const index = Math.floor(Math.log(bytes) / Math.log(1024));

    return `${(bytes / Math.pow(1024, index)).toFixed(1)} ${units[index]}`;
  };

  const isValidFile = (file: File) => {
    const isAcceptedType = acceptedTypes.includes(file.type);

    const isAcceptedExtension =
      file.name.toLowerCase().endsWith(".pdf") &&
      acceptedTypes.includes("application/pdf");

    const isTypeValid = isAcceptedType || isAcceptedExtension;

    const isSizeValid = file.size <= maxSizeMB * 1024 * 1024;

    if (!isTypeValid) {
      setError(
        `Unsupported file type. Please upload: ${acceptedTypes
          .map((type) => type.split("/")[1]?.toUpperCase())
          .join(", ")}.`,
      );

      return false;
    }

    if (!isSizeValid) {
      setError(`File size must be less than ${maxSizeMB} MB.`);

      return false;
    }

    return true;
  };

  const processFiles = (files: File[]) => {
    setError("");

    const validFiles = files.filter((file) => isValidFile(file));

    if (validFiles.length === 0) {
      return;
    }

    if (multiple) {
      const updatedFiles = [...selectedFiles, ...validFiles];

      setSelectedFiles(updatedFiles);

      validFiles.forEach((file) => {
        onFileSelect?.(file);
      });

      return;
    }

    const file = validFiles[0];

    setSelectedFiles([file]);
    onFileSelect?.(file);
  };

  const handleFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);

    processFiles(files);

    event.target.value = "";
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    setIsDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    setIsDragging(false);

    const files = Array.from(event.dataTransfer.files);

    processFiles(files);
  };

  const openFilePicker = () => {
    inputRef.current?.click();
  };

  const removeFile = (index: number) => {
    setSelectedFiles((previousFiles) =>
      previousFiles.filter((_, fileIndex) => fileIndex !== index),
    );

    setError("");
  };

  const clearFiles = () => {
    setSelectedFiles([]);
    setError("");
  };

  const acceptedAttribute = acceptedTypes.join(",");

  return (
    <div className="w-full">
      {/* Upload Area */}
      <div
        role="button"
        tabIndex={0}
        onClick={openFilePicker}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openFilePicker();
          }
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`upload-dropzone group relative flex min-h-[260px] cursor-pointer flex-col items-center justify-center overflow-hidden px-6 py-10 text-center transition-all ${
          isDragging
            ? "active scale-[1.01]"
            : "hover:border-cyan-400/40"
        }`}
      >
        {/* Background glow */}
        <div
          className={`pointer-events-none absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400/5 blur-3xl transition-opacity ${
            isDragging ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        />

        {/* Upload Icon */}
        <div
          className={`relative flex h-16 w-16 items-center justify-center rounded-2xl border transition-all ${
            isDragging
              ? "border-cyan-400/40 bg-cyan-400/15 text-cyan-300"
              : "border-white/10 bg-white/[0.04] text-slate-400 group-hover:border-cyan-400/30 group-hover:bg-cyan-400/10 group-hover:text-cyan-300"
          }`}
        >
          <Upload size={27} />

          <div className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-cyan-400 opacity-0 shadow-lg shadow-cyan-400/50 transition-opacity group-hover:opacity-100" />
        </div>

        {/* Text */}
        <div className="relative mt-5">
          <h3 className="text-base font-semibold text-slate-200">
            {isDragging ? "Drop your files here" : title}
          </h3>

          <p className="mt-2 text-sm text-slate-500">
            {description}
          </p>

          <p className="mt-3 text-xs text-slate-600">
            Maximum file size: {maxSizeMB} MB
          </p>
        </div>

        {/* Hidden Input */}
        <input
          ref={inputRef}
          type="file"
          accept={acceptedAttribute}
          multiple={multiple}
          onChange={handleFileInput}
          className="hidden"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm text-red-300">
          <X size={17} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <div className="mt-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-200">
                Selected files
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {selectedFiles.length}{" "}
                {selectedFiles.length === 1 ? "file" : "files"} ready
              </p>
            </div>

            {selectedFiles.length > 1 && (
              <button
                type="button"
                onClick={clearFiles}
                className="text-xs text-slate-500 transition hover:text-red-300"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="space-y-2">
            {selectedFiles.map((file, index) => (
              <div
                key={`${file.name}-${file.lastModified}-${index}`}
                className="file-card flex items-center gap-3 p-3"
              >
                {/* File Icon */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-400/10 text-red-300">
                  <FileText size={19} />
                </div>

                {/* File Information */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-200">
                    {file.name}
                  </p>

                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-xs text-slate-500">
                      {formatFileSize(file.size)}
                    </span>

                    <span className="h-1 w-1 rounded-full bg-slate-700" />

                    <span className="flex items-center gap-1 text-xs text-emerald-400">
                      <CheckCircle2 size={12} />
                      Ready
                    </span>
                  </div>
                </div>

                {/* Remove */}
                <button
                  type="button"
                  aria-label={`Remove ${file.name}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    removeFile(index);
                  }}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-red-400/10 hover:text-red-300"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}