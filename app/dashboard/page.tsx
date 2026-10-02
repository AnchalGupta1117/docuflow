"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { saveDocumentFile } from "@/lib/document-store";
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
} from "lucide-react";

import UploadZone from "@/components/UploadZone";
import ToolCard from "@/components/ToolCard";
import { formatFileSize, createId } from "@/lib/utils";

interface DocumentItem {
  id: string;
  name: string;
  size: string;
  pages: number;
  updatedAt: string;
  category: string;
  file?: File;
}

const initialDocuments: DocumentItem[] = [
  {
    id: "predictive-maintenance",
    name: "Predictive Maintenance Report.pdf",
    size: "2.4 MB",
    pages: 28,
    updatedAt: "Today",
    category: "Project Report",
  },
  {
    id: "machine-learning-notes",
    name: "Machine Learning Notes.pdf",
    size: "1.8 MB",
    pages: 42,
    updatedAt: "Yesterday",
    category: "Study Material",
  },
  {
    id: "research-document-ai",
    name: "Research Paper — Document AI.pdf",
    size: "3.1 MB",
    pages: 17,
    updatedAt: "Sep 29",
    category: "Research",
  },
];

const tools = [
  {
    icon: Files,
    title: "Merge PDF",
    description: "Combine multiple PDF files into one document.",
    href: "/tools/merge",
  },
  {
    icon: Split,
    title: "Split PDF",
    description: "Extract selected pages or page ranges from a PDF.",
    href: "/tools/split",
  },
  {
    icon: FileArchive,
    title: "Compress PDF",
    description: "Reduce PDF size while preserving useful document quality.",
    href: "/tools/compress",
  },
  {
    icon: Pencil,
    title: "Edit PDF",
    description: "Delete, reorder and rotate PDF pages before exporting.",
    href: "/tools/edit-pdf",
  },
  {
    icon: FileImage,
    title: "PDF to Images",
    description: "Convert PDF pages into high-quality images.",
    href: "/tools/pdf-to-images",
  },
  {
    icon: Images,
    title: "Images to PDF",
    description: "Combine images into a downloadable PDF document.",
    href: "/tools/images-to-pdf",
  },
];

const aiTools = [
  {
    icon: WandSparkles,
    title: "AI Summary",
    description:
      "Generate a concise summary and key points from your document.",
    href: "/tools/ai-summary",
  },
  {
    icon: MessageSquareText,
    title: "Ask Questions",
    description: "Ask questions about the contents of your document.",
    href: "#ai-workspace",
  },
  {
    icon: Lightbulb,
    title: "Explain Simply",
    description:
      "Turn difficult document content into simple explanations.",
    href: "#ai-workspace",
  },
  {
    icon: FileSearch,
    title: "Find Key Info",
    description:
      "Identify important facts, terms, dates and sections.",
    href: "#ai-workspace",
  },
  {
    icon: Brain,
    title: "Document Insights",
    description:
      "Understand topics, structure, findings and important details.",
    href: "#ai-workspace",
  },
  {
    icon: GitCompare,
    title: "Compare Documents",
    description:
      "Compare two uploaded documents and identify differences.",
    href: "#ai-workspace",
  },
];

