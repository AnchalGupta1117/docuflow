"use client";

import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clipboard,
  Download,
  FileText,
  GitCompare,
  Loader2,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { useRef, useState } from "react";

type ComparisonResult = {
  textOverlap: number;
  coverageA: number;
  coverageB: number;

  commonWords: string[];
  onlyA: string[];
  onlyB: string[];

  totalWordsA: number;
  totalWordsB: number;

  uniqueWordsA: number;
  uniqueWordsB: number;
  commonWordCount: number;
};

type PdfJsModule = typeof import("pdfjs-dist");

function normalizeText(text: string) {
  return text
    .replace(/\s+/g, " ")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .trim();
}

function getWords(text: string) {
  return (
    normalizeText(text)
      .toLowerCase()
      .match(/[a-zA-Z0-9]+(?:['’-][a-zA-Z0-9]+)*/g) ?? []
  );
}

function compareTexts(
  textA: string,
  textB: string
): ComparisonResult {
  const wordsA = getWords(textA);
  const wordsB = getWords(textB);

  const uniqueA = new Set(wordsA);
  const uniqueB = new Set(wordsB);

  const common = [...uniqueA].filter((word) =>
    uniqueB.has(word)
  );

  const onlyA = [...uniqueA].filter(
    (word) => !uniqueB.has(word)
  );

  const onlyB = [...uniqueB].filter(
    (word) => !uniqueA.has(word)
  );

  const totalUniqueWords = new Set([
    ...uniqueA,
    ...uniqueB,
  ]).size;

  /*
   * Text overlap:
   * Jaccard-style comparison using distinct words.
   *
   * This is useful as a general overlap signal, but it is
   * NOT a semantic similarity score.
   */
  const textOverlap =
    totalUniqueWords === 0
      ? 0
      : Math.round(
          (common.length / totalUniqueWords) * 100
        );

  /*
   * Coverage:
   *
   * coverageB answers:
   * "How much of Document B's vocabulary is also present in A?"
   *
   * coverageA answers:
   * "How much of Document A's vocabulary is also present in B?"
   *
   * This is much more useful when one document is a smaller
   * extracted section of another document.
   */
  const coverageA =
    uniqueA.size === 0
      ? 0
      : Math.round(
          (common.length / uniqueA.size) * 100
        );

  const coverageB =
    uniqueB.size === 0
      ? 0
      : Math.round(
          (common.length / uniqueB.size) * 100
        );

  return {
    textOverlap,
    coverageA,
    coverageB,

    commonWords: common,
    onlyA,
    onlyB,

    totalWordsA: wordsA.length,
    totalWordsB: wordsB.length,

    uniqueWordsA: uniqueA.size,
    uniqueWordsB: uniqueB.size,

    commonWordCount: common.length,
  };
}

async function loadPdfJs(): Promise<PdfJsModule> {
  const module = await import("pdfjs-dist");

  const pdfjsModule = module as unknown as PdfJsModule;

  pdfjsModule.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();

  return pdfjsModule;
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

    const textContent = await page.getTextContent();

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
      Math.round((pageNumber / pdf.numPages) * 100)
    );
  }

  return {
    text: normalizeText(completeText),
    pages: pdf.numPages,
  };
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

function getPreviewItems(
  items: string[],
  limit = 100
) {
  return items.slice(0, limit);
}

function formatWordList(
  items: string[],
  emptyText: string,
  limit = 100
) {
  if (!items.length) {
    return emptyText;
  }

  const visibleItems = getPreviewItems(items, limit);

  return `${visibleItems.join(", ")}${
    items.length > limit
      ? ` … +${items.length - limit} more`
      : ""
  }`;
}

export default function CompareDocumentsPage() {
  const [fileA, setFileA] = useState<File | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);

  const [draggingA, setDraggingA] = useState(false);
  const [draggingB, setDraggingB] = useState(false);

  const [extracting, setExtracting] = useState(false);

  const [extractProgressA, setExtractProgressA] =
    useState(0);

  const [extractProgressB, setExtractProgressB] =
    useState(0);

  const [comparison, setComparison] =
    useState<ComparisonResult | null>(null);

  const [textA, setTextA] = useState("");
  const [textB, setTextB] = useState("");

  const [pagesA, setPagesA] = useState(0);
  const [pagesB, setPagesB] = useState(0);

  const [aiResult, setAiResult] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fileInputA =
    useRef<HTMLInputElement>(null);

  const fileInputB =
    useRef<HTMLInputElement>(null);

  function validateFile(file: File) {
    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      return "Please select a PDF file.";
    }

    if (file.size > 50 * 1024 * 1024) {
      return "Each PDF must be smaller than 50 MB.";
    }

    return "";
  }

  function handleFileA(file: File | undefined) {
    if (!file) return;

    const validationError = validateFile(file);

    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setSuccess("");
    setComparison(null);
    setAiResult("");
    setTextA("");
    setPagesA(0);
    setFileA(file);
  }

  function handleFileB(file: File | undefined) {
    if (!file) return;

    const validationError = validateFile(file);

    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setSuccess("");
    setComparison(null);
    setAiResult("");
    setTextB("");
    setPagesB(0);
    setFileB(file);
  }

  function removeFileA() {
    setFileA(null);
    setComparison(null);
    setAiResult("");
    setTextA("");
    setPagesA(0);
    setExtractProgressA(0);

    if (fileInputA.current) {
      fileInputA.current.value = "";
    }
  }

  function removeFileB() {
    setFileB(null);
    setComparison(null);
    setAiResult("");
    setTextB("");
    setPagesB(0);
    setExtractProgressB(0);

    if (fileInputB.current) {
      fileInputB.current.value = "";
    }
  }

  async function runComparison() {
    if (!fileA || !fileB) {
      setError(
        "Please upload both PDF documents before comparing them."
      );
      return;
    }

    if (
      fileA.name === fileB.name &&
      fileA.size === fileB.size &&
      fileA.lastModified === fileB.lastModified
    ) {
      setError(
        "Please choose two different PDF documents to compare."
      );
      return;
    }

    setExtracting(true);
    setError("");
    setSuccess("");
    setComparison(null);
    setAiResult("");

    setExtractProgressA(0);
    setExtractProgressB(0);

    try {
      const [resultA, resultB] =
        await Promise.all([
          extractPdfText(
            fileA,
            setExtractProgressA
          ),
          extractPdfText(
            fileB,
            setExtractProgressB
          ),
        ]);

      if (!resultA.text.trim()) {
        throw new Error(
          "Document A does not contain selectable text. It may be a scanned PDF. Run OCR on it first."
        );
      }

      if (!resultB.text.trim()) {
        throw new Error(
          "Document B does not contain selectable text. It may be a scanned PDF. Run OCR on it first."
        );
      }

      setTextA(resultA.text);
      setTextB(resultB.text);

      setPagesA(resultA.pages);
      setPagesB(resultB.pages);

      const result = compareTexts(
        resultA.text,
        resultB.text
      );

      setComparison(result);

      setSuccess(
        "Documents compared successfully."
      );
    } catch (comparisonError) {
      console.error(comparisonError);

      setError(
        comparisonError instanceof Error
          ? comparisonError.message
          : "Something went wrong while comparing the documents."
      );
    } finally {
      setExtracting(false);
    }
  }

  async function generateAiAnalysis() {
    if (!comparison || !textA || !textB) {
      setError("Compare the documents first.");
      return;
    }

    setAiLoading(true);
    setError("");
    setAiResult("");

    try {
      const limitedTextA = textA.slice(0, 45000);
      const limitedTextB = textB.slice(0, 45000);

      const prompt = `
You are an AI document comparison assistant.

Analyze Document A and Document B carefully.

IMPORTANT:
- Do not invent information.
- Do not assume that a difference exists unless it is supported by the provided text.
- Distinguish between meaningful content changes and differences caused only by formatting, page breaks, repeated headings, or document structure.
- If Document B appears to be an extracted section, subset, shortened version, or copy of Document A, explicitly explain that.
- The local word comparison metrics are only signals. Do not treat the text-overlap percentage as semantic similarity.

LOCAL COMPARISON METRICS:

Text overlap: ${comparison.textOverlap}%
Document A coverage: ${comparison.coverageA}%
Document B coverage: ${comparison.coverageB}%

Document A:
${limitedTextA}

Document B:
${limitedTextB}

Return the analysis in clean Markdown using exactly this structure:

## Overall comparison

Give a short 2–4 sentence explanation of how the documents relate to each other.

## What remains the same

- Mention the important content that appears in both documents.
- Include names, dates, values, requirements, statements, or sections when relevant.

## Meaningful differences

- Mention only meaningful differences.
- Explain what was added, removed, shortened, expanded, or changed.
- If there are no meaningful differences, explicitly say so.

## Document B coverage

Explain whether Document B appears to be fully, mostly, partially, or minimally represented within Document A. Use the local coverage metric as supporting evidence, not as a semantic truth.

## Conclusion

Give a concise final conclusion in 1–3 sentences.

Keep the response professional, readable, and concise.
Use bullet points where appropriate.
Do not repeat the full document text.
`;

      const documentText = `DOCUMENT A:
${limitedTextA}

DOCUMENT B:
${limitedTextB}`;

      const response = await fetch(
        "/api/ai",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt,
            documentText,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to generate AI comparison analysis."
        );
      }

      if (!data.answer) {
        throw new Error(
          "No AI comparison analysis was returned."
        );
      }

      setAiResult(data.answer);
    } catch (aiError) {
      console.error(aiError);

      setError(
        aiError instanceof Error
          ? aiError.message
          : "Unable to generate AI comparison analysis."
      );
    } finally {
      setAiLoading(false);
    }
  }

  function createReportText() {
    if (!comparison) {
      return "";
    }

    return `DOCUFLOW — DOCUMENT COMPARISON

Document A: ${fileA?.name ?? "Unknown"}
Document B: ${fileB?.name ?? "Unknown"}

COMPARISON METRICS

Text overlap: ${comparison.textOverlap}%
Document A coverage: ${comparison.coverageA}%
Document B coverage: ${comparison.coverageB}%

DOCUMENT DETAILS

Document A: ${pagesA} pages, ${formatBytes(
      fileA?.size ?? 0
    )}

Document B: ${pagesB} pages, ${formatBytes(
      fileB?.size ?? 0
    )}

WORD STATISTICS

Document A words: ${comparison.totalWordsA}
Document B words: ${comparison.totalWordsB}

Document A unique words: ${comparison.uniqueWordsA}
Document B unique words: ${comparison.uniqueWordsB}

Common unique words: ${comparison.commonWordCount}

WORDS UNIQUE TO DOCUMENT A

${formatWordList(
  comparison.onlyA,
  "No unique words detected."
)}

WORDS UNIQUE TO DOCUMENT B

${formatWordList(
  comparison.onlyB,
  "No unique words detected."
)}

COMMON WORDS

${formatWordList(
  comparison.commonWords,
  "No common words detected."
)}

AI ANALYSIS

${aiResult || "AI analysis has not been generated yet."}
`;
  }

  async function copyComparison() {
    if (!comparison) return;

    const content = createReportText();

    try {
      await navigator.clipboard.writeText(
        content
      );

      setSuccess(
        "Comparison copied to clipboard."
      );
    } catch {
      setError(
        "Unable to copy the comparison."
      );
    }
  }

  function downloadComparison() {
    const report = createReportText();

    if (!report) {
      setError(
        "Compare the documents before downloading a report."
      );
      return;
    }

    const blob = new Blob([report], {
      type: "text/plain;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);

    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download =
      "docuflow-document-comparison.txt";

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    URL.revokeObjectURL(url);

    setSuccess(
      "Comparison report downloaded."
    );
  }

  function clearAll() {
    setFileA(null);
    setFileB(null);

    setComparison(null);

    setTextA("");
    setTextB("");

    setAiResult("");

    setError("");
    setSuccess("");

    setPagesA(0);
    setPagesB(0);

    setExtractProgressA(0);
    setExtractProgressB(0);

    setDraggingA(false);
    setDraggingB(false);

    if (fileInputA.current) {
      fileInputA.current.value = "";
    }

    if (fileInputB.current) {
      fileInputB.current.value = "";
    }
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
                  <GitCompare className="h-4 w-4" />
                </div>

                <span className="font-semibold tracking-tight">
                  Compare Documents
                </span>
              </div>
            </div>

            <button
              onClick={clearAll}
              className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 transition hover:border-white/20 hover:bg-white/5 hover:text-white"
            >
              Clear
            </button>
          </div>
        </header>

        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="mb-10 max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/5 px-3 py-1.5 text-xs font-medium text-cyan-300">
              <GitCompare className="h-3.5 w-3.5" />
              Document comparison
            </div>

            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Compare two documents
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-400 sm:text-base">
              Upload two PDFs to identify similarities,
              differences, and important content changes.
              Text comparison runs directly in your
              browser.
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

          <div className="grid gap-5 lg:grid-cols-2">
            <div
              onDragOver={(event) => {
                event.preventDefault();
                setDraggingA(true);
              }}
              onDragLeave={() =>
                setDraggingA(false)
              }
              onDrop={(event) => {
                event.preventDefault();
                setDraggingA(false);

                handleFileA(
                  event.dataTransfer.files?.[0]
                );
              }}
              className={`rounded-2xl border p-6 transition ${
                draggingA
                  ? "border-cyan-400 bg-cyan-400/10"
                  : "border-white/10 bg-white/[0.025]"
              }`}
            >
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-300">
                    Document A
                  </p>

                  <h2 className="mt-1 text-lg font-semibold">
                    Original document
                  </h2>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
                  <FileText className="h-5 w-5" />
                </div>
              </div>

              {fileA ? (
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-400/10 text-red-300">
                      <FileText className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">
                        {fileA.name}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {formatBytes(fileA.size)}
                      </p>
                    </div>

                    <button
                      onClick={removeFileA}
                      className="rounded-lg p-2 text-slate-500 transition hover:bg-white/5 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {extracting && (
                    <div className="mt-4">
                      <div className="mb-2 flex justify-between text-xs text-slate-500">
                        <span>
                          Reading document...
                        </span>

                        <span>
                          {extractProgressA}%
                        </span>
                      </div>

                      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-cyan-400 transition-all"
                          style={{
                            width: `${extractProgressA}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() =>
                    fileInputA.current?.click()
                  }
                  className="flex min-h-44 w-full flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-black/10 px-6 text-center transition hover:border-cyan-400/40 hover:bg-cyan-400/5"
                >
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 text-slate-400">
                    <Upload className="h-5 w-5" />
                  </div>

                  <p className="text-sm font-medium text-white">
                    Drop your PDF here
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    or click to browse · max 50 MB
                  </p>
                </button>
              )}

              <input
                ref={fileInputA}
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={(event) => {
                  handleFileA(
                    event.target.files?.[0]
                  );
                }}
              />
            </div>

            <div
              onDragOver={(event) => {
                event.preventDefault();
                setDraggingB(true);
              }}
              onDragLeave={() =>
                setDraggingB(false)
              }
              onDrop={(event) => {
                event.preventDefault();
                setDraggingB(false);

                handleFileB(
                  event.dataTransfer.files?.[0]
                );
              }}
              className={`rounded-2xl border p-6 transition ${
                draggingB
                  ? "border-violet-400 bg-violet-400/10"
                  : "border-white/10 bg-white/[0.025]"
              }`}
            >
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-violet-300">
                    Document B
                  </p>

                  <h2 className="mt-1 text-lg font-semibold">
                    Revised document
                  </h2>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-400/10 text-violet-300">
                  <FileText className="h-5 w-5" />
                </div>
              </div>

              {fileB ? (
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-400/10 text-violet-300">
                      <FileText className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">
                        {fileB.name}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {formatBytes(fileB.size)}
                      </p>
                    </div>

                    <button
                      onClick={removeFileB}
                      className="rounded-lg p-2 text-slate-500 transition hover:bg-white/5 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {extracting && (
                    <div className="mt-4">
                      <div className="mb-2 flex justify-between text-xs text-slate-500">
                        <span>
                          Reading document...
                        </span>

                        <span>
                          {extractProgressB}%
                        </span>
                      </div>

                      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-violet-400 transition-all"
                          style={{
                            width: `${extractProgressB}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() =>
                    fileInputB.current?.click()
                  }
                  className="flex min-h-44 w-full flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-black/10 px-6 text-center transition hover:border-violet-400/40 hover:bg-violet-400/5"
                >
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 text-slate-400">
                    <Upload className="h-5 w-5" />
                  </div>

                  <p className="text-sm font-medium text-white">
                    Drop your PDF here
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    or click to browse · max 50 MB
                  </p>
                </button>
              )}

              <input
                ref={fileInputB}
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={(event) => {
                  handleFileB(
                    event.target.files?.[0]
                  );
                }}
              />
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              onClick={runComparison}
              disabled={
                !fileA ||
                !fileB ||
                extracting
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {extracting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Comparing...
                </>
              ) : (
                <>
                  <GitCompare className="h-4 w-4" />
                  Compare Documents
                </>
              )}
            </button>

            <p className="text-xs text-slate-500">
              Your PDFs are processed locally in
              your browser.
            </p>
          </div>

          {comparison && (
            <section className="mt-10">
              <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-300">
                    Comparison result
                  </p>

                  <h2 className="mt-1 text-2xl font-semibold">
                    Document differences
                  </h2>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={copyComparison}
                    className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
                  >
                    <Clipboard className="h-4 w-4" />
                    Copy
                  </button>

                  <button
                    onClick={downloadComparison}
                    className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
                  >
                    <Download className="h-4 w-4" />
                    Download report
                  </button>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                    Text overlap
                  </p>

                  <div className="mt-3 flex items-end gap-2">
                    <span className="text-4xl font-bold text-cyan-300">
                      {comparison.textOverlap}%
                    </span>
                  </div>

                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-cyan-400 transition-all"
                      style={{
                        width: `${comparison.textOverlap}%`,
                      }}
                    />
                  </div>

                  <p className="mt-3 text-xs leading-5 text-slate-500">
                    Percentage of distinct words
                    shared across both documents.
                    This is a text-overlap signal,
                    not semantic similarity.
                  </p>

                  <div className="mt-4 border-t border-white/10 pt-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">
                        Shared vocabulary
                      </span>

                      <span className="font-medium text-slate-300">
                        {comparison.commonWordCount}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                    Document B coverage
                  </p>

                  <div className="mt-3 flex items-end gap-2">
                    <span className="text-4xl font-bold text-violet-300">
                      {comparison.coverageB}%
                    </span>
                  </div>

                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-violet-400 transition-all"
                      style={{
                        width: `${comparison.coverageB}%`,
                      }}
                    />
                  </div>

                  <p className="mt-3 text-xs leading-5 text-slate-500">
                    Percentage of Document B's
                    distinct words that also appear
                    in Document A.
                  </p>

                  <div className="mt-4 border-t border-white/10 pt-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">
                        Document A coverage
                      </span>

                      <span className="font-medium text-slate-300">
                        {comparison.coverageA}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                    Document details
                  </p>

                  <div className="mt-4 space-y-4">
                    <div>
                      <p className="truncate text-sm font-medium text-white">
                        {fileA?.name}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {pagesA} pages ·{" "}
                        {comparison.totalWordsA} words
                      </p>
                    </div>

                    <div className="border-t border-white/10 pt-4">
                      <p className="truncate text-sm font-medium text-white">
                        {fileB?.name}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {pagesB} pages ·{" "}
                        {comparison.totalWordsB} words
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.025] p-6">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />

                  <div>
                    <h3 className="font-semibold">
                      How to read these metrics
                    </h3>

                    <p className="mt-2 text-xs leading-6 text-slate-400">
                      Text overlap measures shared
                      vocabulary. Coverage measures
                      whether the content of one
                      document is largely represented
                      inside the other. A high Document B
                      coverage with a low Document A
                      coverage usually means B is a
                      smaller subset or extracted section
                      of A.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-5 lg:grid-cols-2">
                <div className="rounded-2xl border border-red-400/15 bg-red-400/[0.025] p-6">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-red-300" />

                    <h3 className="font-semibold">
                      Content unique to Document A
                    </h3>
                  </div>

                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Distinct words detected in
                    Document A but not in Document B.
                  </p>

                  <div className="mt-4 max-h-56 overflow-y-auto rounded-xl bg-black/20 p-4 text-sm leading-7 text-slate-300">
                    {comparison.onlyA.length ? (
                      <>
                        {formatWordList(
                          comparison.onlyA,
                          "",
                          100
                        )}

                        {comparison.onlyA.length >
                          100 && (
                          <p className="mt-3 text-xs text-slate-600">
                            Showing the first 100
                            unique words.
                          </p>
                        )}
                      </>
                    ) : (
                      <span className="text-slate-500">
                        No unique words detected.
                      </span>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-violet-400/15 bg-violet-400/[0.025] p-6">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-violet-300" />

                    <h3 className="font-semibold">
                      Content unique to Document B
                    </h3>
                  </div>

                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Distinct words detected in
                    Document B but not in Document A.
                  </p>

                  <div className="mt-4 max-h-56 overflow-y-auto rounded-xl bg-black/20 p-4 text-sm leading-7 text-slate-300">
                    {comparison.onlyB.length ? (
                      <>
                        {formatWordList(
                          comparison.onlyB,
                          "",
                          100
                        )}

                        {comparison.onlyB.length >
                          100 && (
                          <p className="mt-3 text-xs text-slate-600">
                            Showing the first 100
                            unique words.
                          </p>
                        )}
                      </>
                    ) : (
                      <span className="text-slate-500">
                        No unique words detected.
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.025] p-6">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-300" />

                  <h3 className="font-semibold">
                    Common content
                  </h3>
                </div>

                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Distinct words appearing in both
                  documents. This is vocabulary overlap,
                  not a sentence-level content match.
                </p>

                <div className="mt-4 max-h-48 overflow-y-auto rounded-xl bg-black/20 p-4 text-sm leading-7 text-slate-300">
                  {comparison.commonWords.length ? (
                    <>
                      {formatWordList(
                        comparison.commonWords,
                        "",
                        150
                      )}

                      {comparison.commonWords.length >
                        150 && (
                        <p className="mt-3 text-xs text-slate-600">
                          Showing the first 150 common
                          words.
                        </p>
                      )}
                    </>
                  ) : (
                    <span className="text-slate-500">
                      No common words detected.
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.025] p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-cyan-300" />

                      <h3 className="font-semibold">
                        AI explanation of differences
                      </h3>
                    </div>

                    <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-500">
                      Gemini analyzes the extracted
                      document text and explains meaningful
                      changes in context.
                    </p>
                  </div>

                  <button
                    onClick={generateAiAnalysis}
                    disabled={aiLoading}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {aiLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Analyze with AI
                      </>
                    )}
                  </button>
                </div>

                {aiLoading && (
                  <div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-6">
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-5 w-5 animate-spin text-cyan-300" />

                      <div>
                        <p className="text-sm font-medium text-slate-200">
                          Gemini is analyzing the documents...
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          Comparing the content and preparing a structured explanation.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {aiResult && (
                  <div className="ai-message mt-5 max-h-[600px] overflow-y-auto rounded-xl border border-white/10 bg-black/20 p-6">
                    <div className="prose prose-invert max-w-none text-sm leading-7 text-slate-300">
                      <ReactMarkdown
                        components={{
                          h1: ({ children }) => (
                            <h1 className="mb-4 mt-1 text-xl font-bold tracking-tight text-white">
                              {children}
                            </h1>
                          ),

                          h2: ({ children }) => (
                            <h2 className="mb-3 mt-6 border-b border-white/10 pb-2 text-base font-semibold text-cyan-200 first:mt-0">
                              {children}
                            </h2>
                          ),

                          h3: ({ children }) => (
                            <h3 className="mb-2 mt-5 text-sm font-semibold text-white">
                              {children}
                            </h3>
                          ),

                          p: ({ children }) => (
                            <p className="mb-4 leading-7 text-slate-300 last:mb-0">
                              {children}
                            </p>
                          ),

                          ul: ({ children }) => (
                            <ul className="mb-4 ml-5 list-disc space-y-2 text-slate-300">
                              {children}
                            </ul>
                          ),

                          ol: ({ children }) => (
                            <ol className="mb-4 ml-5 list-decimal space-y-2 text-slate-300">
                              {children}
                            </ol>
                          ),

                          li: ({ children }) => (
                            <li className="pl-1 leading-6">
                              {children}
                            </li>
                          ),

                          strong: ({ children }) => (
                            <strong className="font-semibold text-white">
                              {children}
                            </strong>
                          ),

                          em: ({ children }) => (
                            <em className="text-slate-200">
                              {children}
                            </em>
                          ),

                          blockquote: ({ children }) => (
                            <blockquote className="my-4 border-l-2 border-cyan-400/40 pl-4 text-slate-400">
                              {children}
                            </blockquote>
                          ),

                          code: ({ children }) => (
                            <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-cyan-200">
                              {children}
                            </code>
                          ),
                        }}
                      >
                        {aiResult}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}

                {!aiResult && !aiLoading && (
                  <div className="mt-5 rounded-xl border border-dashed border-white/10 bg-black/10 p-8 text-center">
                    <Sparkles className="mx-auto h-7 w-7 text-slate-600" />

                    <p className="mt-3 text-sm font-medium text-slate-400">
                      AI analysis has not been generated yet.
                    </p>

                    <p className="mt-1 text-xs text-slate-600">
                      Click “Analyze with AI” to understand
                      the important differences.
                    </p>
                  </div>
                )}
              </div>
            </section>
          )}

          {!comparison && !extracting && (
            <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
              <GitCompare className="mx-auto h-9 w-9 text-slate-700" />

              <h3 className="mt-4 text-sm font-semibold text-slate-400">
                Ready to compare
              </h3>

              <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-slate-600">
                Upload two PDFs above and DocuFlow
                will extract their text and generate
                a detailed comparison.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}