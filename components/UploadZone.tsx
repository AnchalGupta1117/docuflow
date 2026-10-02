"use client";

import {
  ChangeEvent,
  DragEvent,
  useRef,
  useState,
} from "react";
import {
  AlertCircle,
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
    const index = Math.min(
      Math.floor(Math.log(bytes) / Math.log(1024)),
      units.length - 1,
    );

    return `${(bytes / Math.pow(1024, index)).toFixed(1)} ${units[index]}`;
  };

  const getFileExtension = (fileName: string) => {
    const lastDot = fileName.lastIndexOf(".");

    if (lastDot === -1) {
      return "";
    }

    return fileName
      .slice(lastDot)
      .toLowerCase();
  };

  const isAcceptedType = (file: File) => {
    if (acceptedTypes.length === 0) {
      return true;
    }

    const fileType = file.type.toLowerCase();
    const extension = getFileExtension(file.name);

    return acceptedTypes.some((acceptedType) => {
      const normalizedType =
        acceptedType.toLowerCase().trim();

      // Example: ".pdf"
      if (normalizedType.startsWith(".")) {
        return extension === normalizedType;
      }

      // Example: "image/*"
      if (normalizedType.endsWith("/*")) {
        return fileType.startsWith(
          normalizedType.slice(0, -1),
        );
      }

      // Exact MIME type
      return fileType === normalizedType;
    });
  };

  const isPdfFile = (file: File) => {
    return (
      file.type.toLowerCase() ===
        "application/pdf" ||
      getFileExtension(file.name) === ".pdf"
    );
  };

  const hasPdfSignature = async (file: File) => {
    try {
      const header = await file
        .slice(0, 5)
        .arrayBuffer();

      const bytes = new Uint8Array(header);

      if (bytes.length < 5) {
        return false;
      }

      const signature = String.fromCharCode(
        ...bytes,
      );

      return signature === "%PDF-";
    } catch (signatureError) {
      console.error(
        "Unable to validate PDF signature:",
        signatureError,
      );

      return false;
    }
  };

  const acceptsPdf = () => {
    return acceptedTypes.some((type) => {
      const normalizedType =
        type.toLowerCase().trim();

      return (
        normalizedType ===
          "application/pdf" ||
        normalizedType === ".pdf"
      );
    });
  };

  const getAcceptedTypesLabel = () => {
    if (acceptedTypes.length === 0) {
      return "supported file types";
    }

    return acceptedTypes
      .map((type) => {
        const normalizedType =
          type.toLowerCase();

        if (
          normalizedType ===
          "application/pdf"
        ) {
          return "PDF";
        }

        if (normalizedType.startsWith(".")) {
          return normalizedType
            .slice(1)
            .toUpperCase();
        }

        if (normalizedType.endsWith("/*")) {
          return normalizedType
            .replace("/*", "")
            .toUpperCase();
        }

        return (
          normalizedType
            .split("/")
            .pop()
            ?.toUpperCase() ||
          normalizedType.toUpperCase()
        );
      })
      .join(", ");
  };

  const validateFile = async (
    file: File,
  ): Promise<boolean> => {
    if (!file) {
      setError("Please select a valid file.");
      return false;
    }

    if (file.size === 0) {
      setError(
        `"${file.name}" is empty and cannot be uploaded.`,
      );

      return false;
    }

    const maxSizeBytes =
      maxSizeMB * 1024 * 1024;

    if (file.size > maxSizeBytes) {
      setError(
        `"${file.name}" is too large. Maximum file size is ${maxSizeMB} MB.`,
      );

      return false;
    }

    if (!isAcceptedType(file)) {
      setError(
        `"${file.name}" is not a supported file type. Please upload ${getAcceptedTypesLabel()}.`,
      );

      return false;
    }

    /*
     * Additional PDF validation.
     *
     * The browser-provided MIME type can sometimes
     * be missing or incorrect, so when PDF is expected
     * we also verify the actual PDF file signature.
     */
    if (
      acceptsPdf() &&
      isPdfFile(file)
    ) {
      const validPdf =
        await hasPdfSignature(file);

      if (!validPdf) {
        setError(
          `"${file.name}" does not appear to be a valid PDF file.`,
        );

        return false;
      }
    }

    return true;
  };

  const processFiles = async (
    files: File[],
  ) => {
    if (files.length === 0) {
      return;
    }

    setError("");

    const validFiles: File[] = [];

    for (const file of files) {
      const valid = await validateFile(file);

      if (valid) {
        validFiles.push(file);
      }

      /*
       * For single-file mode, stop after the first
       * valid file.
       */
      if (!multiple && validFiles.length > 0) {
        break;
      }
    }

    if (validFiles.length === 0) {
      return;
    }

    if (multiple) {
      const existingKeys = new Set(
        selectedFiles.map(
          (file) =>
            `${file.name}-${file.size}-${file.lastModified}`,
        ),
      );

      const newFiles = validFiles.filter(
        (file) =>
          !existingKeys.has(
            `${file.name}-${file.size}-${file.lastModified}`,
          ),
      );

      if (newFiles.length === 0) {
        setError(
          "The selected file is already in the list.",
        );

        return;
      }

      const updatedFiles = [
        ...selectedFiles,
        ...newFiles,
      ];

      setSelectedFiles(updatedFiles);

      newFiles.forEach((file) => {
        try {
          onFileSelect?.(file);
        } catch (selectionError) {
          console.error(
            "File selection handler failed:",
            selectionError,
          );

          setError(
            `"${file.name}" could not be added. Please try again.`,
          );
        }
      });

      return;
    }

    const file = validFiles[0];

    setSelectedFiles([file]);

    try {
      onFileSelect?.(file);
    } catch (selectionError) {
      console.error(
        "File selection handler failed:",
        selectionError,
      );

      setSelectedFiles([]);

      setError(
        `"${file.name}" could not be added. Please try again.`,
      );
    }
  };

  const handleFileInput = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(
      event.target.files ?? [],
    );

    void processFiles(files);

    /*
     * Reset the input so selecting the same file
     * again triggers onChange.
     */
    event.target.value = "";
  };

  const handleDragOver = (
    event: DragEvent<HTMLDivElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    setIsDragging(true);
  };

  const handleDragLeave = (
    event: DragEvent<HTMLDivElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    /*
     * Prevent flickering when moving between
     * children inside the drop zone.
     */
    if (
      event.currentTarget.contains(
        event.relatedTarget as Node,
      )
    ) {
      return;
    }

    setIsDragging(false);
  };

  const handleDrop = (
    event: DragEvent<HTMLDivElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    setIsDragging(false);

    const files = Array.from(
      event.dataTransfer.files ?? [],
    );

    void processFiles(files);
  };

  const openFilePicker = () => {
    setError("");
    inputRef.current?.click();
  };

  const removeFile = (index: number) => {
    setSelectedFiles((previousFiles) =>
      previousFiles.filter(
        (_, fileIndex) =>
          fileIndex !== index,
      ),
    );

    setError("");
  };

  const clearFiles = () => {
    setSelectedFiles([]);
    setError("");
  };

  const acceptedAttribute =
    acceptedTypes.join(",");

  return (
    <div className="w-full">
      {/* Upload Area */}
      <div
        role="button"
        tabIndex={0}
        aria-label={title}
        onClick={openFilePicker}
        onKeyDown={(event) => {
          if (
            event.key === "Enter" ||
            event.key === " "
          ) {
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
            isDragging
              ? "opacity-100"
              : "opacity-0 group-hover:opacity-100"
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
            {isDragging
              ? "Drop your files here"
              : title}
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
          <AlertCircle
            size={17}
            className="mt-0.5 shrink-0"
          />

          <span className="min-w-0 flex-1">
            {error}
          </span>

          <button
            type="button"
            aria-label="Dismiss upload error"
            onClick={(event) => {
              event.stopPropagation();
              setError("");
            }}
            className="shrink-0 text-red-400/70 transition hover:text-red-300"
          >
            <X size={15} />
          </button>
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
                {selectedFiles.length === 1
                  ? "file"
                  : "files"}{" "}
                ready
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
            {selectedFiles.map(
              (file, index) => (
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
                        {formatFileSize(
                          file.size,
                        )}
                      </span>

                      <span className="h-1 w-1 rounded-full bg-slate-700" />

                      <span className="flex items-center gap-1 text-xs text-emerald-400">
                        <CheckCircle2
                          size={12}
                        />
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
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}