export default function DashboardPage() {
  const [documents, setDocuments] =
    useState<DocumentItem[]>(initialDocuments);

  const [searchQuery, setSearchQuery] = useState("");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const filteredDocuments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) return documents;

    return documents.filter(
      (document) =>
        document.name.toLowerCase().includes(query) ||
        document.category.toLowerCase().includes(query)
    );
  }, [documents, searchQuery]);

  function handleFilesSelected(files: File[]) {
    const pdfFiles = files.filter(
      (file) =>
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf")
    );

    if (!pdfFiles.length) return;

    setSelectedFiles((previous) => [...previous, ...pdfFiles]);
  }

  function handleAddToWorkspace() {
  if (!selectedFiles.length) return;

  const newDocuments: DocumentItem[] = selectedFiles.map((file) => {
    const id = createId("document");

    saveDocumentFile(id, file);

    return {
      id,
      name: file.name,
      size: formatFileSize(file.size),
      pages: 0,
      updatedAt: "Just now",
      category: "Uploaded Document",
      file,
    };
  });

  setDocuments((previous) => [...newDocuments, ...previous]);
  setSelectedFiles([]);
  setShowUploadModal(false);
}

  function removeSelectedFile(index: number) {
    setSelectedFiles((previous) =>
      previous.filter((_, fileIndex) => fileIndex !== index)
    );
  }

  function handleDelete(documentId: string) {
    setDocuments((previous) =>
      previous.filter((document) => document.id !== documentId)
    );
    setActiveMenu(null);
  }

  function handleRename(documentId: string) {
    const document = documents.find((item) => item.id === documentId);

    if (!document) return;

    const newName = window.prompt(
      "Enter a new document name:",
      document.name
    );

    if (!newName?.trim()) return;

    const trimmedName = newName.trim();

    setDocuments((previous) =>
      previous.map((item) =>
        item.id === documentId
          ? {
              ...item,
              name: trimmedName.endsWith(".pdf")
                ? trimmedName
                : `${trimmedName}.pdf`,
              updatedAt: "Just now",
            }
          : item
      )
    );

    setActiveMenu(null);
  }

  function handleDownload(document: DocumentItem) {
    if (!document.file) {
      window.alert(
        "This sample document is part of the dashboard preview. Upload a real PDF to enable direct downloading."
      );
      return;
    }

    const url = URL.createObjectURL(document.file);
    const anchor = window.document.createElement("a");

    anchor.href = url;
    anchor.download = document.file.name;
    window.document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    URL.revokeObjectURL(url);
    setActiveMenu(null);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-slate-950/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-400/20">
              <FileText size={19} strokeWidth={2.5} />
            </div>

            <div>
              <div className="text-sm font-bold tracking-tight text-white">
                DocuFlow
              </div>
              <div className="hidden text-[10px] text-slate-500 sm:block">
                AI Document Workspace
              </div>
            </div>
          </Link>

          <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 md:flex">
            <LayoutDashboard size={14} className="text-cyan-300" />
            <span className="text-xs font-medium text-slate-300">
              Workspace
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="hidden rounded-lg px-3 py-2 text-xs font-medium text-slate-400 transition hover:bg-white/5 hover:text-white sm:block"
            >
              Home
            </Link>

            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-slate-400 transition hover:border-white/15 hover:bg-white/[0.06] hover:text-white"
              title="Settings"
            >
              <Settings size={16} />
            </button>

            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-400/10 text-xs font-semibold text-cyan-300">
              AG
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-7 sm:px-6 lg:px-8">
        {/* Welcome Hero */}
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-400/[0.09] via-slate-900 to-violet-500/[0.07] p-6 sm:p-8">
          <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />

          <div className="relative grid gap-8 lg:grid-cols-[1.4fr_0.8fr] lg:items-center">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/15 bg-cyan-400/5 px-3 py-1.5 text-[11px] font-medium text-cyan-300">
                <Sparkles size={12} />
                Your document workspace
              </div>

              <h1 className="max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Welcome back
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
                Upload your documents, organize your files, use PDF tools, and
                let AI help you understand what&apos;s inside.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-xs font-semibold text-slate-950 transition hover:bg-cyan-300"
                >
                  <Upload size={15} />
                  Upload document
                </button>

                <Link
                  href="#ai-workspace"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs font-medium text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
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

        {/* Quick Access */}
        <section className="mt-10">
          <div className="mb-5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300">
              Quick access
            </div>

            <h2 className="mt-1 text-xl font-semibold text-white">
              Document tools
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {tools.map((tool) => (
              <ToolCard key={tool.title} {...tool} />
            ))}
          </div>
        </section>

        {/* Extended PDF actions */}
        <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
        </section>

        {/* Library */}
        <section className="mt-11">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300">
                Library
              </div>

              <h2 className="mt-1 text-xl font-semibold text-white">
                Recent documents
              </h2>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative">
                <Search
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                />

                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search documents..."
                  className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.025] pl-9 pr-3 text-xs text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/30 sm:w-60"
                />
              </div>

              <button
                type="button"
                onClick={() => setShowUploadModal(true)}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 text-xs font-medium text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
              >
                <Upload size={14} />
                Upload
              </button>
            </div>
          </div>

          {filteredDocuments.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredDocuments.map((document) => (
                <DocumentCard
                  key={document.id}
                  document={document}
                  menuOpen={activeMenu === document.id}
                  onMenu={() =>
                    setActiveMenu(
                      activeMenu === document.id ? null : document.id
                    )
                  }
                  onCloseMenu={() => setActiveMenu(null)}
                  onDelete={() => handleDelete(document.id)}
                  onRename={() => handleRename(document.id)}
                  onDownload={() => handleDownload(document)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-12 text-center">
              <FileSearch size={24} className="mx-auto text-slate-600" />

              <p className="mt-3 text-sm font-medium text-slate-300">
                No documents found
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Try another search or upload a new document.
              </p>
            </div>
          )}
        </section>

        {/* AI Workspace */}
        <section id="ai-workspace" className="mt-11">
          <div className="mb-5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300">
              AI workspace
            </div>

            <h2 className="mt-1 text-xl font-semibold text-white">
              Understand your documents
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {aiTools.map((tool) => {
              const Icon = tool.icon;

              return (
                <Link
                  key={tool.title}
                  href={tool.href}
                  className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025] p-5 transition hover:-translate-y-0.5 hover:border-cyan-400/20 hover:bg-white/[0.04]"
                >
                  <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-cyan-400/5 blur-2xl transition group-hover:bg-cyan-400/10" />

                  <div className="relative">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
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
                        Open workspace
                      </span>

                      <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/5 bg-white/[0.03] text-slate-500 transition group-hover:border-cyan-400/20 group-hover:bg-cyan-400/10 group-hover:text-cyan-300">
                        <ArrowRight size={14} />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Workspace Insight */}
        <section className="mt-11 grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
          <div className="relative overflow-hidden rounded-2xl border border-cyan-400/10 bg-gradient-to-br from-cyan-400/[0.07] to-transparent p-6">
            <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-cyan-400/10 blur-3xl" />

            <div className="relative">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
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
                  href="/tools/ai-summary"
                />

                <InsightItem
                  icon={MessageSquareText}
                  title="Ask questions"
                  description="Chat with your document"
                  href="#ai-workspace"
                />

                <InsightItem
                  icon={ScanText}
                  title="Find key info"
                  description="Extract useful details"
                  href="#ai-workspace"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
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

        {/* Capabilities */}
        <section className="mt-11 grid gap-4 md:grid-cols-3">
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

        {/* Footer */}
        <footer className="mt-14 border-t border-white/5 py-7">
          <div className="flex flex-col gap-3 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-cyan-400/10 text-cyan-300">
                <FileText size={12} />
              </div>

              <span>DocuFlow</span>
            </div>

            <span>Upload · Manage · Edit · Understand</span>
          </div>
        </footer>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-2xl shadow-black/40">
            <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
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
                onClick={() => {
                  setShowUploadModal(false);
                  setSelectedFiles([]);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white/5 hover:text-white"
              >
                <X size={17} />
              </button>
            </div>

            <div className="p-5">
              <UploadZone
                multiple
                maxSizeMB={50}
                acceptedTypes={["application/pdf"]}
                title="Drop your PDF files here"
                description="Upload one or multiple PDF documents. Maximum 50 MB per file."
                onFileSelect={(file) => handleFilesSelected([file])}
              />

              {selectedFiles.length > 0 && (
                <div className="mt-5">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300">
                      Selected files
                    </span>

                    <span className="text-[11px] text-slate-500">
                      {selectedFiles.length} file
                      {selectedFiles.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="max-h-48 space-y-2 overflow-y-auto">
                    {selectedFiles.map((file, index) => (
                      <div
                        key={`${file.name}-${index}`}
                        className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.025] px-3 py-2.5"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-300">
                            <FileText size={15} />
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-xs font-medium text-slate-200">
                              {file.name}
                            </p>

                            <p className="mt-0.5 text-[10px] text-slate-600">
                              {formatFileSize(file.size)}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeSelectedFile(index)}
                          className="ml-3 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-red-400/10 hover:text-red-300"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false);
                    setSelectedFiles([]);
                  }}
                  className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs font-medium text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={!selectedFiles.length}
                  onClick={handleAddToWorkspace}
                  className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-xs font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <FilePlus2 size={14} />
                  Add to workspace
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

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
    <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4 backdrop-blur">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04] text-cyan-300">
        <Icon size={15} />
      </div>

      <div className="mt-4 text-sm font-semibold text-white">{value}</div>

      <div className="mt-0.5 text-[10px] text-slate-500">{label}</div>
    </div>
  );
}

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
      className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3 transition hover:border-cyan-400/15 hover:bg-white/[0.04]"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-slate-400 transition group-hover:bg-cyan-400/10 group-hover:text-cyan-300">
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

function DocumentCard({
  document,
  menuOpen,
  onMenu,
  onCloseMenu,
  onDelete,
  onRename,
  onDownload,
}: {
  document: DocumentItem;
  menuOpen: boolean;
  onMenu: () => void;
  onCloseMenu: () => void;
  onDelete: () => void;
  onRename: () => void;
  onDownload: () => void;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025] transition hover:-translate-y-0.5 hover:border-white/15 hover:bg-white/[0.04]">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent opacity-0 transition group-hover:opacity-100" />

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <Link
            href={`/documents/${document.id}`}
            className="flex min-w-0 items-center gap-3"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
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
          </Link>

          <div className="relative">
            <button
              type="button"
              onClick={onMenu}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white/5 hover:text-white"
              title="More options"
            >
              <MoreHorizontal size={17} />
            </button>

            {menuOpen && (
              <>
                <button
                  type="button"
                  aria-label="Close menu"
                  onClick={onCloseMenu}
                  className="fixed inset-0 z-10 cursor-default"
                />

                <div className="absolute right-0 top-9 z-20 w-40 overflow-hidden rounded-xl border border-white/10 bg-slate-900 py-1 shadow-2xl">
                  <Link
                    href={`/documents/${document.id}`}
                    onClick={onCloseMenu}
                    className="flex items-center gap-2 px-3 py-2 text-xs text-slate-400 transition hover:bg-white/5 hover:text-white"
                  >
                    <Eye size={13} />
                    Open
                  </Link>

                  <button
                    type="button"
                    onClick={onRename}
                    className="flex w-full items-center gap-2 px-3 py-2 text-xs text-slate-400 transition hover:bg-white/5 hover:text-white"
                  >
                    <Pencil size={13} />
                    Rename
                  </button>

                  <button
                    type="button"
                    onClick={onDownload}
                    className="flex w-full items-center gap-2 px-3 py-2 text-xs text-slate-400 transition hover:bg-white/5 hover:text-white"
                  >
                    <Download size={13} />
                    Download
                  </button>

                  <button
                    type="button"
                    onClick={onDelete}
                    className="flex w-full items-center gap-2 px-3 py-2 text-xs text-red-400 transition hover:bg-red-400/10"
                  >
                    <Trash2 size={13} />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <Link href={`/documents/${document.id}`} className="block">
          <div className="mt-5 h-28 overflow-hidden rounded-xl border border-white/5 bg-slate-950/70">
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
        </Link>

        <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-4">
          <div className="flex items-center gap-3 text-[10px] text-slate-600">
            <span>{document.pages || "—"} pages</span>
            <span>{document.size}</span>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] text-slate-600">
            <Clock3 size={11} />
            {document.updatedAt}
          </div>
        </div>
      </div>
    </div>
  );
}

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
      className="group rounded-xl border border-white/5 bg-white/[0.025] p-3 transition hover:border-cyan-400/15 hover:bg-white/[0.04]"
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-300">
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

function StatusRow({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-between border-b border-white/5 pb-3 last:border-0 last:pb-0">
      <span className="text-xs text-slate-400">{label}</span>

      <span className="flex items-center gap-1.5 text-[10px] text-emerald-300">
        <CheckCircle2 size={12} />
        Ready
      </span>
    </div>
  );
}

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
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.04] text-cyan-300">
        <Icon size={16} />
      </div>

      <h3 className="mt-4 text-sm font-semibold text-slate-200">
        {title}
      </h3>

      <p className="mt-2 text-xs leading-5 text-slate-600">{text}</p>
    </div>
  );
}