import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Check,
  FileSearch,
  FileText,
  FolderOpen,
  GitCompare,
  Layers3,
  Lock,
  MessageSquareText,
  ScanText,
  Search,
  Sparkles,
  Upload,
  Zap,
} from "lucide-react";

const features = [
  {
    icon: FileText,
    title: "PDF Tools",
    description:
      "Merge, split, reorder, rotate, extract, compress, and manage PDF pages with ease.",
  },
  {
    icon: Bot,
    title: "AI Document Assistant",
    description:
      "Ask questions about your documents and get clear answers based on their content.",
  },
  {
    icon: Sparkles,
    title: "Smart Summaries",
    description:
      "Turn lengthy documents into concise summaries, key points, and useful insights.",
  },
  {
    icon: Search,
    title: "Smart Search",
    description:
      "Find relevant information quickly across your uploaded documents.",
  },
  {
    icon: ScanText,
    title: "OCR Support",
    description:
      "Extract readable text from scanned documents and image-based PDFs.",
  },
  {
    icon: GitCompare,
    title: "Document Comparison",
    description:
      "Compare two versions of a document and identify important changes.",
  },
];

const workflow = [
  {
    number: "01",
    icon: Upload,
    title: "Upload",
    description:
      "Add your PDF or document to your workspace.",
  },
  {
    number: "02",
    icon: Sparkles,
    title: "Process",
    description:
      "Use document tools or let AI understand the content.",
  },
  {
    number: "03",
    icon: MessageSquareText,
    title: "Interact",
    description:
      "Ask questions, search information, or generate summaries.",
  },
];

