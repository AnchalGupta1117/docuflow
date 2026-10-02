"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";

import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  Download,
  FileArchive,
  FileImage,
  FilePlus2,
  FileText,
  FolderOpen,
  Images,
  LayoutDashboard,
  MoreHorizontal,
  Pencil,
  Search,
  Settings,
  Sparkles,
  Split,
  Trash2,
  Upload,
  WandSparkles,
  X,
  RotateCw,
  Files,
  ScanText,
  MessageSquareText,
  Lightbulb,
  Brain,
  FileSearch,
  GitCompare,
  ShieldCheck,
  Eye,
  Move,
  LogOut,
} from "lucide-react";

import UploadZone from "@/components/UploadZone";
import ToolCard from "@/components/ToolCard";

import {
  formatFileSize,
  createId,
} from "@/lib/utils";

import {
  saveDocumentFile,
  getDocumentFile,
  getAllDocumentFiles,
  removeDocumentFile,
  renameDocumentFile,
} from "@/lib/document-store";

import {
  getCurrentUser,
  logoutUser,
  type DocuFlowUser,
} from "@/lib/auth";

/* ========================================================= */
/* TYPES */
/* ========================================================= */

interface DocumentItem {
  id: string;
  name: string;
  size: string;
  pages: number;
  updatedAt: string;
  category: string;
  file?: File;
  isUploaded?: boolean;
}

/* ========================================================= */
/* STORAGE KEYS */
/* ========================================================= */

const DOCUMENTS_METADATA_KEY =
  "docuflow_document_metadata";

/* ========================================================= */
/* SAMPLE DOCUMENTS */
/* ========================================================= */

const initialDocuments: DocumentItem[] = [
  {
    id: "predictive-maintenance",
    name: "Predictive Maintenance Report.pdf",
    size: "2.4 MB",
    pages: 28,
    updatedAt: "Today",
    category: "Project Report",
    isUploaded: false,
  },
  {
    id: "machine-learning-notes",
    name: "Machine Learning Notes.pdf",
    size: "1.8 MB",
    pages: 42,
    updatedAt: "Yesterday",
    category: "Study Material",
    isUploaded: false,
  },
  {
    id: "research-document-ai",
    name: "Research Paper — Document AI.pdf",
    size: "3.1 MB",
    pages: 17,
    updatedAt: "Sep 29",
    category: "Research",
    isUploaded: false,
  },
];

/* ========================================================= */
/* PDF TOOLS */
/* ========================================================= */

const tools = [
  {
    icon: Files,
    title: "Merge PDF",
    description:
      "Combine multiple PDF files into one document.",
    href: "/tools/merge",
  },
  {
    icon: Split,
    title: "Split PDF",
    description:
      "Extract selected pages or page ranges from a PDF.",
    href: "/tools/split",
  },
  {
    icon: FileArchive,
    title: "Compress PDF",
    description:
      "Reduce PDF size while preserving useful document quality.",
    href: "/tools/compress",
  },
  {
    icon: Pencil,
    title: "Edit PDF",
    description:
      "Delete, reorder and rotate PDF pages before exporting.",
    href: "/tools/edit-pdf",
  },
  {
    icon: FileImage,
    title: "PDF to Images",
    description:
      "Convert PDF pages into high-quality images.",
    href: "/tools/pdf-to-images",
  },
  {
    icon: Images,
    title: "Images to PDF",
    description:
      "Combine images into a downloadable PDF document.",
    href: "/tools/images-to-pdf",
  },
  {
    icon: ScanText,
    title: "OCR",
    description:
      "Extract editable text from images using optical character recognition.",
    href: "/tools/ocr",
  },
  {
    icon: FileSearch,
    title: "Smart Search",
    description:
      "Search across multiple PDF documents and find matching content.",
    href: "/tools/search",
  },
];

/* ========================================================= */
/* AI TOOLS */
/* ========================================================= */

const aiTools = [
  {
    icon: WandSparkles,
    title: "AI Summary",
    description:
      "Generate a concise summary and key points from your document.",
    action: "viewer",
  },
  {
    icon: MessageSquareText,
    title: "Ask Questions",
    description:
      "Ask questions about the contents of your document.",
    action: "viewer",
  },
  {
    icon: Lightbulb,
    title: "Explain Simply",
    description:
      "Turn difficult document content into simple explanations.",
    action: "viewer",
  },
  {
    icon: FileSearch,
    title: "Find Key Info",
    description:
      "Identify important facts, terms, dates and sections.",
    action: "viewer",
  },
  {
    icon: Brain,
    title: "Document Insights",
    description:
      "Understand topics, structure, findings and important details.",
    action: "viewer",
  },
  {
    icon: GitCompare,
    title: "Compare Documents",
    description:
      "Compare two uploaded documents and identify meaningful differences.",
    action: "compare",
  },
];

/* ========================================================= */
/* METADATA HELPERS */
/* ========================================================= */

function loadDocumentMetadata(): DocumentItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const stored = localStorage.getItem(
      DOCUMENTS_METADATA_KEY,
    );

    if (!stored) {
      return [];
    }

    const parsed: unknown = JSON.parse(stored);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(
        (document): document is Record<string, unknown> =>
          Boolean(
            document &&
              typeof document === "object",
          ),
      )
      .map((document) => ({
        id:
          typeof document.id === "string"
            ? document.id
            : createId(),
        name:
          typeof document.name === "string"
            ? document.name
            : "Untitled document.pdf",
        size:
          typeof document.size === "string"
            ? document.size
            : "Unknown size",
        pages:
          typeof document.pages === "number"
            ? document.pages
            : 0,
        updatedAt:
          typeof document.updatedAt === "string"
            ? document.updatedAt
            : "Recently",
        category:
          typeof document.category === "string"
            ? document.category
            : "Uploaded Document",
        file: undefined,
        isUploaded: true,
      }));
  } catch (error) {
    console.error(
      "Unable to load document metadata:",
      error,
    );

    return [];
  }
}

function saveDocumentMetadata(
  documents: DocumentItem[],
): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const serializableDocuments = documents
      .filter(
        (document) => document.isUploaded,
      )
      .map(
        ({
          file: _file,
          ...document
        }) => document,
      );

    localStorage.setItem(
      DOCUMENTS_METADATA_KEY,
      JSON.stringify(
        serializableDocuments,
      ),
    );

    return true;
  } catch (error) {
    console.error(
      "Unable to save document metadata:",
      error,
    );

    return false;
  }
}

