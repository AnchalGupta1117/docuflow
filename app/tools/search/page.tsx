"use client";

import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clipboard,
  Download,
  FileSearch,
  FileText,
  Loader2,
  Search,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";

type PdfJsModule = typeof import("pdfjs-dist");

type IndexedDocument = {
  id: string;
  file: File;
  text: string;
  pages: number;
  wordCount: number;
};

type SearchMatch = {
  documentId: string;
  documentName: string;
  pageNumber: number;
  index: number;
  snippetBefore: string;
  match: string;
  snippetAfter: string;
};

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const MAX_FILES = 20;
const MAX_RESULTS = 200;

async function loadPdfJs(): Promise<PdfJsModule> {
  const module = await import("pdfjs-dist");

  const pdfjsModule = module as unknown as PdfJsModule;

  pdfjsModule.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();

  return pdfjsModule;
}

function createId() {
  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function normalizeText(text: string) {
  return text
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function countWords(text: string) {
  return (
    normalizeText(text)
      .match(
        /[a-zA-Z0-9]+(?:['’-][a-zA-Z0-9]+)*/g
      )?.length ?? 0
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileNameWithoutExtension(name: string) {
  return name.replace(/\.[^/.]+$/, "");
}

function escapeRegExp(value: string) {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
}

function getPageNumberAtPosition(
  text: string,
  position: number
) {
  const pageMarkers = [
    ...text.matchAll(
      /--- Page (\d+) ---/g
    ),
  ];

  let pageNumber = 1;

  for (const marker of pageMarkers) {
    const markerIndex = marker.index ?? 0;

    if (markerIndex <= position) {
      pageNumber = Number(marker[1]);
    } else {
      break;
    }
  }

  return pageNumber;
}

function createSnippet(
  text: string,
  matchIndex: number,
  queryLength: number
) {
  const CONTEXT = 110;

  const start = Math.max(
    0,
    matchIndex - CONTEXT
  );

  const end = Math.min(
    text.length,
    matchIndex + queryLength + CONTEXT
  );

  let snippet = text.slice(start, end);

  if (start > 0) {
    snippet = `…${snippet}`;
  }

  if (end < text.length) {
    snippet = `${snippet}…`;
  }

  const adjustedMatchIndex =
    matchIndex - start + (start > 0 ? 1 : 0);

  const before = snippet.slice(
    0,
    adjustedMatchIndex
  );

  const match = snippet.slice(
    adjustedMatchIndex,
    adjustedMatchIndex + queryLength
  );

  const after = snippet.slice(
    adjustedMatchIndex + queryLength
  );

  return {
    before,
    match,
    after,
  };
}

async function extractPdfText(
  file: File,
  onProgress?: (progress: number) => void
) {
  const pdfjsLib = await loadPdfJs();

  const arrayBuffer = await file.arrayBuffer();

  const pdf = await pdfjsLib.getDocument({
    data: arrayBuffer,
  }).promise;

  let completeText = "";

  for (
    let pageNumber = 1;
    pageNumber <= pdf.numPages;
    pageNumber++
  ) {
    const page = await pdf.getPage(pageNumber);

    const textContent =
      await page.getTextContent();

    const pageText = textContent.items
      .map((item) => {
        if ("str" in item) {
          return item.str;
        }

        return "";
      })
      .join(" ");

    completeText += `

--- Page ${pageNumber} ---

${pageText}`;

    onProgress?.(
      Math.round(
        (pageNumber / pdf.numPages) * 100
      )
    );
  }

  const text = normalizeText(
    completeText
  );

  return {
    text,
    pages: pdf.numPages,
    wordCount: countWords(text),
  };
}

export default function SmartDocumentSearchPage() {
  const [documents, setDocuments] = useState<
    IndexedDocument[]
  >([]);

  const [searchQuery, setSearchQuery] =
    useState("");

  const [activeQuery, setActiveQuery] =
    useState("");

  const [searching, setSearching] =
    useState(false);

  const [indexing, setIndexing] =
    useState(false);

  const [indexProgress, setIndexProgress] =
    useState(0);

  const [currentFileName, setCurrentFileName] =
    useState("");

  const [matches, setMatches] = useState<
    SearchMatch[]
  >([]);

  const [selectedMatchIndex, setSelectedMatchIndex] =
    useState(0);

  const [error, setError] = useState("");

  const [success, setSuccess] =
    useState("");

  const [dragging, setDragging] =
    useState(false);

  const fileInputRef =
    useRef<HTMLInputElement>(null);

  const selectedMatch =
    matches[selectedMatchIndex] ?? null;

  const documentMatchCounts = useMemo(() => {
    const counts = new Map<string, number>();

    for (const match of matches) {
      counts.set(
        match.documentId,
        (counts.get(match.documentId) ?? 0) + 1
      );
    }

    return counts;
  }, [matches]);

  async function addFiles(
    incomingFiles: FileList | File[]
  ) {
    const files = Array.from(incomingFiles);

    if (!files.length) {
      return;
    }

    setError("");
    setSuccess("");

    if (
      documents.length + files.length >
      MAX_FILES
    ) {
      setError(
        `You can search up to ${MAX_FILES} PDFs at a time.`
      );
      return;
    }

    const validFiles: File[] = [];

    for (const file of files) {
      const isPdf =
        file.type === "application/pdf" ||
        file.name
          .toLowerCase()
          .endsWith(".pdf");

      if (!isPdf) {
        setError(
          `"${file.name}" is not a PDF file.`
        );
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        setError(
          `"${file.name}" is larger than 50 MB.`
        );
        continue;
      }

      const duplicate = documents.some(
        (document) =>
          document.file.name === file.name &&
          document.file.size === file.size &&
          document.file.lastModified ===
            file.lastModified
      );

      if (duplicate) {
        continue;
      }

      validFiles.push(file);
    }

    if (!validFiles.length) {
      return;
    }

    setIndexing(true);
    setIndexProgress(0);

    const newDocuments: IndexedDocument[] = [];

    try {
      for (
        let i = 0;
        i < validFiles.length;
        i++
      ) {
        const file = validFiles[i];

        setCurrentFileName(file.name);

        const baseProgress =
          (i / validFiles.length) * 100;

        const result =
          await extractPdfText(
            file,
            (fileProgress) => {
              const overallProgress =
                baseProgress +
                (fileProgress /
                  100 /
                  validFiles.length) *
                  100;

              setIndexProgress(
                Math.min(
                  100,
                  Math.round(overallProgress)
                )
              );
            }
          );

        if (!result.text.trim()) {
          continue;
        }

        newDocuments.push({
          id: createId(),
          file,
          text: result.text,
          pages: result.pages,
          wordCount: result.wordCount,
        });
      }

      setDocuments((previous) => [
        ...previous,
        ...newDocuments,
      ]);

      setIndexProgress(100);

      if (newDocuments.length) {
        setSuccess(
          `${newDocuments.length} document${
            newDocuments.length === 1
              ? ""
              : "s"
          } indexed and ready to search.`
        );
      }

      const skipped =
        validFiles.length -
        newDocuments.length;

      if (skipped > 0) {
        setError(
          `${skipped} document${
            skipped === 1 ? "" : "s"
          } contained no selectable text. OCR may be required for scanned PDFs.`
        );
      }
    } catch (indexError) {
      console.error(indexError);

      setError(
        indexError instanceof Error
          ? indexError.message
          : "Unable to index the selected PDFs."
      );
    } finally {
      setIndexing(false);
      setCurrentFileName("");
    }
  }

  function removeDocument(id: string) {
    setDocuments((previous) =>
      previous.filter(
        (document) => document.id !== id
      )
    );

    setMatches((previous) =>
      previous.filter(
        (match) => match.documentId !== id
      )
    );

    setSelectedMatchIndex(0);
  }

  function clearDocuments() {
    setDocuments([]);
    setMatches([]);
    setActiveQuery("");
    setSearchQuery("");
    setSelectedMatchIndex(0);
    setError("");
    setSuccess("");
  }

  function performSearch() {
    const query = searchQuery.trim();

    if (!query) {
      setError(
        "Enter a word or phrase to search for."
      );
      return;
    }

    if (!documents.length) {
      setError(
        "Upload at least one PDF before searching."
      );
      return;
    }

    setSearching(true);
    setError("");
    setSuccess("");

    /*
     * Escape the query so special regex characters
     * are treated as literal search characters.
     */
    const escapedQuery =
      escapeRegExp(query);

    const regex = new RegExp(
      escapedQuery,
      "gi"
    );

    const nextMatches: SearchMatch[] = [];

    for (const document of documents) {
      if (nextMatches.length >= MAX_RESULTS) {
        break;
      }

      const text = document.text;

      regex.lastIndex = 0;

      let result: RegExpExecArray | null;

      while (
        (result = regex.exec(text)) !== null
      ) {
        if (
          nextMatches.length >=
          MAX_RESULTS
        ) {
          break;
        }

        const index = result.index;

        const pageNumber =
          getPageNumberAtPosition(
            text,
            index
          );

        const snippet =
          createSnippet(
            text,
            index,
            result[0].length
          );

        nextMatches.push({
          documentId: document.id,
          documentName:
            document.file.name,
          pageNumber,
          index,
          snippetBefore:
            snippet.before,
          match: snippet.match,
          snippetAfter:
            snippet.after,
        });

        /*
         * Prevent an infinite loop if an empty
         * query somehow reaches this point.
         */
        if (result[0].length === 0) {
          regex.lastIndex++;
        }
      }
    }

    setMatches(nextMatches);
    setActiveQuery(query);
    setSelectedMatchIndex(0);
    setSearching(false);

    if (!nextMatches.length) {
      setSuccess("");
      return;
    }

    setSuccess(
      `${nextMatches.length}${
        nextMatches.length >= MAX_RESULTS
          ? "+"
          : ""
      } match${
        nextMatches.length === 1
          ? ""
          : "es"
      } found.`
    );
  }

  function goToPreviousMatch() {
    if (!matches.length) return;

    setSelectedMatchIndex(
      (current) =>
        current === 0
          ? matches.length - 1
          : current - 1
    );
  }

  function goToNextMatch() {
    if (!matches.length) return;

    setSelectedMatchIndex(
      (current) =>
        current === matches.length - 1
          ? 0
          : current + 1
    );
  }

  function createSearchReport() {
    if (!activeQuery) {
      return "";
    }

    const lines = [
      "DOCUFLOW — SMART DOCUMENT SEARCH",
      "",
      `Search query: ${activeQuery}`,
      `Documents searched: ${documents.length}`,
      `Matches found: ${matches.length}`,
      "",
      "RESULTS",
      "",
    ];

    matches.forEach((match, index) => {
      lines.push(
        `${index + 1}. ${match.documentName}`
      );

      lines.push(
        `Page: ${match.pageNumber}`
      );

      lines.push(
        `Context: ${match.snippetBefore}${match.match}${match.snippetAfter}`
      );

      lines.push("");
    });

    return lines.join("\n");
  }

  async function copySearchResults() {
    const report = createSearchReport();

    if (!report) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        report
      );

      setSuccess(
        "Search results copied to clipboard."
      );
    } catch {
      setError(
        "Unable to copy the search results."
      );
    }
  }

  function downloadSearchReport() {
    const report = createSearchReport();

    if (!report) {
      return;
    }

    const blob = new Blob([report], {
      type: "text/plain;charset=utf-8",
    });

    const url =
      URL.createObjectURL(blob);

    const anchor =
      document.createElement("a");

    anchor.href = url;
    anchor.download =
      "docuflow-search-results.txt";

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    URL.revokeObjectURL(url);

    setSuccess(
      "Search report downloaded."
    );
  }

  function handleSearchKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (event.key === "Enter") {
      event.preventDefault();
      performSearch();
    }
  }

  function renderHighlightedSnippet(
    match: SearchMatch
  ) {
    return (
      <p className="text-sm leading-7 text-slate-300">
        <span className="text-slate-500">
          {match.snippetBefore}
        </span>

        <mark className="rounded-md bg-cyan-400/20 px-1 py-0.5 font-semibold text-cyan-200">
          {match.match}
        </mark>

        <span className="text-slate-500">
          {match.snippetAfter}
        </span>
      </p>
    );
  }

  return (
    <main className="min-h-screen bg-[#020617] text-white">
      <div className="background-grid fixed inset-0 opacity-30" />

      <div className="relative z-10">
        <header className="sticky top-0 z-30 border-b border-white/10 bg-[#020617]/90 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                Dashboard
              </Link>

              <div className="hidden h-5 w-px bg-white/10 sm:block" />

              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-300">
                  <FileSearch className="h-4 w-4" />
                </div>

                <span className="font-semibold tracking-tight">
                  Smart Document Search
                </span>
              </div>
            </div>

            {documents.length > 0 && (
              <button
                onClick={clearDocuments}
                className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 transition hover:border-white/20 hover:bg-white/5 hover:text-white"
              >
                Clear all
              </button>
            )}
          </div>
        </header>

        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="mb-8 max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/5 px-3 py-1.5 text-xs font-medium text-cyan-300">
              <Search className="h-3.5 w-3.5" />
              Workspace search
            </div>

            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Find anything across your documents
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-400 sm:text-base">
              Upload your PDFs once, then search
              across all of them from one place.
              Everything is processed locally in
              your browser.
            </p>
          </div>

          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-400/20 bg-red-400/5 p-4 text-sm text-red-200">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />

              <div className="flex-1">
                {error}
              </div>

              <button
                onClick={() => setError("")}
                className="text-red-300 transition hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {success && (
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4 text-sm text-emerald-200">
              <CheckCircle2 className="h-5 w-5 text-emerald-300" />

              <span>{success}</span>
            </div>
          )}

          <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end">
              <div className="flex-1">
                <label
                  htmlFor="document-search"
                  className="mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-slate-500"
                >
                  Search documents
                </label>

                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />

                  <input
                    id="document-search"
                    value={searchQuery}
                    onChange={(event) =>
                      setSearchQuery(
                        event.target.value
                      )
                    }
                    onKeyDown={
                      handleSearchKeyDown
                    }
                    placeholder="Search for a word or phrase..."
                    className="w-full rounded-xl border border-white/10 bg-black/20 py-3.5 pl-12 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/40 focus:bg-black/30"
                  />
                </div>
              </div>

              <button
                onClick={performSearch}
                disabled={
                  searching ||
                  indexing ||
                  !documents.length
                }
                className="inline-flex h-[50px] items-center justify-center gap-2 rounded-xl bg-cyan-400 px-6 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {searching ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    Search
                  </>
                )}
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
              <span>
                Press Enter to search
              </span>

              <span>•</span>

              <span>
                Searches all indexed PDFs
              </span>

              <span>•</span>

              <span>
                Case-insensitive
              </span>
            </div>
          </section>

          <section className="mt-6">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                  Document library
                </p>

                <h2 className="mt-1 text-lg font-semibold">
                  {documents.length
                    ? `${documents.length} indexed ${
                        documents.length === 1
                          ? "document"
                          : "documents"
                      }`
                    : "No documents indexed"}
                </h2>
              </div>

              <button
                onClick={() =>
                  fileInputRef.current?.click()
                }
                disabled={indexing}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white disabled:opacity-50"
              >
                <FileText className="h-4 w-4" />
                Add PDFs
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(event) => {
                if (event.target.files) {
                  addFiles(event.target.files);
                }

                event.target.value = "";
              }}
            />

            {indexing && (
              <div className="mb-5 rounded-xl border border-cyan-400/15 bg-cyan-400/[0.025] p-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-cyan-300" />

                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-4 text-xs">
                      <span className="truncate text-slate-300">
                        Indexing{" "}
                        {currentFileName ||
                          "documents"}
                      </span>

                      <span className="text-slate-500">
                        {indexProgress}%
                      </span>
                    </div>

                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-cyan-400 transition-all"
                        style={{
                          width: `${indexProgress}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {documents.length === 0 ? (
              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() =>
                  setDragging(false)
                }
                onDrop={(event) => {
                  event.preventDefault();
                  setDragging(false);

                  addFiles(
                    event.dataTransfer.files
                  );
                }}
                className={`rounded-2xl border border-dashed p-10 text-center transition sm:p-14 ${
                  dragging
                    ? "border-cyan-400 bg-cyan-400/10"
                    : "border-white/10 bg-white/[0.015]"
                }`}
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300">
                  <FileSearch className="h-6 w-6" />
                </div>

                <h3 className="mt-5 text-base font-semibold">
                  Upload documents to start searching
                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                  Drag and drop multiple PDFs here,
                  or browse your computer. Your
                  documents stay in your browser while
                  you search.
                </p>

                <button
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  className="mt-6 inline-flex items-center gap-2 rounded-lg bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/10"
                >
                  <FileText className="h-4 w-4" />
                  Choose PDF files
                </button>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {documents.map((document) => {
                  const matchCount =
                    documentMatchCounts.get(
                      document.id
                    ) ?? 0;

                  return (
                    <div
                      key={document.id}
                      className="group rounded-xl border border-white/10 bg-white/[0.02] p-4 transition hover:border-white/15 hover:bg-white/[0.035]"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-400/10 text-red-300">
                          <FileText className="h-5 w-5" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-white">
                                {
                                  document.file
                                    .name
                                }
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                {document.pages}{" "}
                                {document.pages ===
                                1
                                  ? "page"
                                  : "pages"}{" "}
                                ·{" "}
                                {document.wordCount.toLocaleString()}{" "}
                                words ·{" "}
                                {formatBytes(
                                  document.file
                                    .size
                                )}
                              </p>
                            </div>

                            <button
                              onClick={() =>
                                removeDocument(
                                  document.id
                                )
                              }
                              className="rounded-lg p-2 text-slate-600 transition hover:bg-red-400/10 hover:text-red-300"
                              title="Remove document"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>

                          {activeQuery &&
                            matchCount > 0 && (
                              <div className="mt-3 inline-flex items-center rounded-full border border-cyan-400/15 bg-cyan-400/5 px-2.5 py-1 text-xs text-cyan-300">
                                {matchCount}{" "}
                                {matchCount ===
                                1
                                  ? "match"
                                  : "matches"}
                              </div>
                            )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {documents.length <
                  MAX_FILES && (
                  <button
                    onClick={() =>
                      fileInputRef.current?.click()
                    }
                    className="flex min-h-[100px] items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 bg-white/[0.01] text-sm text-slate-500 transition hover:border-white/20 hover:bg-white/[0.02] hover:text-slate-300"
                  >
                    <FileText className="h-4 w-4" />
                    Add another PDF
                  </button>
                )}
              </div>
            )}
          </section>

          {activeQuery && (
            <section className="mt-10">
              <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-cyan-300">
                    Search results
                  </p>

                  <h2 className="mt-1 text-2xl font-semibold">
                    Results for{" "}
                    <span className="text-cyan-300">
                      “{activeQuery}”
                    </span>
                  </h2>

                  <p className="mt-2 text-xs text-slate-500">
                    {matches.length
                      ? `${matches.length}${
                          matches.length >=
                          MAX_RESULTS
                            ? "+"
                            : ""
                        } matches across ${
                          new Set(
                            matches.map(
                              (match) =>
                                match.documentId
                            )
                          ).size
                        } documents`
                      : "No matching content found"}
                  </p>
                </div>

                {matches.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={
                        copySearchResults
                      }
                      className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
                    >
                      <Clipboard className="h-4 w-4" />
                      Copy
                    </button>

                    <button
                      onClick={
                        downloadSearchReport
                      }
                      className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </button>
                  </div>
                )}
              </div>

              {matches.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.015] p-10 text-center">
                  <Search className="mx-auto h-8 w-8 text-slate-700" />

                  <h3 className="mt-4 text-sm font-semibold text-slate-400">
                    No matches found
                  </h3>

                  <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-slate-600">
                    Try a different word or phrase.
                    Search is case-insensitive and
                    works across all indexed documents.
                  </p>
                </div>
              ) : (
                <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
                  <div className="space-y-3">
                    {matches.map(
                      (match, index) => (
                        <button
                          key={`${match.documentId}-${match.index}-${index}`}
                          onClick={() =>
                            setSelectedMatchIndex(
                              index
                            )
                          }
                          className={`w-full rounded-xl border p-5 text-left transition ${
                            index ===
                            selectedMatchIndex
                              ? "border-cyan-400/30 bg-cyan-400/[0.045]"
                              : "border-white/10 bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.035]"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-300">
                              <FileText className="h-4 w-4" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                <p className="truncate text-sm font-medium text-white">
                                  {
                                    match.documentName
                                  }
                                </p>

                                <span className="text-xs text-slate-600">
                                  Page{" "}
                                  {
                                    match.pageNumber
                                  }
                                </span>
                              </div>

                              <div className="mt-3">
                                {renderHighlightedSnippet(
                                  match
                                )}
                              </div>
                            </div>

                            <span className="hidden shrink-0 text-xs text-slate-600 sm:block">
                              #{index + 1}
                            </span>
                          </div>
                        </button>
                      )
                    )}
                  </div>

                  <aside className="h-fit rounded-2xl border border-white/10 bg-white/[0.025] p-5 lg:sticky lg:top-24">
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                      Result navigator
                    </p>

                    <div className="mt-3">
                      <p className="text-2xl font-bold text-white">
                        {selectedMatchIndex +
                          1}
                        <span className="text-sm font-normal text-slate-600">
                          {" "}
                          / {matches.length}
                        </span>
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Current match
                      </p>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-2">
                      <button
                        onClick={
                          goToPreviousMatch
                        }
                        disabled={
                          !matches.length
                        }
                        className="rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/5 disabled:opacity-40"
                      >
                        Previous
                      </button>

                      <button
                        onClick={goToNextMatch}
                        disabled={
                          !matches.length
                        }
                        className="rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/5 disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>

                    {selectedMatch && (
                      <div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-4">
                        <p className="truncate text-xs font-medium text-slate-300">
                          {
                            selectedMatch.documentName
                          }
                        </p>

                        <p className="mt-1 text-xs text-slate-600">
                          Page{" "}
                          {
                            selectedMatch.pageNumber
                          }
                        </p>

                        <div className="mt-4 h-px bg-white/10" />

                        <p className="mt-4 text-xs uppercase tracking-[0.14em] text-slate-600">
                          Matched text
                        </p>

                        <p className="mt-2 rounded-lg bg-cyan-400/5 px-3 py-2 text-sm font-semibold text-cyan-200">
                          {
                            selectedMatch.match
                          }
                        </p>
                      </div>
                    )}

                    <div className="mt-5 border-t border-white/10 pt-5">
                      <p className="text-xs uppercase tracking-[0.14em] text-slate-600">
                        Search scope
                      </p>

                      <div className="mt-3 space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">
                            Documents
                          </span>

                          <span className="text-slate-300">
                            {documents.length}
                          </span>
                        </div>

                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">
                            Pages
                          </span>

                          <span className="text-slate-300">
                            {documents.reduce(
                              (
                                total,
                                document
                              ) =>
                                total +
                                document.pages,
                              0
                            )}
                          </span>
                        </div>

                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">
                            Matches
                          </span>

                          <span className="text-cyan-300">
                            {matches.length}
                            {matches.length >=
                            MAX_RESULTS
                              ? "+"
                              : ""}
                          </span>
                        </div>
                      </div>
                    </div>
                  </aside>
                </div>
              )}
            </section>
          )}

          {!activeQuery &&
            documents.length > 0 && (
              <section className="mt-10 rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
                <Search className="mx-auto h-8 w-8 text-slate-700" />

                <h3 className="mt-4 text-sm font-semibold text-slate-400">
                  Your documents are ready
                </h3>

                <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-slate-600">
                  Enter a word or phrase above to
                  search across all indexed PDFs at
                  once.
                </p>
              </section>
            )}
        </section>
      </div>
    </main>
  );
}