const tools = [
  "Merge PDF",
  "Split PDF",
  "Compress PDF",
  "Extract Pages",
  "Rotate Pages",
  "PDF to Images",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-400/20">
              <FileText size={20} strokeWidth={2.5} />
            </div>

            <span className="text-xl font-bold tracking-tight">
              Docu<span className="text-cyan-400">Flow</span>
            </span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            <a
              href="#features"
              className="text-sm text-slate-300 transition hover:text-white"
            >
              Features
            </a>

            <a
              href="#workflow"
              className="text-sm text-slate-300 transition hover:text-white"
            >
              How it works
            </a>

            <a
              href="#tools"
              className="text-sm text-slate-300 transition hover:text-white"
            >
              PDF Tools
            </a>
          </div>

          <Link
            href="/dashboard"
            className="group flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            Open Workspace
            <ArrowRight
              size={16}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Background glow */}
        <div className="pointer-events-none absolute left-1/2 top-0 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-cyan-500/10 blur-3xl" />

        <div className="pointer-events-none absolute left-1/2 top-32 h-96 w-96 -translate-x-1/2 rounded-full border border-cyan-400/10" />

        <div className="relative mx-auto max-w-7xl px-6 pb-24 pt-24 lg:px-8 lg:pb-32 lg:pt-32">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/5 px-4 py-2 text-sm text-cyan-300">
              <Sparkles size={15} />
              <span>AI-powered document workspace</span>
            </div>

            <h1 className="text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
              Your documents.
              <br />
              <span className="bg-gradient-to-r from-cyan-300 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
                Smarter and simpler.
              </span>
            </h1>

            <p className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-slate-400 sm:text-xl">
              Upload, organize, edit, search, and understand your documents
              from one intelligent workspace. Powerful PDF tools meet AI
              document assistance.
            </p>

            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/dashboard"
                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-6 py-3.5 font-semibold text-slate-950 shadow-xl shadow-cyan-400/10 transition hover:bg-cyan-300 sm:w-auto"
              >
                Start Working
                <ArrowRight
                  size={18}
                  className="transition-transform group-hover:translate-x-1"
                />
              </Link>

              <a
                href="#features"
                className="flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-6 py-3.5 font-semibold text-slate-200 transition hover:bg-white/[0.07] sm:w-auto"
              >
                Explore Features
              </a>
            </div>
          </div>

          {/* Hero workspace preview */}
          <div className="mx-auto mt-20 max-w-5xl">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-2 shadow-2xl shadow-black/40">
              <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-900">
                {/* Browser bar */}
                <div className="flex items-center gap-2 border-b border-white/10 bg-slate-900 px-4 py-3">
                  <div className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
                  <div className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
                  <div className="h-2.5 w-2.5 rounded-full bg-green-400/70" />

                  <div className="mx-auto hidden rounded-lg border border-white/10 bg-white/[0.03] px-20 py-1.5 text-xs text-slate-500 sm:block">
                    app.docuflow.local
                  </div>
                </div>

                {/* Dashboard preview */}
                <div className="grid min-h-[390px] grid-cols-1 md:grid-cols-[210px_1fr]">
                  {/* Sidebar */}
                  <div className="hidden border-r border-white/10 bg-slate-950/60 p-4 md:block">
                    <div className="mb-7 flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-400 text-slate-950">
                        <FileText size={15} />
                      </div>
                      <span className="text-sm font-bold">
                        Docu<span className="text-cyan-400">Flow</span>
                      </span>
                    </div>

                    <div className="space-y-1">
                      {[
                        { icon: Layers3, label: "Overview", active: true },
                        { icon: FolderOpen, label: "Documents" },
                        { icon: Search, label: "Search" },
                        { icon: Sparkles, label: "AI Assistant" },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-xs ${
                            item.active
                              ? "bg-cyan-400/10 text-cyan-300"
                              : "text-slate-500"
                          }`}
                        >
                          <item.icon size={15} />
                          {item.label}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Main preview */}
                  <div className="p-5 sm:p-7">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-slate-500">Workspace</p>
                        <h3 className="mt-1 text-lg font-semibold">
                          Good morning 👋
                        </h3>
                      </div>

                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-400/10 text-cyan-300">
                        <Zap size={15} />
                      </div>
                    </div>

                    <div className="mt-6 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                        <div className="flex items-center gap-2 text-cyan-300">
                          <FileText size={16} />
                          <span className="text-xs">Documents</span>
                        </div>
                        <p className="mt-3 text-2xl font-bold">24</p>
                        <p className="mt-1 text-[10px] text-slate-500">
                          In your workspace
                        </p>
                      </div>

                      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                        <div className="flex items-center gap-2 text-cyan-300">
                          <MessageSquareText size={16} />
                          <span className="text-xs">AI Queries</span>
                        </div>
                        <p className="mt-3 text-2xl font-bold">86</p>
                        <p className="mt-1 text-[10px] text-slate-500">
                          This month
                        </p>
                      </div>

                      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                        <div className="flex items-center gap-2 text-cyan-300">
                          <Search size={16} />
                          <span className="text-xs">Searches</span>
                        </div>
                        <p className="mt-3 text-2xl font-bold">142</p>
                        <p className="mt-1 text-[10px] text-slate-500">
                          Information found
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.02] p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium">
                            Recent documents
                          </p>
                          <p className="mt-1 text-[10px] text-slate-500">
                            Continue working where you left off
                          </p>
                        </div>

                        <span className="text-[10px] text-cyan-300">
                          View all
                        </span>
                      </div>

                      <div className="mt-4 space-y-2">
                        {[
                          "Machine Learning Research.pdf",
                          "Project Documentation.pdf",
                          "Semester Notes.pdf",
                        ].map((name, index) => (
                          <div
                            key={name}
                            className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5"
                          >
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-400/10 text-red-300">
                              <FileText size={14} />
                            </div>

                            <span className="flex-1 truncate text-[11px] text-slate-300">
                              {name}
                            </span>

                            <span className="text-[10px] text-slate-600">
                              {index + 1} day ago
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature section */}
      <section
        id="features"
        className="border-t border-white/5 bg-slate-900/40 py-24"
      >
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-400">
              Everything in one place
            </p>

            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              More than a PDF editor
            </h2>

            <p className="mt-4 leading-7 text-slate-400">
              DocuFlow combines practical document utilities with intelligent
              features that help you actually understand your files.
            </p>
          </div>

          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-2xl border border-white/10 bg-white/[0.025] p-6 transition duration-300 hover:-translate-y-1 hover:border-cyan-400/20 hover:bg-white/[0.04]"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-400/10 bg-cyan-400/10 text-cyan-300 transition group-hover:bg-cyan-400/15">
                  <feature.icon size={21} />
                </div>

                <h3 className="mt-5 text-lg font-semibold">
                  {feature.title}
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section id="workflow" className="border-t border-white/5 py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-400">
                Simple workflow
              </p>

              <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                From raw documents to useful information.
              </h2>

              <p className="mt-5 max-w-lg leading-7 text-slate-400">
                Whether you need to edit a PDF or understand a 100-page
                document, DocuFlow keeps the process inside one workspace.
              </p>

              <div className="mt-8 flex items-center gap-3 text-sm text-slate-300">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-400/10 text-cyan-300">
                  <Check size={16} />
                </div>
                No complicated workflow
              </div>

              <div className="mt-3 flex items-center gap-3 text-sm text-slate-300">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-400/10 text-cyan-300">
                  <Check size={16} />
                </div>
                One workspace for your documents
              </div>

              <div className="mt-3 flex items-center gap-3 text-sm text-slate-300">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-400/10 text-cyan-300">
                  <Check size={16} />
                </div>
                AI assistance when you need it
              </div>
            </div>

            <div className="space-y-4">
              {workflow.map((step) => (
                <div
                  key={step.number}
                  className="flex gap-5 rounded-2xl border border-white/10 bg-white/[0.025] p-5"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
                    <step.icon size={21} />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold tracking-wider text-cyan-400">
                        {step.number}
                      </span>
                      <h3 className="font-semibold">{step.title}</h3>
                    </div>

                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* PDF Tools */}
      <section
        id="tools"
        className="border-y border-white/5 bg-slate-900/40 py-24"
      >
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-400">
              Document utilities
            </p>

            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              The PDF tools you actually need
            </h2>

            <p className="mt-4 leading-7 text-slate-400">
              Common document operations, designed to work together with the
              intelligent workspace.
            </p>
          </div>

          <div className="mx-auto mt-12 grid max-w-4xl gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {tools.map((tool) => (
              <div
                key={tool}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.025] px-5 py-4"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-300">
                  <Check size={14} />
                </div>

                <span className="text-sm text-slate-300">{tool}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security */}
      <section className="py-20">
        <div className="mx-auto max-w-5xl px-6 lg:px-8">
          <div className="rounded-3xl border border-cyan-400/10 bg-gradient-to-br from-cyan-400/[0.07] to-blue-500/[0.03] p-8 sm:p-12">
            <div className="flex flex-col items-start gap-7 sm:flex-row sm:items-center">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300">
                <Lock size={25} />
              </div>

              <div>
                <h2 className="text-2xl font-bold">
                  Your documents stay in your workspace.
                </h2>

                <p className="mt-2 max-w-2xl leading-7 text-slate-400">
                  DocuFlow is designed with authenticated document storage,
                  controlled access, and a workspace-first approach to your
                  files.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-white/5 py-24">
        <div className="mx-auto max-w-3xl px-6 text-center lg:px-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-400/20">
            <FileSearch size={25} />
          </div>

          <h2 className="mt-7 text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to work smarter with your documents?
          </h2>

          <p className="mx-auto mt-4 max-w-xl leading-7 text-slate-400">
            Start with a document and explore everything you can do with
            DocuFlow.
          </p>

          <Link
            href="/dashboard"
            className="group mt-8 inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-6 py-3.5 font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            Open DocuFlow
            <ArrowRight
              size={18}
              className="transition-transform group-hover:translate-x-1"
            />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-8 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-400 text-slate-950">
              <FileText size={14} />
            </div>

            <span className="text-sm font-semibold">
              Docu<span className="text-cyan-400">Flow</span>
            </span>
          </div>

          <p className="text-xs text-slate-500">
            AI-powered document workspace
          </p>
        </div>
      </footer>
    </main>
  );
}