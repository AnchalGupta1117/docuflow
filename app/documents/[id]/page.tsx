"use client";

import ReactMarkdown from "react-markdown";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  FileText,
  Maximize,
  Minimize,
  Minus,
  Plus,
  Search,
  Send,
  Sparkles,
  X,
  BarChart3,
  RefreshCw,
  KeyRound,
  Tags,
} from "lucide-react";
import { getDocumentFile } from "@/lib/document-store";

type PdfDocument = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPage>;
};

type PdfPage = {
  getViewport: (options: { scale: number }) => {
    width: number;
    height: number;
  };

  render: (options: {
    canvasContext: CanvasRenderingContext2D;
    viewport: {
      width: number;
      height: number;
    };
  }) => {
    promise: Promise<void>;
  };

  getTextContent: () => Promise<{
    items: Array<{
      str?: string;
    }>;
  }>;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type PdfJsModule = {
  GlobalWorkerOptions: {
    workerSrc: string;
  };

  getDocument: (options: { data: ArrayBuffer }) => {
    promise: Promise<PdfDocument>;
  };
};

export default function DocumentViewerPage() {
  const params = useParams();
  const router = useRouter();

  const documentId = String(params.id);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const aiResponseRef = useRef<HTMLDivElement | null>(null);
  const insightsRef = useRef<HTMLDivElement | null>(null);
  const keyInfoRef = useRef<HTMLDivElement | null>(null);
  const topicsRef = useRef<HTMLDivElement | null>(null);

  const [pdfjs, setPdfjs] = useState<PdfJsModule | null>(null);
  const [pdf, setPdf] = useState<PdfDocument | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.25);

  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState("");

  const [isFullscreen, setIsFullscreen] = useState(false);

  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState("");

  /* ========================================================= */
  /* AI STATE */
  /* ========================================================= */

  const [documentText, setDocumentText] = useState("");
  const [extractingText, setExtractingText] = useState(false);

  const [aiQuestion, setAiQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [copied, setCopied] = useState(false);
  const [conversation, setConversation] = useState<ChatMessage[]>([]);

  /* ========================================================= */
  /* DOCUMENT INSIGHTS STATE */
  /* ========================================================= */

  const [aiInsights, setAiInsights] = useState("");
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState("");

  /* ========================================================= */
  /* KEY INFORMATION STATE */
  /* ========================================================= */

  const [keyInformation, setKeyInformation] = useState("");
  const [keyInfoLoading, setKeyInfoLoading] = useState(false);
  const [keyInfoError, setKeyInfoError] = useState("");

  /* ========================================================= */
  /* AI TOPICS STATE */
  /* ========================================================= */

  const [aiTopics, setAiTopics] = useState<string[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [topicsError, setTopicsError] = useState("");

  /* ========================================================= */
  /* LOAD PDF.JS */
  /* ========================================================= */

  useEffect(() => {
    let cancelled = false;

    async function loadPdfJs() {
      try {
        setError("");

        const module = await import("pdfjs-dist");

        if (cancelled) return;

        const pdfjsModule = module as unknown as PdfJsModule;

        pdfjsModule.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url
        ).toString();

        setPdfjs(pdfjsModule);
      } catch (err) {
        console.error("Failed to load PDF.js:", err);

        if (!cancelled) {
          setError("Unable to load the PDF viewer.");
          setLoading(false);
        }
      }
    }

    loadPdfJs();

    return () => {
      cancelled = true;
    };
  }, []);

  /* ========================================================= */
  /* GET STORED FILE */
  /* ========================================================= */

  useEffect(() => {
    const storedFile = getDocumentFile(documentId);

    if (!storedFile) {
      setFile(null);
      setLoading(false);
      return;
    }

    setFile(storedFile);
  }, [documentId]);

  /* ========================================================= */
  /* LOAD PDF */
  /* ========================================================= */

  useEffect(() => {
    if (!pdfjs || !file) return;

    let cancelled = false;

    async function loadPdf() {
      try {
        setLoading(true);
        setError("");

        const arrayBuffer = await file!.arrayBuffer();

        const loadedPdf = await pdfjs!.getDocument({
          data: arrayBuffer,
        }).promise;

        if (cancelled) return;

        setPdf(loadedPdf);
        setCurrentPage(1);
      } catch (err) {
        console.error("Failed to load PDF:", err);

        if (!cancelled) {
          setError(
            "This PDF could not be opened. The file may be corrupted or unsupported."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadPdf();

    return () => {
      cancelled = true;
    };
  }, [pdfjs, file]);

  /* ========================================================= */
  /* EXTRACT DOCUMENT TEXT */
  /* ========================================================= */

  useEffect(() => {
    if (!pdf) return;

    let cancelled = false;

    async function extractText() {
      try {
        setExtractingText(true);
        setDocumentText("");
        setAiAnswer("");
        setAiError("");
        setConversation([]);
        setAiInsights("");
        setInsightsError("");
        setKeyInformation("");
        setKeyInfoError("");
        setAiTopics([]);
        setTopicsError("");

        const pages: string[] = [];

        for (
          let pageNumber = 1;
          pageNumber <= pdf.numPages;
          pageNumber++
        ) {
          if (cancelled) return;

          const page = await pdf.getPage(pageNumber);
          const textContent = await page.getTextContent();

          const pageText = textContent.items
            .map((item) => item.str ?? "")
            .join(" ")
            .replace(/\s+/g, " ")
            .trim();

          if (pageText) {
            pages.push(`Page ${pageNumber}:\n${pageText}`);
          }
        }

        if (!cancelled) {
          setDocumentText(pages.join("\n\n"));
        }
      } catch (err) {
        console.error("Text extraction failed:", err);

        if (!cancelled) {
          setDocumentText("");
        }
      } finally {
        if (!cancelled) {
          setExtractingText(false);
        }
      }
    }

    extractText();

    return () => {
      cancelled = true;
    };
  }, [pdf]);

  /* ========================================================= */
  /* RENDER CURRENT PAGE */
  /* ========================================================= */

  useEffect(() => {
    if (!pdf || !canvasRef.current) return;

    let cancelled = false;

    async function renderPage() {
      try {
        setRendering(true);

        const page = await pdf!.getPage(currentPage);

        if (cancelled || !canvasRef.current) return;

        const viewport = page.getViewport({
          scale,
        });

        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");

        if (!context) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({
          canvasContext: context,
          viewport,
        }).promise;
      } catch (err) {
        console.error("Failed to render PDF page:", err);
      } finally {
        if (!cancelled) {
          setRendering(false);
        }
      }
    }

    renderPage();

    return () => {
      cancelled = true;
    };
  }, [pdf, currentPage, scale]);

  /* ========================================================= */
  /* PAGE CONTROLS */
  /* ========================================================= */

  function goToPreviousPage() {
    if (!pdf) return;

    setCurrentPage((page) => Math.max(1, page - 1));
  }

  function goToNextPage() {
    if (!pdf) return;

    setCurrentPage((page) =>
      Math.min(pdf.numPages, page + 1)
    );
  }

  function zoomIn() {
    setScale((value) =>
      Math.min(3, Number((value + 0.15).toFixed(2)))
    );
  }

  function zoomOut() {
    setScale((value) =>
      Math.max(0.5, Number((value - 0.15).toFixed(2)))
    );
  }

  function resetZoom() {
    setScale(1.25);
  }

  /* ========================================================= */
  /* SEARCH */
  /* ========================================================= */

  async function handleSearch() {
    if (!pdf || !searchQuery.trim()) return;

    try {
      setSearching(true);
      setSearchResult("");

      const query = searchQuery.trim().toLowerCase();

      for (
        let pageNumber = 1;
        pageNumber <= pdf.numPages;
        pageNumber++
      ) {
        const page = await pdf.getPage(pageNumber);
        const textContent = await page.getTextContent();

        const text = textContent.items
          .map((item) => item.str ?? "")
          .join(" ");

        if (text.toLowerCase().includes(query)) {
          setCurrentPage(pageNumber);
          setSearchResult(`Found on page ${pageNumber}.`);
          return;
        }
      }

      setSearchResult("No matching text was found.");
    } catch (err) {
      console.error("Search failed:", err);
      setSearchResult("Unable to search this document.");
    } finally {
      setSearching(false);
    }
  }

  /* ========================================================= */
  /* AI QUESTION */
  /* ========================================================= */

  async function askAI(question: string) {
    const cleanQuestion = question.trim();

    if (!cleanQuestion) return;

    if (extractingText) {
      setAiError(
        "The document is still being read. Please wait a moment and try again."
      );
      return;
    }

    if (!documentText.trim()) {
      setAiError(
        "The document text is not available. Please wait a moment and try again."
      );
      return;
    }

    try {
      setAiLoading(true);
      setAiError("");
      setAiAnswer("");
      setCopied(false);

      const recentConversation = conversation.slice(-10);
      const conversationContext = recentConversation.length
        ? `\nCONVERSATION HISTORY:\n${recentConversation
            .map(
              (message) =>
                `${message.role === "user" ? "User" : "DocuFlow AI"}: ${message.content}`
            )
            .join("\n\n")}\n`
        : "";

      const contextualPrompt = `${conversationContext}\nCURRENT USER REQUEST:\n${cleanQuestion}\n\nAnswer the current request using the document and the conversation history when relevant. If the user refers to something from the conversation, use that context to understand the reference.`;

      console.log("Sending AI request...");

      const response = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: contextualPrompt,
          documentText,
        }),
      });

      const data = await response.json();

      console.log("AI response received:", data);

      if (!response.ok) {
        throw new Error(
          data?.error || "The AI request failed."
        );
      }

      if (
        typeof data?.answer !== "string" ||
        !data.answer.trim()
      ) {
        throw new Error(
          "The AI service returned an empty answer."
        );
      }

      setAiAnswer(data.answer);
      setAiQuestion("");
      setConversation((current) => [
        ...current,
        { role: "user", content: cleanQuestion },
        { role: "assistant", content: data.answer },
      ]);

      requestAnimationFrame(() => {
        if (aiResponseRef.current) {
          aiResponseRef.current.scrollTo({
            top: aiResponseRef.current.scrollHeight,
            behavior: "smooth",
          });
        }
      });
    } catch (err) {
      console.error("AI request failed:", err);

      setAiError(
        err instanceof Error
          ? err.message
          : "Something went wrong while asking the AI."
      );
    } finally {
      setAiLoading(false);
    }
  }

  function askPresetQuestion(question: string) {
    setAiQuestion(question);
    askAI(question);
  }

  function handleAIFormSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    askAI(aiQuestion);
  }

  /* ========================================================= */
  /* DOCUMENT INSIGHTS */
  /* ========================================================= */

  async function generateInsights() {
    if (extractingText) {
      setInsightsError(
        "The document is still being read. Please wait a moment and try again."
      );
      return;
    }

    if (!documentText.trim()) {
      setInsightsError(
        "The document text is not available. Please wait a moment and try again."
      );
      return;
    }

    const insightsPrompt = `
Analyze this document and create a structured document insight report.

Use ONLY information supported by the document. Do not invent or assume facts.

Use exactly these sections:

## Document Type
Identify what kind of document this appears to be.

## Main Topic
State the central subject of the document in 1-2 sentences.

## Purpose
Explain why this document exists or what it is trying to accomplish.

## Key Topics
List the major topics, concepts, or themes covered in the document.

## Important Entities
List important people, organizations, technologies, locations, products, or other named entities mentioned in the document.

## Important Findings
List the most significant facts, findings, decisions, numbers, dates, or conclusions found in the document.

## Document Overview
Give a concise overall overview of the document in a few paragraphs.

Keep the report clear, factual, and useful. If a category is not supported by the document, say "Not clearly identified in the document."
`;

    try {
      setInsightsLoading(true);
      setInsightsError("");
      setAiInsights("");

      const response = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: insightsPrompt,
          documentText,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "The AI insights request failed."
        );
      }

      if (
        typeof data?.answer !== "string" ||
        !data.answer.trim()
      ) {
        throw new Error(
          "The AI service returned an empty insights report."
        );
      }

      setAiInsights(data.answer);

      requestAnimationFrame(() => {
        insightsRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    } catch (err) {
      console.error("Document insights failed:", err);

      setInsightsError(
        err instanceof Error
          ? err.message
          : "Something went wrong while generating document insights."
      );
    } finally {
      setInsightsLoading(false);
    }
  }

  /* ========================================================= */
  /* KEY INFORMATION EXTRACTION */
  /* ========================================================= */

  async function extractKeyInformation() {
    if (extractingText) {
      setKeyInfoError(
        "The document is still being read. Please wait a moment and try again."
      );
      return;
    }

    if (!documentText.trim()) {
      setKeyInfoError(
        "The document text is not available. Please wait a moment and try again."
      );
      return;
    }

    const keyInformationPrompt = `
Extract the most useful structured information from this document.

Use ONLY information explicitly supported by the document.
Do not invent, infer, or guess information.

Use exactly these sections:

## People
List important people mentioned in the document.
Include their role or relevance when the document provides it.

## Organizations
List important companies, institutions, universities, departments, agencies, or other organizations mentioned.

## Locations
List important cities, countries, addresses, facilities, or other locations mentioned.

## Dates
List important dates, deadlines, periods, years, or scheduled events mentioned.

## Important Numbers
List important numerical information such as percentages, amounts, measurements, scores, quantities, statistics, IDs, or other meaningful numbers.
Include what each number refers to.

## Contact Information
List email addresses, phone numbers, websites, or other contact details if explicitly present.

## Technologies and Tools
List important technologies, software, platforms, frameworks, hardware, methods, or tools mentioned.

## Important Facts
List the most useful specific facts that a reader may want to find quickly later.

## Decisions and Action Items
List important decisions, requirements, tasks, deliverables, recommendations, deadlines, or action items mentioned in the document.

For every category where the document contains no relevant information, write:
"Not clearly identified in the document."

Keep the output concise but complete.
`;

    try {
      setKeyInfoLoading(true);
      setKeyInfoError("");
      setKeyInformation("");

      const response = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: keyInformationPrompt,
          documentText,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "The key information extraction request failed."
        );
      }

      if (
        typeof data?.answer !== "string" ||
        !data.answer.trim()
      ) {
        throw new Error(
          "The AI service returned empty key information."
        );
      }

      setKeyInformation(data.answer);

      requestAnimationFrame(() => {
        keyInfoRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    } catch (err) {
      console.error(
        "Key information extraction failed:",
        err
      );

      setKeyInfoError(
        err instanceof Error
          ? err.message
          : "Something went wrong while extracting key information."
      );
    } finally {
      setKeyInfoLoading(false);
    }
  }

  /* ========================================================= */
  /* AI-GENERATED TOPICS */
  /* ========================================================= */

  async function generateTopics() {
    if (extractingText) {
      setTopicsError(
        "The document is still being read. Please wait a moment and try again."
      );
      return;
    }

    if (!documentText.trim()) {
      setTopicsError(
        "The document text is not available. Please wait a moment and try again."
      );
      return;
    }

    const topicsPrompt = `
Identify the main topics covered by this document.

Use ONLY information explicitly supported by the document.
Do not invent topics or make assumptions.

Return exactly 6 to 10 concise topic names.
Return ONLY a Markdown bullet list.
Do not add an introduction, explanation, headings, or conclusion.

Each topic should be short, specific, and useful as a search/exploration topic.
Avoid duplicate or overly broad topics.
`;

    try {
      setTopicsLoading(true);
      setTopicsError("");
      setAiTopics([]);

      const response = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: topicsPrompt,
          documentText,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "The AI topics request failed."
        );
      }

      if (
        typeof data?.answer !== "string" ||
        !data.answer.trim()
      ) {
        throw new Error(
          "The AI service returned no document topics."
        );
      }

      const topics = data.answer
        .split("\n")
        .map((line: string) =>
          line
            .replace(/^\s*[-*+]\s*/, "")
            .replace(/^\s*\d+[.)]\s*/, "")
            .trim()
        )
        .filter((topic: string) => topic.length > 0)
        .filter(
          (topic: string, index: number, array: string[]) =>
            array.findIndex(
              (item) => item.toLowerCase() === topic.toLowerCase()
            ) === index
        )
        .slice(0, 10);

      if (topics.length === 0) {
        throw new Error(
          "The AI service did not return usable document topics."
        );
      }

      setAiTopics(topics);

      requestAnimationFrame(() => {
        topicsRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    } catch (err) {
      console.error("Topic generation failed:", err);

      setTopicsError(
        err instanceof Error
          ? err.message
          : "Something went wrong while generating document topics."
      );
    } finally {
      setTopicsLoading(false);
    }
  }

  function askAboutTopic(topic: string) {
    const topicQuestion = `Explain the topic "${topic}" using only information from this document. Cover what it means, the important points related to it, and any relevant facts, examples, dates, numbers, or conclusions mentioned in the document.`;

    setAiQuestion(topicQuestion);
    askAI(topicQuestion);
  }

  /* ========================================================= */
  /* COPY AI RESPONSE */
  /* ========================================================= */

  async function copyAIAnswer() {
    if (!aiAnswer) return;

    try {
      await navigator.clipboard.writeText(aiAnswer);

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch (err) {
      console.error("Failed to copy AI response:", err);
    }
  }

  /* ========================================================= */
  /* DOWNLOAD */
  /* ========================================================= */

  function downloadDocument() {
    if (!file) return;

    const url = URL.createObjectURL(file);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = file.name;

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    URL.revokeObjectURL(url);
  }

  /* ========================================================= */
  /* FULLSCREEN */
  /* ========================================================= */

  function toggleFullscreen() {
    setIsFullscreen((value) => !value);
  }

  /* ========================================================= */
  /* MISSING DOCUMENT */
  /* ========================================================= */

  if (!file && !loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-6">
          <div className="w-full rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-400/10">
              <FileText
                className="text-cyan-300"
                size={26}
              />
            </div>

            <h1 className="mt-5 text-xl font-semibold">
              Document unavailable
            </h1>

            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-400">
              This document is not available in the current browser
              session. Upload it again from your DocuFlow workspace.
            </p>

            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              <ArrowLeft size={16} />
              Back to Workspace
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      className={`h-screen overflow-hidden bg-slate-950 text-slate-100 ${
        isFullscreen
          ? "fixed inset-0 z-[100]"
          : ""
      }`}
    >
      {/* ========================================================= */}
      {/* HEADER */}
      {/* ========================================================= */}

      <header className="relative z-50 h-16 shrink-0 border-b border-white/10 bg-slate-950/95 backdrop-blur-xl">
        <div className="mx-auto flex h-full max-w-[1800px] items-center justify-between px-4 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/dashboard"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-400 transition hover:border-cyan-400/20 hover:bg-cyan-400/[0.05] hover:text-cyan-300"
              aria-label="Back to workspace"
            >
              <ArrowLeft size={17} />
            </Link>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <FileText
                  size={16}
                  className="shrink-0 text-cyan-300"
                />

                <h1 className="truncate text-sm font-semibold text-slate-100">
                  {file?.name ?? "Document"}
                </h1>
              </div>

              {pdf && (
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {pdf.numPages}{" "}
                  {pdf.numPages === 1 ? "page" : "pages"}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setShowSearch((value) => !value)
              }
              className={`flex h-9 w-9 items-center justify-center rounded-xl border transition ${
                showSearch
                  ? "border-cyan-400/20 bg-cyan-400/10 text-cyan-300"
                  : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-white"
              }`}
              aria-label="Search document"
            >
              <Search size={16} />
            </button>

            <button
              type="button"
              onClick={downloadDocument}
              disabled={!file}
              className="flex h-9 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-xs font-medium text-slate-300 transition hover:border-cyan-400/20 hover:bg-cyan-400/[0.05] hover:text-cyan-300 disabled:opacity-50"
            >
              <Download size={15} />

              <span className="hidden sm:inline">
                Download
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================= */}
      {/* SEARCH BAR */}
      {/* ========================================================= */}

      {showSearch && (
        <div className="relative z-40 shrink-0 border-b border-white/10 bg-slate-950/95 px-4 py-3 backdrop-blur-xl sm:px-5">
          <div className="mx-auto flex max-w-[1000px] items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              />

              <input
                value={searchQuery}
                onChange={(event) =>
                  setSearchQuery(event.target.value)
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleSearch();
                  }
                }}
                placeholder="Search inside this document..."
                className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.03] pl-9 pr-3 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-cyan-400/30"
              />
            </div>

            <button
              type="button"
              onClick={handleSearch}
              disabled={
                searching || !searchQuery.trim()
              }
              className="h-10 shrink-0 rounded-xl bg-cyan-400 px-4 text-xs font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {searching ? "Searching..." : "Search"}
            </button>

            <button
              type="button"
              onClick={() => {
                setShowSearch(false);
                setSearchQuery("");
                setSearchResult("");
              }}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 text-slate-500 transition hover:border-white/20 hover:text-white"
              aria-label="Close search"
            >
              <X size={15} />
            </button>
          </div>

          {searchResult && (
            <p className="mx-auto mt-2 max-w-[1000px] text-xs text-slate-500">
              {searchResult}
            </p>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* WORKSPACE */}
      {/* ========================================================= */}

      <div
        className={`h-[calc(100vh-64px)] min-h-0 ${
          showSearch ? "hidden" : ""
        }`}
      >
        <div className="flex h-full min-h-0 flex-col md:flex-row">
          {/* ===================================================== */}
          {/* PDF VIEWER */}
          {/* ===================================================== */}

          <section className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#111827] md:w-1/2 md:flex-none">
            <div className="min-h-0 flex-1 overflow-auto overscroll-contain px-4 py-8 sm:px-8">
              <div className="flex min-h-full min-w-max items-start justify-center">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-32">
                    <div className="h-9 w-9 animate-spin rounded-full border-2 border-cyan-400/20 border-t-cyan-400" />

                    <p className="mt-4 text-sm text-slate-500">
                      Loading document...
                    </p>
                  </div>
                ) : error ? (
                  <div className="max-w-md py-32 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-400/10">
                      <FileText
                        className="text-red-300"
                        size={25}
                      />
                    </div>

                    <h2 className="mt-5 text-base font-semibold text-slate-200">
                      Unable to open document
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      {error}
                    </p>
                  </div>
                ) : (
                  <div className="relative">
                    {rendering && (
                      <div className="absolute right-3 top-3 z-10 rounded-lg border border-white/10 bg-slate-950/80 px-3 py-1.5 text-[11px] text-slate-400 backdrop-blur">
                        Rendering...
                      </div>
                    )}

                    <canvas
                      ref={canvasRef}
                      className="block rounded-sm bg-white shadow-[0_20px_70px_rgba(0,0,0,0.35)]"
                    />
                  </div>
                )}
              </div>
            </div>

            {!loading && pdf && !error && (
              <div className="z-20 shrink-0 border-t border-white/10 bg-slate-950/95 px-4 py-3 backdrop-blur-xl">
                <div className="mx-auto flex max-w-[1000px] items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={goToPreviousPage}
                    disabled={currentPage <= 1}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-slate-400 transition hover:border-cyan-400/20 hover:bg-cyan-400/[0.05] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={17} />
                  </button>

                  <div className="min-w-[90px] text-center text-xs text-slate-400">
                    <span className="font-medium text-slate-200">
                      {currentPage}
                    </span>{" "}
                    / {pdf.numPages}
                  </div>

                  <button
                    type="button"
                    onClick={goToNextPage}
                    disabled={
                      currentPage >= pdf.numPages
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-slate-400 transition hover:border-cyan-400/20 hover:bg-cyan-400/[0.05] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                    aria-label="Next page"
                  >
                    <ChevronRight size={17} />
                  </button>

                  <div className="mx-2 h-5 w-px bg-white/10" />

                  <button
                    type="button"
                    onClick={zoomOut}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-slate-400 transition hover:border-cyan-400/20 hover:bg-cyan-400/[0.05] hover:text-white"
                    aria-label="Zoom out"
                  >
                    <Minus size={15} />
                  </button>

                  <button
                    type="button"
                    onClick={resetZoom}
                    className="min-w-[58px] rounded-lg border border-white/10 px-2 py-2 text-[11px] text-slate-400 transition hover:border-white/20 hover:text-white"
                  >
                    {Math.round(scale * 100)}%
                  </button>

                  <button
                    type="button"
                    onClick={zoomIn}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-slate-400 transition hover:border-cyan-400/20 hover:bg-cyan-400/[0.05] hover:text-white"
                    aria-label="Zoom in"
                  >
                    <Plus size={15} />
                  </button>

                  <div className="mx-2 h-5 w-px bg-white/10" />

                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-slate-400 transition hover:border-cyan-400/20 hover:bg-cyan-400/[0.05] hover:text-white"
                    aria-label={
                      isFullscreen
                        ? "Exit fullscreen"
                        : "Enter fullscreen"
                    }
                  >
                    {isFullscreen ? (
                      <Minimize size={15} />
                    ) : (
                      <Maximize size={15} />
                    )}
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* ===================================================== */}
          {/* AI SIDEBAR */}
          {/* ===================================================== */}

          <aside className="flex min-h-0 w-full shrink-0 flex-col border-t border-white/10 bg-[#050816] md:w-1/2 md:border-l md:border-t-0">
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 [scrollbar-color:rgba(100,116,139,0.35)_transparent] [scrollbar-width:thin]">
              {/* ================================================= */}
              {/* AI HEADER */}
              {/* ================================================= */}

              <div className="flex items-center gap-3">
                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/10 bg-cyan-400/10">
                  <Sparkles
                    size={18}
                    className="text-cyan-300"
                  />

                  <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,0.8)]" />
                </div>

                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-slate-100">
                    AI Assistant
                  </h2>

                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Understand this document
                  </p>
                </div>

                <div className="ml-auto shrink-0 rounded-full border border-emerald-400/10 bg-emerald-400/[0.05] px-2 py-1 text-[9px] font-medium text-emerald-300">
                  AI Ready
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full border border-white/10 bg-white/[0.025] px-2.5 py-1 text-[9px] font-medium text-slate-500">
                  Ask anything
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.025] px-2.5 py-1 text-[9px] font-medium text-slate-500">
                  Summarize
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.025] px-2.5 py-1 text-[9px] font-medium text-slate-500">
                  Explain simply
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.025] px-2.5 py-1 text-[9px] font-medium text-slate-500">
                  Extract key info
                </span>
              </div>

              {/* ================================================= */}
              {/* DOCUMENT STATUS */}
              {/* ================================================= */}

              <div className="mt-3 flex items-center gap-2 rounded-lg px-1 text-[10px]">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    extractingText
                      ? "animate-pulse bg-amber-400"
                      : documentText
                        ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]"
                        : "bg-slate-600"
                  }`}
                />

                <span className="text-slate-500">
                  {extractingText
                    ? "Reading document..."
                    : documentText
                      ? `Document ready • ${documentText.length.toLocaleString()} characters`
                      : "Waiting for document"}
                </span>
              </div>

              {/* ================================================= */}
              {/* DOCUMENT INSIGHTS */}
              {/* ================================================= */}

              <div
                ref={insightsRef}
                className="mt-6"
              >
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                      Document insights
                    </p>

                    <p className="mt-1 text-[10px] text-slate-700">
                      AI-generated overview of this document
                    </p>
                  </div>

                  <BarChart3
                    size={15}
                    className="text-slate-600"
                  />
                </div>

                <button
                  type="button"
                  onClick={generateInsights}
                  disabled={
                    insightsLoading ||
                    extractingText ||
                    !documentText.trim()
                  }
                  className="group flex w-full items-center justify-between rounded-xl border border-cyan-400/15 bg-gradient-to-r from-cyan-400/[0.07] to-violet-400/[0.04] px-4 py-3.5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-400/30 hover:bg-cyan-400/[0.09] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-400/10">
                      {insightsLoading ? (
                        <RefreshCw
                          size={15}
                          className="animate-spin text-cyan-300"
                        />
                      ) : (
                        <BarChart3
                          size={15}
                          className="text-cyan-300"
                        />
                      )}
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-slate-200">
                        {insightsLoading
                          ? "Generating insights..."
                          : aiInsights
                            ? "Regenerate insights"
                            : "Generate document insights"}
                      </p>

                      <p className="mt-0.5 text-[10px] text-slate-600">
                        {insightsLoading
                          ? "Analyzing the document..."
                          : "Understand the document at a glance"}
                      </p>
                    </div>
                  </div>

                  {!insightsLoading && (
                    <span className="text-slate-700 transition-transform group-hover:translate-x-0.5 group-hover:text-cyan-300">
                      →
                    </span>
                  )}
                </button>

                {insightsError && !insightsLoading && (
                  <div className="mt-3 rounded-xl border border-red-400/15 bg-red-400/[0.03] p-3">
                    <div className="flex items-start gap-2.5">
                      <X
                        size={14}
                        className="mt-0.5 shrink-0 text-red-300"
                      />

                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-red-300">
                          Unable to generate insights
                        </p>

                        <p className="mt-1 break-words text-[10px] leading-4 text-red-200/60">
                          {insightsError}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {insightsLoading && (
                  <div className="mt-3 rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.035] p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-400/10">
                        <Sparkles
                          size={14}
                          className="animate-pulse text-cyan-300"
                        />
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-slate-200">
                          Analyzing document
                        </p>

                        <p className="mt-1 text-[10px] text-slate-600">
                          Identifying topics, purpose, findings and important entities...
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      <div className="h-2 animate-pulse rounded-full bg-white/5" />
                      <div className="h-2 w-[90%] animate-pulse rounded-full bg-white/5" />
                      <div className="h-2 w-[76%] animate-pulse rounded-full bg-white/5" />
                      <div className="h-2 w-[84%] animate-pulse rounded-full bg-white/5" />
                    </div>
                  </div>
                )}

                {aiInsights && !insightsLoading && (
                  <div className="mt-3 overflow-hidden rounded-2xl border border-violet-400/15 bg-gradient-to-b from-violet-400/[0.045] via-white/[0.018] to-white/[0.01]">
                    <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-400/10 text-violet-300">
                          <BarChart3 size={15} />
                        </div>

                        <div>
                          <p className="text-xs font-semibold text-slate-100">
                            Document Insights
                          </p>

                          <p className="mt-0.5 text-[9px] text-slate-600">
                            Based on the uploaded document
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setAiInsights("");
                          setInsightsError("");
                        }}
                        className="text-[10px] text-slate-600 transition hover:text-slate-300"
                      >
                        Clear
                      </button>
                    </div>

                    <div className="px-4 py-4">
                      <div
                        className="
                          max-w-none
                          break-words
                          text-[12px]
                          leading-5
                          text-slate-300

                          [&_h1]:mb-2
                          [&_h1]:mt-0
                          [&_h1]:text-base
                          [&_h1]:font-bold
                          [&_h1]:text-white

                          [&_h2]:mb-2
                          [&_h2]:mt-5
                          [&_h2]:text-xs
                          [&_h2]:font-bold
                          [&_h2]:uppercase
                          [&_h2]:tracking-wide
                          [&_h2]:text-cyan-300

                          [&_h3]:mb-2
                          [&_h3]:mt-4
                          [&_h3]:text-xs
                          [&_h3]:font-bold
                          [&_h3]:text-cyan-300

                          [&_p]:mb-3
                          [&_p]:text-slate-300
                          [&_p:last-child]:mb-0

                          [&_strong]:font-bold
                          [&_strong]:text-white

                          [&_ul]:my-2
                          [&_ul]:list-disc
                          [&_ul]:pl-5

                          [&_ol]:my-2
                          [&_ol]:list-decimal
                          [&_ol]:pl-5

                          [&_li]:my-1
                          [&_li]:pl-1
                          [&_li]:text-slate-300

                          [&_li::marker]:text-cyan-400

                          [&_hr]:my-4
                          [&_hr]:border-white/10
                        "
                      >
                        <ReactMarkdown>
                          {aiInsights}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ================================================= */}
              {/* KEY INFORMATION */}
              {/* ================================================= */}

              <div
                ref={keyInfoRef}
                className="mt-6"
              >
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                      Key information
                    </p>

                    <p className="mt-1 text-[10px] text-slate-700">
                      Extract important facts and entities
                    </p>
                  </div>

                  <KeyRound
                    size={15}
                    className="text-slate-600"
                  />
                </div>

                <button
                  type="button"
                  onClick={extractKeyInformation}
                  disabled={
                    keyInfoLoading ||
                    extractingText ||
                    !documentText.trim()
                  }
                  className="group flex w-full items-center justify-between rounded-xl border border-amber-400/15 bg-gradient-to-r from-amber-400/[0.06] to-cyan-400/[0.03] px-4 py-3.5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-400/25 hover:bg-amber-400/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-400/10">
                      {keyInfoLoading ? (
                        <RefreshCw
                          size={15}
                          className="animate-spin text-amber-300"
                        />
                      ) : (
                        <KeyRound
                          size={15}
                          className="text-amber-300"
                        />
                      )}
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-slate-200">
                        {keyInfoLoading
                          ? "Extracting information..."
                          : keyInformation
                            ? "Refresh key information"
                            : "Extract key information"}
                      </p>

                      <p className="mt-0.5 text-[10px] text-slate-600">
                        {keyInfoLoading
                          ? "Finding important details..."
                          : "People, dates, numbers, organizations and more"}
                      </p>
                    </div>
                  </div>

                  {!keyInfoLoading && (
                    <span className="text-slate-700 transition-transform group-hover:translate-x-0.5 group-hover:text-amber-300">
                      →
                    </span>
                  )}
                </button>

                {/* KEY INFORMATION ERROR */}

                {keyInfoError && !keyInfoLoading && (
                  <div className="mt-3 rounded-xl border border-red-400/15 bg-red-400/[0.03] p-3">
                    <div className="flex items-start gap-2.5">
                      <X
                        size={14}
                        className="mt-0.5 shrink-0 text-red-300"
                      />

                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-red-300">
                          Unable to extract information
                        </p>

                        <p className="mt-1 break-words text-[10px] leading-4 text-red-200/60">
                          {keyInfoError}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* KEY INFORMATION LOADING */}

                {keyInfoLoading && (
                  <div className="mt-3 rounded-2xl border border-amber-400/15 bg-amber-400/[0.025] p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400/10">
                        <KeyRound
                          size={14}
                          className="animate-pulse text-amber-300"
                        />
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-slate-200">
                          Extracting key information
                        </p>

                        <p className="mt-1 text-[10px] text-slate-600">
                          Looking for important entities, dates, numbers and facts...
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      <div className="h-2 animate-pulse rounded-full bg-white/5" />
                      <div className="h-2 w-[86%] animate-pulse rounded-full bg-white/5" />
                      <div className="h-2 w-[72%] animate-pulse rounded-full bg-white/5" />
                      <div className="h-2 w-[91%] animate-pulse rounded-full bg-white/5" />
                    </div>
                  </div>
                )}

                {/* KEY INFORMATION RESULT */}

                {keyInformation && !keyInfoLoading && (
                  <div className="mt-3 overflow-hidden rounded-2xl border border-amber-400/15 bg-gradient-to-b from-amber-400/[0.035] via-white/[0.018] to-white/[0.01]">
                    <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-400/10 text-amber-300">
                          <KeyRound size={15} />
                        </div>

                        <div>
                          <p className="text-xs font-semibold text-slate-100">
                            Key Information
                          </p>

                          <p className="mt-0.5 text-[9px] text-slate-600">
                            Extracted from the document
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setKeyInformation("");
                          setKeyInfoError("");
                        }}
                        className="text-[10px] text-slate-600 transition hover:text-slate-300"
                      >
                        Clear
                      </button>
                    </div>

                    <div className="px-4 py-4">
                      <div
                        className="
                          max-w-none
                          break-words
                          text-[12px]
                          leading-5
                          text-slate-300

                          [&_h1]:mb-2
                          [&_h1]:mt-0
                          [&_h1]:text-base
                          [&_h1]:font-bold
                          [&_h1]:text-white

                          [&_h2]:mb-2
                          [&_h2]:mt-5
                          [&_h2]:text-xs
                          [&_h2]:font-bold
                          [&_h2]:uppercase
                          [&_h2]:tracking-wide
                          [&_h2]:text-amber-300

                          [&_h3]:mb-2
                          [&_h3]:mt-4
                          [&_h3]:text-xs
                          [&_h3]:font-bold
                          [&_h3]:text-amber-300

                          [&_p]:mb-3
                          [&_p]:text-slate-300
                          [&_p:last-child]:mb-0

                          [&_strong]:font-bold
                          [&_strong]:text-white

                          [&_ul]:my-2
                          [&_ul]:list-disc
                          [&_ul]:pl-5

                          [&_ol]:my-2
                          [&_ol]:list-decimal
                          [&_ol]:pl-5

                          [&_li]:my-1
                          [&_li]:pl-1
                          [&_li]:text-slate-300

                          [&_li::marker]:text-amber-400

                          [&_hr]:my-4
                          [&_hr]:border-white/10
                        "
                      >
                        <ReactMarkdown>
                          {keyInformation}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ================================================= */}
              {/* AI-GENERATED TOPICS */}
              {/* ================================================= */}

              <div
                ref={topicsRef}
                className="mt-6"
              >
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                      Document topics
                    </p>

                    <p className="mt-1 text-[10px] text-slate-700">
                      Explore the main subjects in this document
                    </p>
                  </div>

                  <Tags
                    size={15}
                    className="text-slate-600"
                  />
                </div>

                <button
                  type="button"
                  onClick={generateTopics}
                  disabled={
                    topicsLoading ||
                    extractingText ||
                    !documentText.trim()
                  }
                  className="group flex w-full items-center justify-between rounded-xl border border-fuchsia-400/15 bg-gradient-to-r from-fuchsia-400/[0.06] to-violet-400/[0.04] px-4 py-3.5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-fuchsia-400/30 hover:bg-fuchsia-400/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-fuchsia-400/10">
                      {topicsLoading ? (
                        <RefreshCw
                          size={15}
                          className="animate-spin text-fuchsia-300"
                        />
                      ) : (
                        <Tags
                          size={15}
                          className="text-fuchsia-300"
                        />
                      )}
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-slate-200">
                        {topicsLoading
                          ? "Finding document topics..."
                          : aiTopics.length > 0
                            ? "Regenerate topics"
                            : "Generate document topics"}
                      </p>

                      <p className="mt-0.5 text-[10px] text-slate-600">
                        {topicsLoading
                          ? "Identifying the main subjects..."
                          : "Get clickable topics to explore with AI"}
                      </p>
                    </div>
                  </div>

                  {!topicsLoading && (
                    <span className="text-slate-700 transition-transform group-hover:translate-x-0.5 group-hover:text-fuchsia-300">
                      →
                    </span>
                  )}
                </button>

                {topicsError && !topicsLoading && (
                  <div className="mt-3 rounded-xl border border-red-400/15 bg-red-400/[0.03] p-3">
                    <div className="flex items-start gap-2.5">
                      <X
                        size={14}
                        className="mt-0.5 shrink-0 text-red-300"
                      />

                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-red-300">
                          Unable to generate topics
                        </p>

                        <p className="mt-1 break-words text-[10px] leading-4 text-red-200/60">
                          {topicsError}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {topicsLoading && (
                  <div className="mt-3 rounded-2xl border border-fuchsia-400/15 bg-fuchsia-400/[0.025] p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-fuchsia-400/10">
                        <Sparkles
                          size={14}
                          className="animate-pulse text-fuchsia-300"
                        />
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-slate-200">
                          Discovering topics
                        </p>

                        <p className="mt-1 text-[10px] text-slate-600">
                          Finding the main subjects covered in the document...
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <div className="h-7 w-24 animate-pulse rounded-full bg-white/5" />
                      <div className="h-7 w-32 animate-pulse rounded-full bg-white/5" />
                      <div className="h-7 w-20 animate-pulse rounded-full bg-white/5" />
                      <div className="h-7 w-28 animate-pulse rounded-full bg-white/5" />
                    </div>
                  </div>
                )}

                {aiTopics.length > 0 && !topicsLoading && (
                  <div className="mt-3 rounded-2xl border border-fuchsia-400/15 bg-gradient-to-b from-fuchsia-400/[0.035] via-white/[0.018] to-white/[0.01] p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-fuchsia-400/10">
                          <Tags
                            size={13}
                            className="text-fuchsia-300"
                          />
                        </div>

                        <p className="text-xs font-semibold text-slate-200">
                          Main topics
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setAiTopics([]);
                          setTopicsError("");
                        }}
                        className="text-[10px] text-slate-600 transition hover:text-slate-300"
                      >
                        Clear
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {aiTopics.map((topic, index) => (
                        <button
                          key={`${topic}-${index}`}
                          type="button"
                          onClick={() => askAboutTopic(topic)}
                          disabled={aiLoading || extractingText}
                          className="group inline-flex max-w-full items-center gap-1.5 rounded-full border border-fuchsia-400/15 bg-fuchsia-400/[0.05] px-3 py-1.5 text-left text-[11px] font-medium text-fuchsia-200 transition-all hover:-translate-y-0.5 hover:border-fuchsia-400/35 hover:bg-fuchsia-400/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                          title={`Ask AI about ${topic}`}
                        >
                          <span className="truncate">
                            {topic}
                          </span>
                          <span className="shrink-0 text-fuchsia-400/50 transition-colors group-hover:text-fuchsia-300">
                            →
                          </span>
                        </button>
                      ))}
                    </div>

                    <p className="mt-3 text-[9px] leading-4 text-slate-700">
                      Click any topic to ask DocuFlow AI for a focused explanation.
                    </p>
                  </div>
                )}
              </div>

              {/* ================================================= */}
              {/* QUICK ACTIONS */}
              {/* ================================================= */}

              <div className="mt-6">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                    Quick actions
                  </p>

                  <span className="text-[10px] text-slate-700">
                    AI
                  </span>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    disabled={
                      aiLoading || extractingText
                    }
                    onClick={() =>
                      askPresetQuestion(
                        "Give me a concise summary of this document. Include the main purpose, the most important points, and the overall conclusion."
                      )
                    }
                    className="group flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.025] px-4 py-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-400/20 hover:bg-cyan-400/[0.05] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="text-xs font-medium text-slate-400 transition-colors group-hover:text-slate-200">
                      Summarize this document
                    </span>

                    <span className="text-slate-700 transition-transform group-hover:translate-x-0.5 group-hover:text-cyan-300">
                      →
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={
                      aiLoading || extractingText
                    }
                    onClick={() =>
                      askPresetQuestion(
                        "Identify the most important key points from this document. Present them as clear bullet points."
                      )
                    }
                    className="group flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.025] px-4 py-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-400/20 hover:bg-cyan-400/[0.05] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="text-xs font-medium text-slate-400 transition-colors group-hover:text-slate-200">
                      What are the key points?
                    </span>

                    <span className="text-slate-700 transition-transform group-hover:translate-x-0.5 group-hover:text-cyan-300">
                      →
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={
                      aiLoading || extractingText
                    }
                    onClick={() =>
                      askPresetQuestion(
                        "Explain the main ideas of this document in simple language. Avoid unnecessary technical terms and explain important concepts clearly."
                      )
                    }
                    className="group flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.025] px-4 py-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-400/20 hover:bg-cyan-400/[0.05] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="text-xs font-medium text-slate-400 transition-colors group-hover:text-slate-200">
                      Explain this simply
                    </span>

                    <span className="text-slate-700 transition-transform group-hover:translate-x-0.5 group-hover:text-cyan-300">
                      →
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={
                      aiLoading || extractingText
                    }
                    onClick={() =>
                      askPresetQuestion(
                        "Find the most important facts, numbers, dates, names, organizations, findings, and other specific information in this document."
                      )
                    }
                    className="group flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.025] px-4 py-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-400/20 hover:bg-cyan-400/[0.05] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="text-xs font-medium text-slate-400 transition-colors group-hover:text-slate-200">
                      Find key information
                    </span>

                    <span className="text-slate-700 transition-transform group-hover:translate-x-0.5 group-hover:text-cyan-300">
                      →
                    </span>
                  </button>
                </div>
              </div>

              {/* ================================================= */}
              {/* CONVERSATION */}
              {/* ================================================= */}

              <div className="mt-7">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                      Conversation
                    </p>
                    <p className="mt-1 text-[10px] text-slate-700">
                      Ask questions and continue with natural follow-ups.
                    </p>
                  </div>

                  {conversation.length > 0 && !aiLoading && (
                    <button
                      type="button"
                      onClick={() => {
                        setConversation([]);
                        setAiAnswer("");
                        setAiError("");
                        setAiQuestion("");
                      }}
                      className="rounded-lg px-2 py-1 text-[10px] font-medium text-slate-600 transition hover:bg-white/[0.04] hover:text-slate-300"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <form
                  onSubmit={handleAIFormSubmit}
                  className="rounded-2xl border border-cyan-400/15 bg-gradient-to-b from-cyan-400/[0.055] to-white/[0.02] p-3 shadow-[0_0_30px_rgba(34,211,238,0.035)] transition focus-within:border-cyan-400/30"
                >
                  <div className="flex items-end gap-2">
                    <textarea
                      value={aiQuestion}
                      onChange={(event) => setAiQuestion(event.target.value)}
                      onKeyDown={(event) => {
                        if (
                          event.key === "Enter" &&
                          (event.ctrlKey || event.metaKey)
                        ) {
                          event.preventDefault();
                          askAI(aiQuestion);
                        }
                      }}
                      placeholder="Ask anything about this document..."
                      rows={3}
                      disabled={aiLoading || extractingText}
                      className="min-h-[76px] flex-1 resize-none bg-transparent px-1 py-1 text-sm leading-6 text-slate-200 outline-none placeholder:text-slate-600 disabled:opacity-60"
                    />

                    <button
                      type="submit"
                      disabled={
                        aiLoading ||
                        extractingText ||
                        !aiQuestion.trim() ||
                        !documentText.trim()
                      }
                      className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-400 text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.16)] transition hover:bg-cyan-300 hover:shadow-[0_0_25px_rgba(34,211,238,0.25)] disabled:cursor-not-allowed disabled:opacity-35"
                      aria-label="Ask DocuFlow AI"
                    >
                      {aiLoading ? (
                        <RefreshCw size={15} className="animate-spin" />
                      ) : (
                        <Send size={15} />
                      )}
                    </button>
                  </div>

                  <div className="mt-2 flex items-center justify-between border-t border-white/5 pt-2">
                    <span className="text-[9px] text-slate-600">
                      Ask, follow up, or refer to something from the previous answer.
                    </span>
                    <span className="shrink-0 text-[9px] text-slate-700">
                      Ctrl + Enter
                    </span>
                  </div>
                </form>
              </div>

              {/* ================================================= */}
              {/* AI CONVERSATION */}
              {/* ================================================= */}

              <div
                ref={aiResponseRef}
                className="mt-3 space-y-3"
              >
                {aiLoading && (
                  <div className="rounded-2xl border border-cyan-400/15 bg-gradient-to-b from-cyan-400/[0.06] to-white/[0.02] p-5 shadow-[0_0_30px_rgba(34,211,238,0.04)]">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10">
                        <Sparkles size={16} className="animate-pulse text-cyan-300" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-200">
                          DocuFlow AI is thinking
                        </p>
                        <p className="mt-1 text-[11px] leading-4 text-slate-600">
                          Reading your document and conversation context...
                        </p>
                      </div>
                    </div>
                    <div className="mt-5 space-y-2.5">
                      <div className="h-2 animate-pulse rounded-full bg-white/5" />
                      <div className="h-2 w-[88%] animate-pulse rounded-full bg-white/5" />
                      <div className="h-2 w-[68%] animate-pulse rounded-full bg-white/5" />
                      <div className="h-2 w-[78%] animate-pulse rounded-full bg-white/5" />
                    </div>
                  </div>
                )}

                {aiError && !aiLoading && (
                  <div className="rounded-2xl border border-red-400/15 bg-red-400/[0.03] p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-400/10">
                        <X size={15} className="text-red-300" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-red-300">
                          AI request failed
                        </p>
                        <p className="mt-1.5 break-words text-xs leading-5 text-red-200/60">
                          {aiError}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {!aiLoading && !aiError && conversation.length === 0 && (
                  <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.015] px-6 text-center">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-400/10">
                      <Sparkles size={18} className="text-cyan-300" />
                    </div>
                    <p className="mt-4 text-sm font-semibold text-slate-300">
                      Your conversation starts here
                    </p>
                    <p className="mt-2 max-w-[300px] text-xs leading-5 text-slate-600">
                      Ask about the document above. DocuFlow AI will use the document and your previous messages for follow-up questions.
                    </p>
                  </div>
                )}

                {conversation.map((message, index) => {
                  const isUser = message.role === "user";
                  const isLastAssistant =
                    message.role === "assistant" &&
                    index === conversation.length - 1;

                  return (
                    <div
                      key={`${message.role}-${index}`}
                      className={isUser ? "flex justify-end" : "flex justify-start"}
                    >
                      <div
                        className={
                          isUser
                            ? "w-[88%] rounded-2xl rounded-br-md border border-cyan-400/15 bg-cyan-400/[0.07] px-4 py-3"
                            : "w-[94%] overflow-hidden rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.025]"
                        }
                      >
                        {isUser ? (
                          <div>
                            <div className="mb-1.5 flex items-center justify-between gap-2">
                              <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-cyan-300/70">
                                You
                              </span>
                            </div>
                            <p className="whitespace-pre-wrap break-words text-xs leading-5 text-slate-200">
                              {message.content}
                            </p>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-300">
                                  <Sparkles size={14} />
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-slate-100">
                                    DocuFlow AI
                                  </p>
                                  <p className="mt-0.5 text-[9px] text-slate-600">
                                    Based on your document
                                  </p>
                                </div>
                              </div>
                              {isLastAssistant && (
                                <button
                                  type="button"
                                  onClick={copyAIAnswer}
                                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[10px] font-medium text-slate-500 transition hover:border-cyan-400/20 hover:bg-cyan-400/10 hover:text-cyan-300"
                                >
                                  <Copy size={11} />
                                  {copied ? "Copied" : "Copy"}
                                </button>
                              )}
                            </div>

                            <div className="px-4 py-4">
                              <div className="max-w-none break-words text-[12px] leading-5 text-slate-300 [&_h1]:mb-3 [&_h1]:mt-0 [&_h1]:text-base [&_h1]:font-bold [&_h1]:text-white [&_h2]:mb-2 [&_h2]:mt-5 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-white [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-xs [&_h3]:font-bold [&_h3]:text-cyan-300 [&_p]:mb-3 [&_p:last-child]:mb-0 [&_strong]:font-bold [&_strong]:text-white [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 [&_li]:pl-1 [&_li]:text-slate-300 [&_li::marker]:text-cyan-400 [&_blockquote]:my-3 [&_blockquote]:border-l-2 [&_blockquote]:border-cyan-400/30 [&_blockquote]:pl-3 [&_blockquote]:text-slate-400 [&_hr]:my-4 [&_hr]:border-white/10 [&_code]:rounded-md [&_code]:bg-white/[0.07] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-cyan-300">
                                <ReactMarkdown>{message.content}</ReactMarkdown>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="my-6 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

              {/* ================================================= */}
              {/* DOCUMENT DETAILS */}
              {/* ================================================= */}

              <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-300">
                    Document details
                  </p>

                  <FileText
                    size={14}
                    className="text-slate-600"
                  />
                </div>

                <div className="mt-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-500">
                      File
                    </span>

                    <span className="max-w-[210px] truncate text-right text-slate-300">
                      {file?.name}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">
                      Pages
                    </span>

                    <span className="text-slate-300">
                      {pdf?.numPages ?? "—"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">
                      Size
                    </span>

                    <span className="text-slate-300">
                      {file
                        ? `${(
                            file.size /
                            (1024 * 1024)
                          ).toFixed(2)} MB`
                        : "—"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">
                      AI status
                    </span>

                    <span className="text-emerald-300">
                      {documentText
                        ? "Ready"
                        : extractingText
                          ? "Reading"
                          : "Waiting"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="h-5" />
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}