/* ========================================================= */
/* DASHBOARD */
/* ========================================================= */

export default function DashboardPage() {
  const [documents, setDocuments] =
    useState<DocumentItem[]>(
      initialDocuments,
    );

  const [currentUser, setCurrentUser] =
    useState<DocuFlowUser | null>(null);

  const [searchQuery, setSearchQuery] =
    useState("");

  const [showUploadModal, setShowUploadModal] =
    useState(false);

  const [selectedFiles, setSelectedFiles] =
    useState<File[]>([]);

  const [activeMenu, setActiveMenu] =
    useState<string | null>(null);

  const [loadingDocuments, setLoadingDocuments] =
    useState(true);

  const [storageError, setStorageError] =
    useState("");

  const [uploading, setUploading] =
    useState(false);

  /* ========================================================= */
  /* LOAD USER + PERSISTED DOCUMENTS */
  /* ========================================================= */

  useEffect(() => {
    setCurrentUser(getCurrentUser());

    void loadPersistedDocuments();
  }, []);

  async function loadPersistedDocuments() {
    try {
      setLoadingDocuments(true);
      setStorageError("");

      const metadata =
        loadDocumentMetadata();

      if (!metadata.length) {
        setDocuments(initialDocuments);
        setLoadingDocuments(false);
        return;
      }

      const storedFiles =
        await getAllDocumentFiles();

      const fileMap = new Map(
        storedFiles.map(
          (item) => [
            item.id,
            item.file,
          ],
        ),
      );

      const restoredDocuments =
        metadata.filter((document) =>
          fileMap.has(document.id),
        ).map((document) => ({
          ...document,
          file: fileMap.get(
            document.id,
          ),
          isUploaded: true,
        }));

      const missingDocuments =
        metadata.filter(
          (document) =>
            !fileMap.has(document.id),
        );

      if (missingDocuments.length > 0) {
        console.warn(
          "Some document metadata had no matching IndexedDB file:",
          missingDocuments.map(
            (document) =>
              document.id,
          ),
        );
      }

      setDocuments([
        ...restoredDocuments,
        ...initialDocuments,
      ]);

      saveDocumentMetadata(
        restoredDocuments,
      );

      if (missingDocuments.length > 0) {
        setStorageError(
          "Some saved documents were unavailable and could not be restored.",
        );
      }
    } catch (error) {
      console.error(
        "Failed to load persisted documents:",
        error,
      );

      setDocuments(initialDocuments);

      setStorageError(
        "Unable to load your saved documents. Your existing files may still be available after refreshing.",
      );
    } finally {
      setLoadingDocuments(false);
    }
  }

  /* ========================================================= */
  /* USER */
  /* ========================================================= */

  const userName =
    currentUser?.name?.trim() || "there";

  const userInitials = useMemo(() => {
    if (!currentUser?.name) {
      return "DF";
    }

    const parts = currentUser.name
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (parts.length === 1) {
      return parts[0]
        .slice(0, 2)
        .toUpperCase();
    }

    return `${parts[0][0]}${
      parts[parts.length - 1][0]
    }`.toUpperCase();
  }, [currentUser]);

  function handleLogout() {
    try {
      logoutUser();
    } catch (error) {
      console.error(
        "Logout failed:",
        error,
      );
    }

    window.location.href = "/login";
  }

  /* ========================================================= */
  /* FILTER DOCUMENTS */
  /* ========================================================= */

  const filteredDocuments =
    useMemo(() => {
      const query =
        searchQuery.trim().toLowerCase();

      if (!query) {
        return documents;
      }

      return documents.filter(
        (document) =>
          document.name
            .toLowerCase()
            .includes(query) ||
          document.category
            .toLowerCase()
            .includes(query),
      );
    }, [documents, searchQuery]);

  /* ========================================================= */
  /* FIRST UPLOADED DOCUMENT */
  /* ========================================================= */

  const firstUploadedDocument =
    useMemo(
      () =>
        documents.find(
          (document) =>
            document.isUploaded &&
            Boolean(document.file),
        ),
      [documents],
    );

  function getAiWorkspaceHref() {
    if (firstUploadedDocument) {
      return `/documents/${firstUploadedDocument.id}`;
    }

    return "#library";
  }

  /* ========================================================= */
  /* SELECT FILES */
  /* ========================================================= */

  function handleFilesSelected(
    files: File[],
  ) {
    const pdfFiles = files.filter(
      (file) =>
        file.type ===
          "application/pdf" ||
        file.name
          .toLowerCase()
          .endsWith(".pdf"),
    );

    if (!pdfFiles.length) {
      setStorageError(
        "Please select a valid PDF file.",
      );

      return;
    }

    setStorageError("");

    setSelectedFiles(
      (previous) => {
        const existingKeys =
          new Set([
            ...previous.map(
              (file) =>
                `${file.name}-${file.size}-${file.lastModified}`,
            ),
            ...documents
              .filter(
                (document) =>
                  document.isUploaded,
              )
              .map(
                (document) =>
                  `${document.name}-${document.size}`,
              ),
          ]);

        const newFiles =
          pdfFiles.filter(
            (file) => {
              const exactKey = `${file.name}-${file.size}-${file.lastModified}`;

              const metadataKey = `${file.name}-${formatFileSize(file.size)}`;

              return (
                !existingKeys.has(
                  exactKey,
                ) &&
                !existingKeys.has(
                  metadataKey,
                )
              );
            },
          );

        if (!newFiles.length) {
          setStorageError(
            "The selected document is already in your workspace.",
          );

          return previous;
        }

        return [
          ...previous,
          ...newFiles,
        ];
      },
    );
  }

  /* ========================================================= */
  /* ADD DOCUMENTS */
  /* ========================================================= */

  async function handleAddToWorkspace() {
    if (
      uploading ||
      !selectedFiles.length
    ) {
      return;
    }

    const filesToSave = [
      ...selectedFiles,
    ];

    const createdIds: string[] = [];

    try {
      setUploading(true);
      setStorageError("");

      const newDocuments: DocumentItem[] =
        [];

      for (const file of filesToSave) {
        if (
          file.size <= 0
        ) {
          throw new Error(
            `The file "${file.name}" is empty.`,
          );
        }

        const id = createId();

        createdIds.push(id);

        await saveDocumentFile(
          id,
          file,
        );

        newDocuments.push({
          id,
          name: file.name,
          size: formatFileSize(
            file.size,
          ),
          pages: 0,
          updatedAt: "Just now",
          category:
            "Uploaded Document",
          file,
          isUploaded: true,
        });
      }

      const uploadedDocuments =
        documents.filter(
          (document) =>
            document.isUploaded,
        );

      const sampleDocuments =
        documents.filter(
          (document) =>
            !document.isUploaded,
        );

      const nextDocuments = [
        ...newDocuments,
        ...uploadedDocuments,
        ...sampleDocuments,
      ];

      setDocuments(nextDocuments);

      const metadataSaved =
        saveDocumentMetadata(
          nextDocuments,
        );

      if (!metadataSaved) {
        setStorageError(
          "Your files were saved, but document metadata could not be stored. Please refresh and verify your workspace.",
        );
      }

      setSelectedFiles([]);
      setShowUploadModal(false);
    } catch (error) {
      console.error(
        "Failed to add documents:",
        error,
      );

      for (const id of createdIds) {
        try {
          await removeDocumentFile(id);
        } catch (cleanupError) {
          console.error(
            "Failed to clean up uploaded file:",
            cleanupError,
          );
        }
      }

      setStorageError(
        error instanceof Error &&
          error.message
          ? error.message
          : "Unable to save your document. Please try again.",
      );
    } finally {
      setUploading(false);
    }
  }

  function removeSelectedFile(
    index: number,
  ) {
    setSelectedFiles(
      (previous) =>
        previous.filter(
          (_, fileIndex) =>
            fileIndex !== index,
        ),
    );
  }

  function closeUploadModal() {
    if (uploading) {
      return;
    }

    setShowUploadModal(false);
    setSelectedFiles([]);
  }

  /* ========================================================= */
  /* DELETE DOCUMENT */
  /* ========================================================= */

  async function handleDelete(
    documentId: string,
  ) {
    const document =
      documents.find(
        (item) =>
          item.id === documentId,
      );

    if (!document) {
      return;
    }

    if (!document.isUploaded) {
      window.alert(
        "This is a sample document from the dashboard preview.",
      );

      setActiveMenu(null);
      return;
    }

    const confirmed =
      window.confirm(
        `Delete "${document.name}"? This will remove the saved file from this browser.`,
      );

    if (!confirmed) {
      return;
    }

    try {
      setStorageError("");

      await removeDocumentFile(
        documentId,
      );

      const nextDocuments =
        documents.filter(
          (item) =>
            item.id !== documentId,
        );

      setDocuments(nextDocuments);

      const metadataSaved =
        saveDocumentMetadata(
          nextDocuments,
        );

      setActiveMenu(null);

      if (!metadataSaved) {
        setStorageError(
          "The document was deleted, but its metadata could not be updated.",
        );
      }
    } catch (error) {
      console.error(
        "Failed to delete document:",
        error,
      );

      setStorageError(
        "Unable to delete this document. Please try again.",
      );
    }
  }

  /* ========================================================= */
  /* RENAME DOCUMENT */
  /* ========================================================= */

  async function handleRename(
    documentId: string,
  ) {
    const document =
      documents.find(
        (item) =>
          item.id === documentId,
      );

    if (!document) {
      return;
    }

    if (!document.isUploaded) {
      window.alert(
        "Sample documents cannot be renamed.",
      );

      setActiveMenu(null);
      return;
    }

    const newName =
      window.prompt(
        "Enter a new document name:",
        document.name,
      );

    if (!newName?.trim()) {
      return;
    }

    const cleanedName =
      newName.trim();

    const finalName =
      cleanedName
        .toLowerCase()
        .endsWith(".pdf")
        ? cleanedName
        : `${cleanedName}.pdf`;

    const duplicateName =
      documents.some(
        (item) =>
          item.id !== documentId &&
          item.isUploaded &&
          item.name.toLowerCase() ===
            finalName.toLowerCase(),
      );

    if (duplicateName) {
      setStorageError(
        "A document with that name already exists.",
      );

      setActiveMenu(null);

      return;
    }

    const nextDocuments =
      documents.map(
        (item) =>
          item.id === documentId
            ? {
                ...item,
                name: finalName,
                updatedAt:
                  "Just now",
              }
            : item,
      );

    try {
      setStorageError("");

      await renameDocumentFile(
        documentId,
        finalName,
      );

      setDocuments(nextDocuments);

      const metadataSaved =
        saveDocumentMetadata(
          nextDocuments,
        );

      setActiveMenu(null);

      if (!metadataSaved) {
        setStorageError(
          "The document was renamed, but its metadata could not be updated.",
        );
      }
    } catch (error) {
      console.error(
        "Failed to rename document:",
        error,
      );

      setStorageError(
        "Unable to rename this document. Please try again.",
      );
    }
  }

  /* ========================================================= */
  /* DOWNLOAD DOCUMENT */
  /* ========================================================= */

  async function handleDownload(
    documentItem: DocumentItem,
  ) {
    if (!documentItem.isUploaded) {
      window.alert(
        "This is a sample document and does not contain a downloadable file.",
      );

      setActiveMenu(null);

      return;
    }

    try {
      setStorageError("");

      const file =
        documentItem.file ||
        (await getDocumentFile(
          documentItem.id,
        ));

      if (!file) {
        setStorageError(
          "The document file could not be found in local storage. Please upload it again.",
        );

        return;
      }

      const url =
        URL.createObjectURL(file);

      const anchor =
        window.document.createElement(
          "a",
        );

      anchor.href = url;
      anchor.download =
        documentItem.name;

      window.document.body.appendChild(
        anchor,
      );

      anchor.click();

      anchor.remove();

      window.setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);

      setActiveMenu(null);
    } catch (error) {
      console.error(
        "Failed to download document:",
        error,
      );

      setStorageError(
        "Unable to download this document. Please try again.",
      );
    }
  }

  /* ========================================================= */
  /* OPEN DOCUMENT */
  /* ========================================================= */

  function handleOpenDocument(
    document: DocumentItem,
  ) {
    if (!document.isUploaded) {
      window.alert(
        "This is a sample document from the dashboard preview. Upload a PDF to open it in the document workspace.",
      );

      return;
    }

    window.location.href = `/documents/${document.id}`;
  }

  /* ========================================================= */
  /* RENDER */
  /* ========================================================= */

  return (
    <main className="min-h-screen bg-[#05070b] text-slate-100">
      {/* =================================================== */}
      {/* FIXED NAVBAR */}
      {/* =================================================== */}

      <header
        className="
          fixed inset-x-0 top-0 z-[100]
          h-[78px]
          border-b border-white/[0.14]
          bg-[#070a10]/95
          shadow-[0_8px_30px_rgba(0,0,0,0.28)]
          backdrop-blur-2xl
        "
      >
        <div
          className="
            mx-auto flex h-full max-w-7xl
            items-center justify-between
            px-5 sm:px-6 lg:px-8
          "
        >
          {/* Logo */}

          <Link
            href="/"
            className="flex min-w-0 items-center gap-3"
          >
            <div
              className="
                flex h-10 w-10 shrink-0
                items-center justify-center
                rounded-xl
                border border-cyan-300/30
                bg-cyan-400
                text-slate-950
                shadow-lg shadow-cyan-400/20
              "
            >
              <FileText
                size={20}
                strokeWidth={2.5}
              />
            </div>

            <div className="min-w-0">
              <div className="text-[15px] font-bold tracking-tight text-white">
                DocuFlow
              </div>

              <div className="hidden text-[10px] text-slate-500 sm:block">
                AI Document Workspace
              </div>
            </div>
          </Link>

          {/* Navigation */}

          <nav className="hidden items-center gap-1 lg:flex">
            <Link
              href="/dashboard"
              className="
                rounded-xl px-3.5 py-2.5
                text-xs font-medium
                text-cyan-300
                transition
                hover:bg-cyan-400/[0.08]
              "
            >
              <span className="flex items-center gap-2">
                <LayoutDashboard size={14} />
                Dashboard
              </span>
            </Link>

            <Link
              href="#pdf-tools"
              className="
                rounded-xl px-3.5 py-2.5
                text-xs font-medium
                text-slate-400
                transition
                hover:bg-white/[0.06]
                hover:text-white
              "
            >
              <span className="flex items-center gap-2">
                <Files size={14} />
                PDF Tools
              </span>
            </Link>

            <Link
              href="#library"
              className="
                rounded-xl px-3.5 py-2.5
                text-xs font-medium
                text-slate-400
                transition
                hover:bg-white/[0.06]
                hover:text-white
              "
            >
              <span className="flex items-center gap-2">
                <FolderOpen size={14} />
                Library
              </span>
            </Link>

            <Link
              href="#ai-workspace"
              className="
                rounded-xl px-3.5 py-2.5
                text-xs font-medium
                text-slate-400
                transition
                hover:bg-white/[0.06]
                hover:text-white
              "
            >
              <span className="flex items-center gap-2">
                <Sparkles size={14} />
                AI Workspace
              </span>
            </Link>
          </nav>

          {/* Right side */}

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="
                hidden rounded-xl
                px-3 py-2.5
                text-xs font-medium
                text-slate-400
                transition
                hover:bg-white/[0.06]
                hover:text-white
                sm:block
              "
            >
              Home
            </Link>

            <Link
              href="/settings"
              title="Settings"
              aria-label="Settings"
              className="
                flex h-10 w-10 shrink-0
                items-center justify-center
                rounded-xl
                border border-white/[0.14]
                bg-white/[0.035]
                text-slate-400
                transition-all
                hover:border-cyan-400/30
                hover:bg-cyan-400/[0.08]
                hover:text-cyan-300
              "
            >
              <Settings size={17} />
            </Link>

            <div
              className="
                flex items-center
                rounded-xl
                border border-white/[0.14]
                bg-white/[0.035]
                py-1 pl-1.5 pr-1.5
              "
            >
              <div
                className="
                  flex h-8 w-8 shrink-0
                  items-center justify-center
                  rounded-lg
                  border border-cyan-400/25
                  bg-cyan-400/[0.09]
                  text-[11px] font-bold
                  text-cyan-300
                "
              >
                {userInitials}
              </div>

              <div className="hidden min-w-0 px-2.5 sm:block">
                <p className="max-w-[105px] truncate text-[11px] font-semibold leading-4 text-slate-100">
                  {currentUser?.name ||
                    "DocuFlow User"}
                </p>

                <p className="max-w-[105px] truncate text-[9px] leading-3 text-slate-500">
                  {currentUser?.email || ""}
                </p>
              </div>

              <div className="hidden h-6 w-px bg-white/[0.12] sm:block" />

              <button
                type="button"
                onClick={handleLogout}
                title="Log out"
                className="
                  flex h-8 w-8 shrink-0
                  items-center justify-center
                  rounded-lg
                  text-slate-500
                  transition-all
                  hover:bg-red-400/[0.08]
                  hover:text-red-400
                "
              >
                <LogOut size={15} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* =================================================== */}
      {/* PAGE CONTENT */}
      {/* =================================================== */}

      <div
        className="
          mx-auto max-w-7xl
          px-5 pb-10 pt-[102px]
          sm:px-6
          lg:px-8
        "
      >
        {/* Storage error */}

        {storageError && (
          <div
            className="
              mb-5 flex items-start justify-between gap-4
              rounded-xl
              border border-red-400/20
              bg-red-400/[0.06]
              px-4 py-3
              text-xs text-red-300
            "
          >
            <span>{storageError}</span>

            <button
              type="button"
              onClick={() =>
                setStorageError("")
              }
              className="shrink-0 text-red-400 transition hover:text-red-300"
              aria-label="Dismiss error"
            >
              <X size={15} />
            </button>
          </div>
        )}

        {/* ================================================= */}
        {/* WELCOME */}
        {/* ================================================= */}

        <section
          className="
            relative overflow-hidden
            rounded-3xl
            border border-white/[0.15]
            bg-gradient-to-br
            from-cyan-400/[0.10]
            via-[#0b1018]
            to-violet-500/[0.08]
            p-6
            shadow-[0_15px_50px_rgba(0,0,0,0.18)]
            sm:p-8
          "
        >
          <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />

          <div className="pointer-events-none absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />

          <div className="relative grid gap-8 lg:grid-cols-[1.4fr_0.8fr] lg:items-center">
            <div>
              <div
                className="
                  mb-4 inline-flex items-center gap-2
                  rounded-full
                  border border-cyan-400/25
                  bg-cyan-400/[0.07]
                  px-3 py-1.5
                  text-[11px] font-medium
                  text-cyan-300
                "
              >
                <Sparkles size={12} />
                Your document workspace
              </div>

              <h1 className="max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Welcome back, {userName}
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
                Upload your documents, organize your files,
                use PDF tools, and let AI help you understand
                what&apos;s inside.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setShowUploadModal(true)
                  }
                  className="
                    inline-flex items-center gap-2
                    rounded-xl
                    bg-cyan-400
                    px-4 py-2.5
                    text-xs font-semibold
                    text-slate-950
                    transition
                    hover:bg-cyan-300
                  "
                >
                  <Upload size={15} />
                  Upload document
                </button>

                <Link
                  href={
                    firstUploadedDocument
                      ? `/documents/${firstUploadedDocument.id}`
                      : "#ai-workspace"
                  }
                  className="
                    inline-flex items-center gap-2
                    rounded-xl
                    border border-white/[0.15]
                    bg-white/[0.04]
                    px-4 py-2.5
                    text-xs font-medium
                    text-slate-300
                    transition
                    hover:border-cyan-400/20
                    hover:bg-white/[0.07]
                    hover:text-white
                  "
                >
                  Try AI tools
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <StatCard
                icon={FolderOpen}
                value={documents.length.toString()}
                label="Documents"
              />

              <StatCard
                icon={BarChart3}
                value="Active"
                label="Workspace"
              />

              <StatCard
                icon={Sparkles}
                value="AI"
                label="Insights"
              />
            </div>
          </div>
        </section>

        {/* ================================================= */}
        {/* PDF TOOLS */}
        {/* ================================================= */}

        <section
          id="pdf-tools"
          className="mt-9 scroll-mt-24"
        >
          <div className="mb-5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300">
              Quick access
            </div>

            <h2 className="mt-1 text-xl font-semibold text-white">
              Document tools
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Process, convert and manage your PDF files.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {tools.map((tool) => (
              <ToolCard
                key={tool.title}
                {...tool}
              />
            ))}
          </div>
        </section>

        {/* ================================================= */}
        {/* EXTENDED ACTIONS */}
        {/* ================================================= */}

        <section className="mt-7">
          <div className="mb-3">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Page actions
            </div>

            <p className="mt-1 text-xs text-slate-600">
              Quick operations available from the PDF editor.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ActionStrip
              icon={RotateCw}
              title="Rotate pages"
              description="Rotate pages inside Edit PDF"
              href="/tools/edit-pdf"
            />

            <ActionStrip
              icon={Move}
              title="Reorder pages"
              description="Move pages before exporting"
              href="/tools/edit-pdf"
            />

            <ActionStrip
              icon={Trash2}
              title="Delete pages"
              description="Remove unwanted pages"
              href="/tools/edit-pdf"
            />

            <ActionStrip
              icon={Download}
              title="Extract pages"
              description="Export selected pages"
              href="/tools/split"
            />
          </div>
        </section>

        {/* ================================================= */}
        {/* LIBRARY */}
        {/* ================================================= */}

        <section
          id="library"
          className="mt-10 scroll-mt-24"
        >
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300">
                Library
              </div>

              <h2 className="mt-1 text-xl font-semibold text-white">
                Recent documents
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Your uploaded documents remain available after refresh.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative">
                <Search
                  size={14}
                  className="
                    pointer-events-none
                    absolute left-3 top-1/2
                    -translate-y-1/2
                    text-slate-500
                  "
                />

                <input
                  value={searchQuery}
                  onChange={(event) =>
                    setSearchQuery(
                      event.target.value,
                    )
                  }
                  placeholder="Search documents..."
                  className="
                    h-10 w-full rounded-xl
                    border border-white/[0.14]
                    bg-white/[0.035]
                    pl-9 pr-3
                    text-xs text-white
                    outline-none
                    placeholder:text-slate-600
                    focus:border-cyan-400/40
                    sm:w-60
                  "
                />
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowUploadModal(true)
                }
                className="
                  inline-flex h-10
                  items-center justify-center gap-2
                  rounded-xl
                  border border-white/[0.14]
                  bg-white/[0.035]
                  px-4
                  text-xs font-medium
                  text-slate-300
                  transition
                  hover:border-cyan-400/20
                  hover:bg-white/[0.06]
                  hover:text-white
                "
              >
                <Upload size={14} />
                Upload
              </button>
            </div>
          </div>

          {loadingDocuments ? (
            <div
              className="
                flex min-h-[180px]
                items-center justify-center
                rounded-2xl
                border border-white/[0.12]
                bg-white/[0.02]
              "
            >
              <div className="text-center">
                <div
                  className="
                    mx-auto h-7 w-7
                    animate-spin
                    rounded-full
                    border-2
                    border-cyan-400/20
                    border-t-cyan-400
                  "
                />

                <p className="mt-3 text-xs text-slate-500">
                  Loading your documents...
                </p>
              </div>
            </div>
          ) : filteredDocuments.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredDocuments.map(
                (document) => (
                  <DocumentCard
                    key={document.id}
                    document={document}
                    menuOpen={
                      activeMenu ===
                      document.id
                    }
                    onMenu={() =>
                      setActiveMenu(
                        activeMenu ===
                          document.id
                          ? null
                          : document.id,
                      )
                    }
                    onCloseMenu={() =>
                      setActiveMenu(null)
                    }
                    onOpen={() =>
                      handleOpenDocument(
                        document,
                      )
                    }
                    onDelete={() =>
                      void handleDelete(
                        document.id,
                      )
                    }
                    onRename={() =>
                      void handleRename(
                        document.id,
                      )
                    }
                    onDownload={() =>
                      void handleDownload(
                        document,
                      )
                    }
                  />
                ),
              )}
            </div>
          ) : (
            <div
              className="
                rounded-2xl
                border border-dashed
                border-white/[0.16]
                bg-white/[0.025]
                px-6 py-12
                text-center
              "
            >
              <FileSearch
                size={24}
                className="mx-auto text-slate-600"
              />

              <p className="mt-3 text-sm font-medium text-slate-300">
                No documents found
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Try another search or upload a new document.
              </p>
            </div>
          )}
        </section>

        {/* ================================================= */}
        {/* AI WORKSPACE */}
        {/* ================================================= */}

        <section
          id="ai-workspace"
          className="mt-10 scroll-mt-24"
        >
          <div className="mb-5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300">
              AI workspace
            </div>

            <h2 className="mt-1 text-xl font-semibold text-white">
              Understand your documents
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Use AI to summarize, explain and explore your documents.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {aiTools.map((tool) => {
              const Icon =
                tool.icon;

              const href =
                tool.action ===
                "compare"
                  ? "/tools/compare"
                  : getAiWorkspaceHref();

              return (
                <Link
                  key={tool.title}
                  href={href}
                  className="
                    group relative overflow-hidden
                    rounded-2xl
                    border border-white/[0.14]
                    bg-white/[0.025]
                    p-5
                    transition
                    hover:-translate-y-0.5
                    hover:border-cyan-400/30
                    hover:bg-white/[0.045]
                  "
                >
                  <div
                    className="
                      absolute right-0 top-0
                      h-24 w-24 rounded-full
                      bg-cyan-400/5
                      blur-2xl
                      transition
                      group-hover:bg-cyan-400/10
                    "
                  />

                  <div className="relative">
                    <div
                      className="
                        flex h-11 w-11
                        items-center justify-center
                        rounded-xl
                        border border-cyan-400/15
                        bg-cyan-400/10
                        text-cyan-300
                      "
                    >
                      <Icon size={20} />
                    </div>

                    <h3 className="mt-5 text-sm font-semibold text-slate-100">
                      {tool.title}
                    </h3>

                    <p className="mt-2 min-h-[42px] text-xs leading-5 text-slate-500">
                      {tool.description}
                    </p>

                    <div className="mt-5 flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-500 transition group-hover:text-cyan-300">
                        {tool.action ===
                        "compare"
                          ? "Compare documents"
                          : firstUploadedDocument
                            ? "Open AI workspace"
                            : "Upload a document"}
                      </span>

                      <div
                        className="
                          flex h-7 w-7
                          items-center justify-center
                          rounded-lg
                          border border-white/[0.10]
                          bg-white/[0.03]
                          text-slate-500
                          transition
                          group-hover:border-cyan-400/25
                          group-hover:bg-cyan-400/10
                          group-hover:text-cyan-300
                        "
                      >
                        <ArrowRight size={14} />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* ================================================= */}
        {/* WORKSPACE INSIGHT */}
        {/* ================================================= */}

        <section className="mt-10 grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
          <div
            className="
              relative overflow-hidden
              rounded-2xl
              border border-cyan-400/20
              bg-gradient-to-br
              from-cyan-400/[0.07]
              to-transparent
              p-6
            "
          >
            <div
              className="
                pointer-events-none absolute
                -right-16 -top-16
                h-44 w-44
                rounded-full
                bg-cyan-400/10
                blur-3xl
              "
            />

            <div className="relative">
              <div className="flex items-center gap-3">
                <div
                  className="
                    flex h-10 w-10
                    items-center justify-center
                    rounded-xl
                    border border-cyan-400/15
                    bg-cyan-400/10
                    text-cyan-300
                  "
                >
                  <Sparkles size={18} />
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-white">
                    AI-powered workspace
                  </h3>

                  <p className="text-xs text-slate-500">
                    Turn documents into useful information
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <InsightItem
                  icon={WandSparkles}
                  title="Summarize"
                  description="Create a quick overview"
                  href={getAiWorkspaceHref()}
                />

                <InsightItem
                  icon={MessageSquareText}
                  title="Ask questions"
                  description="Chat with your document"
                  href={getAiWorkspaceHref()}
                />

                <InsightItem
                  icon={ScanText}
                  title="Find key info"
                  description="Extract useful details"
                  href={getAiWorkspaceHref()}
                />
              </div>
            </div>
          </div>

          <div
            className="
              rounded-2xl
              border border-white/[0.14]
              bg-white/[0.025]
              p-6
            "
          >
            <div className="flex items-center gap-3">
              <div
                className="
                  flex h-10 w-10
                  items-center justify-center
                  rounded-xl
                  border border-emerald-400/15
                  bg-emerald-400/10
                  text-emerald-300
                "
              >
                <ShieldCheck size={18} />
              </div>

              <div>
                <h3 className="text-sm font-semibold text-white">
                  Workspace ready
                </h3>

                <p className="text-xs text-slate-500">
                  Your tools are available
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <StatusRow label="PDF tools" />
              <StatusRow label="Document library" />
              <StatusRow label="AI workspace" />
            </div>
          </div>
        </section>

        {/* ================================================= */}
        {/* CAPABILITIES */}
        {/* ================================================= */}

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          <CapabilityCard
            icon={FolderOpen}
            title="Manage documents"
            text="Upload, search, rename, download and remove files from your workspace."
          />

          <CapabilityCard
            icon={FileText}
            title="Edit PDFs"
            text="Merge, split, compress, reorder, rotate, delete and extract pages."
          />

          <CapabilityCard
            icon={Brain}
            title="Understand with AI"
            text="Summarize documents, ask questions and discover important information."
          />
        </section>

        {/* ================================================= */}
        {/* FOOTER */}
        {/* ================================================= */}

        <footer className="mt-12 border-t border-white/[0.10] py-7">
          <div
            className="
              flex flex-col gap-3
              text-xs text-slate-600
              sm:flex-row
              sm:items-center
              sm:justify-between
            "
          >
            <div className="flex items-center gap-2">
              <div
                className="
                  flex h-6 w-6
                  items-center justify-center
                  rounded-md
                  border border-cyan-400/15
                  bg-cyan-400/10
                  text-cyan-300
                "
              >
                <FileText size={12} />
              </div>

              <span>DocuFlow</span>
            </div>

            <span>
              Upload · Manage · Edit · Understand
            </span>
          </div>
        </footer>
      </div>

      {/* =================================================== */}
      {/* UPLOAD MODAL */}
      {/* =================================================== */}

      {showUploadModal && (
        <div
          className="
            fixed inset-0 z-[200]
            flex items-center justify-center
            bg-slate-950/80
            p-4
            backdrop-blur-sm
          "
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeUploadModal();
            }
          }}
        >
          <div
            className="
              w-full max-w-2xl
              overflow-hidden
              rounded-3xl
              border border-white/[0.16]
              bg-slate-900
              shadow-2xl
              shadow-black/40
            "
          >
            <div
              className="
                flex items-center justify-between
                border-b border-white/[0.10]
                px-5 py-4
              "
            >
              <div>
                <h2 className="text-sm font-semibold text-white">
                  Add documents
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Upload PDF files to your workspace.
                </p>
              </div>

              <button
                type="button"
                onClick={closeUploadModal}
                disabled={uploading}
                className="
                  flex h-8 w-8
                  items-center justify-center
                  rounded-lg
                  text-slate-500
                  transition
                  hover:bg-white/5
                  hover:text-white
                  disabled:cursor-not-allowed
                  disabled:opacity-40
                "
                aria-label="Close upload dialog"
              >
                <X size={17} />
              </button>
            </div>

            <div className="p-5">
              <UploadZone
                multiple
                maxSizeMB={50}
                acceptedTypes={[
                  "application/pdf",
                ]}
                title="Drop your PDF files here"
                description="Upload one or multiple PDF documents. Maximum 50 MB per file."
                onFileSelect={(file) =>
                  handleFilesSelected([
                    file,
                  ])
                }
              />

              {selectedFiles.length > 0 && (
                <div className="mt-5">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300">
                      Selected files
                    </span>

                    <span className="text-[11px] text-slate-500">
                      {selectedFiles.length}{" "}
                      file
                      {selectedFiles.length !==
                      1
                        ? "s"
                        : ""}
                    </span>
                  </div>

                  <div className="max-h-48 space-y-2 overflow-y-auto">
                    {selectedFiles.map(
                      (
                        file,
                        index,
                      ) => (
                        <div
                          key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
                          className="
                            flex items-center justify-between
                            rounded-xl
                            border border-white/[0.10]
                            bg-white/[0.025]
                            px-3 py-2.5
                          "
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div
                              className="
                                flex h-8 w-8 shrink-0
                                items-center justify-center
                                rounded-lg
                                bg-cyan-400/10
                                text-cyan-300
                              "
                            >
                              <FileText size={15} />
                            </div>

                            <div className="min-w-0">
                              <p className="truncate text-xs font-medium text-slate-200">
                                {file.name}
                              </p>

                              <p className="mt-0.5 text-[10px] text-slate-600">
                                {formatFileSize(
                                  file.size,
                                )}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              removeSelectedFile(
                                index,
                              )
                            }
                            disabled={
                              uploading
                            }
                            className="
                              ml-3 flex h-7 w-7 shrink-0
                              items-center justify-center
                              rounded-lg
                              text-slate-500
                              transition
                              hover:bg-red-400/10
                              hover:text-red-300
                              disabled:cursor-not-allowed
                              disabled:opacity-40
                            "
                            aria-label={`Remove ${file.name}`}
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeUploadModal}
                  disabled={uploading}
                  className="
                    rounded-xl
                    border border-white/[0.14]
                    bg-white/[0.03]
                    px-4 py-2.5
                    text-xs font-medium
                    text-slate-400
                    transition
                    hover:bg-white/[0.06]
                    hover:text-white
                    disabled:cursor-not-allowed
                    disabled:opacity-40
                  "
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={
                    !selectedFiles.length ||
                    uploading
                  }
                  onClick={() =>
                    void handleAddToWorkspace()
                  }
                  className="
                    inline-flex items-center gap-2
                    rounded-xl
                    bg-cyan-400
                    px-4 py-2.5
                    text-xs font-semibold
                    text-slate-950
                    transition
                    hover:bg-cyan-300
                    disabled:cursor-not-allowed
                    disabled:opacity-40
                  "
                >
                  {uploading ? (
                    <>
                      <span
                        className="
                          h-3.5 w-3.5
                          animate-spin
                          rounded-full
                          border-2
                          border-slate-950/20
                          border-t-slate-950
                        "
                      />

                      Saving...
                    </>
                  ) : (
                    <>
                      <FilePlus2 size={14} />
                      Add to workspace
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

/* ========================================================= */
/* STAT CARD */
/* ========================================================= */

function StatCard({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof FolderOpen;
  value: string;
  label: string;
}) {
  return (
    <div
      className="
        rounded-2xl
        border border-white/[0.14]
        bg-slate-950/40
        p-4
        backdrop-blur
      "
    >
      <div
        className="
          flex h-8 w-8
          items-center justify-center
          rounded-lg
          border border-cyan-400/15
          bg-white/[0.04]
          text-cyan-300
        "
      >
        <Icon size={15} />
      </div>

      <div className="mt-4 text-sm font-semibold text-white">
        {value}
      </div>

      <div className="mt-0.5 text-[10px] text-slate-500">
        {label}
      </div>
    </div>
  );
}

/* ========================================================= */
/* ACTION STRIP */
/* ========================================================= */

function ActionStrip({
  icon: Icon,
  title,
  description,
  href,
}: {
  icon: typeof RotateCw;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="
        group flex items-center gap-3
        rounded-xl
        border border-white/[0.14]
        bg-white/[0.02]
        p-3
        transition
        hover:border-cyan-400/25
        hover:bg-white/[0.045]
      "
    >
      <div
        className="
          flex h-9 w-9 shrink-0
          items-center justify-center
          rounded-lg
          border border-white/[0.10]
          bg-white/[0.04]
          text-slate-400
          transition
          group-hover:border-cyan-400/15
          group-hover:bg-cyan-400/10
          group-hover:text-cyan-300
        "
      >
        <Icon size={15} />
      </div>

      <div className="min-w-0">
        <div className="text-xs font-medium text-slate-200">
          {title}
        </div>

        <div className="mt-0.5 truncate text-[10px] text-slate-600">
          {description}
        </div>
      </div>
    </Link>
  );
}

/* ========================================================= */
/* DOCUMENT CARD */
/* ========================================================= */

function DocumentCard({
  document,
  menuOpen,
  onMenu,
  onCloseMenu,
  onOpen,
  onDelete,
  onRename,
  onDownload,
}: {
  document: DocumentItem;
  menuOpen: boolean;
  onMenu: () => void;
  onCloseMenu: () => void;
  onOpen: () => void;
  onDelete: () => void;
  onRename: () => void;
  onDownload: () => void;
}) {
  const isSample =
    !document.isUploaded;

  return (
    <div
      className="
        group relative overflow-hidden
        rounded-2xl
        border border-white/[0.14]
        bg-white/[0.025]
        transition
        hover:-translate-y-0.5
        hover:border-white/[0.24]
        hover:bg-white/[0.04]
      "
    >
      <div
        className="
          absolute inset-x-0 top-0
          h-px
          bg-gradient-to-r
          from-transparent
          via-cyan-400/50
          to-transparent
          opacity-0
          transition
          group-hover:opacity-100
        "
      />

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={onOpen}
            className="flex min-w-0 items-center gap-3 text-left"
          >
            <div
              className="
                flex h-11 w-11 shrink-0
                items-center justify-center
                rounded-xl
                border border-cyan-400/15
                bg-cyan-400/10
                text-cyan-300
              "
            >
              <FileText size={20} />
            </div>

            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-slate-100">
                {document.name}
              </h3>

              <p className="mt-1 text-[10px] text-slate-600">
                {document.category}
              </p>
            </div>
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={onMenu}
              className="
                flex h-8 w-8
                items-center justify-center
                rounded-lg
                text-slate-500
                transition
                hover:bg-white/5
                hover:text-white
              "
              title="More options"
              aria-label={`More options for ${document.name}`}
            >
              <MoreHorizontal size={17} />
            </button>

            {menuOpen && (
              <>
                <button
                  type="button"
                  aria-label="Close menu"
                  onClick={onCloseMenu}
                  className="
                    fixed inset-0 z-10
                    cursor-default
                  "
                />

                <div
                  className="
                    absolute right-0 top-9 z-20
                    w-40 overflow-hidden
                    rounded-xl
                    border border-white/[0.14]
                    bg-slate-900
                    py-1
                    shadow-2xl
                  "
                >
                  <button
                    type="button"
                    onClick={() => {
                      onCloseMenu();
                      onOpen();
                    }}
                    className="
                      flex w-full items-center gap-2
                      px-3 py-2
                      text-xs text-slate-400
                      transition
                      hover:bg-white/5
                      hover:text-white
                    "
                  >
                    <Eye size={13} />
                    Open
                  </button>

                  <button
                    type="button"
                    onClick={onRename}
                    className="
                      flex w-full
                      items-center gap-2
                      px-3 py-2
                      text-xs text-slate-400
                      transition
                      hover:bg-white/5
                      hover:text-white
                    "
                  >
                    <Pencil size={13} />
                    Rename
                  </button>

                  <button
                    type="button"
                    onClick={onDownload}
                    className="
                      flex w-full
                      items-center gap-2
                      px-3 py-2
                      text-xs text-slate-400
                      transition
                      hover:bg-white/5
                      hover:text-white
                    "
                  >
                    <Download size={13} />
                    Download
                  </button>

                  <button
                    type="button"
                    onClick={onDelete}
                    className="
                      flex w-full
                      items-center gap-2
                      px-3 py-2
                      text-xs text-red-400
                      transition
                      hover:bg-red-400/10
                    "
                  >
                    <Trash2 size={13} />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onOpen}
          className="block w-full text-left"
        >
          <div
            className="
              mt-5 h-28
              overflow-hidden
              rounded-xl
              border border-white/[0.10]
              bg-slate-950/70
            "
          >
            <div className="h-full p-4">
              <div className="h-2 w-2/3 rounded bg-white/10" />

              <div className="mt-2 h-1.5 w-full rounded bg-white/5" />

              <div className="mt-1.5 h-1.5 w-5/6 rounded bg-white/5" />

              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="h-10 rounded bg-cyan-400/5" />

                <div className="h-10 rounded bg-white/[0.03]" />

                <div className="h-10 rounded bg-white/[0.03]" />
              </div>
            </div>
          </div>
        </button>

        <div
          className="
            mt-4 flex items-center justify-between
            border-t border-white/[0.10]
            pt-4
          "
        >
          <div className="flex items-center gap-3 text-[10px] text-slate-600">
            <span>
              {document.pages || "—"} pages
            </span>

            <span>
              {document.size}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] text-slate-600">
            <Clock3 size={11} />

            {isSample
              ? "Preview"
              : document.updatedAt}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========================================================= */
/* INSIGHT ITEM */
/* ========================================================= */

function InsightItem({
  icon: Icon,
  title,
  description,
  href,
}: {
  icon: typeof WandSparkles;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="
        group rounded-xl
        border border-white/[0.10]
        bg-white/[0.025]
        p-3
        transition
        hover:border-cyan-400/25
        hover:bg-white/[0.04]
      "
    >
      <div
        className="
          flex h-8 w-8
          items-center justify-center
          rounded-lg
          border border-cyan-400/10
          bg-cyan-400/10
          text-cyan-300
        "
      >
        <Icon size={14} />
      </div>

      <div className="mt-3 text-xs font-medium text-slate-200">
        {title}
      </div>

      <div className="mt-1 text-[10px] leading-4 text-slate-600">
        {description}
      </div>
    </Link>
  );
}

/* ========================================================= */
/* STATUS ROW */
/* ========================================================= */

function StatusRow({
  label,
}: {
  label: string;
}) {
  return (
    <div
      className="
        flex items-center justify-between
        border-b border-white/[0.10]
        pb-3
        last:border-0
        last:pb-0
      "
    >
      <span className="text-xs text-slate-400">
        {label}
      </span>

      <span className="flex items-center gap-1.5 text-[10px] text-emerald-300">
        <CheckCircle2 size={12} />
        Ready
      </span>
    </div>
  );
}

/* ========================================================= */
/* CAPABILITY CARD */
/* ========================================================= */

function CapabilityCard({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof FolderOpen;
  title: string;
  text: string;
}) {
  return (
    <div
      className="
        rounded-2xl
        border border-white/[0.14]
        bg-white/[0.02]
        p-5
        transition
        hover:border-white/[0.20]
      "
    >
      <div
        className="
          flex h-9 w-9
          items-center justify-center
          rounded-lg
          border border-cyan-400/10
          bg-white/[0.04]
          text-cyan-300
        "
      >
        <Icon size={16} />
      </div>

      <h3 className="mt-4 text-sm font-semibold text-slate-200">
        {title}
      </h3>

      <p className="mt-2 text-xs leading-5 text-slate-600">
        {text}
      </p>
    </div>
  );
}