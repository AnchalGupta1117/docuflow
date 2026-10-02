"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  FileText,
  Lock,
  Mail,
  User,
} from "lucide-react";
import { registerUser } from "@/lib/auth";

export default function SignupPage() {
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [agree, setAgree] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!agree) {
      setError("Please accept the Terms of Service and Privacy Policy.");
      return;
    }

    setLoading(true);

    const result = registerUser(name, email, password);

    if (!result.success) {
      setError(result.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <main className="min-h-screen bg-[#05070b] text-white">
      <div className="grid min-h-screen lg:grid-cols-2">
        {/* LEFT BRANDING */}
        <section className="relative hidden overflow-hidden border-r border-white/[0.06] lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-0 background-grid opacity-30" />

          <div className="absolute left-1/4 top-1/4 h-72 w-72 rounded-full bg-cyan-500/10 blur-[100px]" />
          <div className="absolute bottom-1/4 right-1/4 h-72 w-72 rounded-full bg-violet-500/10 blur-[110px]" />

          <div className="relative z-10 p-10">
            <Link href="/" className="inline-flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400 text-black">
                <FileText size={21} />
              </div>

              <span className="text-xl font-semibold">
                Docu<span className="text-cyan-400">Flow</span>
              </span>
            </Link>
          </div>

          <div className="relative z-10 max-w-xl px-10 pb-20">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/[0.06] px-3 py-1.5 text-xs font-medium text-cyan-300">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
              Get started with DocuFlow
            </div>

            <h1 className="text-5xl font-semibold leading-[1.08] tracking-tight xl:text-6xl">
              Everything your
              <br />
              <span className="text-gradient">documents need.</span>
            </h1>

            <p className="mt-6 max-w-lg text-base leading-7 text-zinc-400">
              Create your workspace and bring your PDFs, images and documents
              together with powerful tools and AI assistance.
            </p>

            <div className="mt-10 space-y-3">
              {[
                "Manage your documents in one workspace",
                "Edit, merge, split and compress PDFs",
                "Ask AI questions about your documents",
                "Search, analyze and extract key information",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 text-sm text-zinc-300"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-400/10 text-cyan-400">
                    <Check size={14} />
                  </span>

                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 px-10 pb-8 text-xs text-zinc-600">
            © {new Date().getFullYear()} DocuFlow
          </div>
        </section>

        {/* SIGNUP */}
        <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-10">
          <div className="absolute inset-0 background-grid opacity-20 lg:hidden" />

          <div className="relative z-10 w-full max-w-md">
            {/* MOBILE LOGO */}
            <div className="mb-10 flex justify-center lg:hidden">
              <Link href="/" className="inline-flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400 text-black">
                  <FileText size={21} />
                </div>

                <span className="text-xl font-semibold">
                  Docu<span className="text-cyan-400">Flow</span>
                </span>
              </Link>
            </div>

            <div className="mb-7">
              <p className="mb-3 text-sm font-medium text-cyan-400">
                Create your workspace
              </p>

              <h2 className="text-3xl font-semibold tracking-tight">
                Create your account
              </h2>

              <p className="mt-3 text-sm leading-6 text-zinc-500">
                Start managing and understanding your documents with DocuFlow.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* NAME */}
              <div>
                <label
                  htmlFor="name"
                  className="mb-2 block text-sm font-medium text-zinc-300"
                >
                  Full name
                </label>

                <div className="relative">
                  <User
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600"
                  />

                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    autoComplete="name"
                    className="h-12 w-full rounded-xl border border-white/[0.09] bg-white/[0.035] pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/10"
                  />
                </div>
              </div>

              {/* EMAIL */}
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-zinc-300"
                >
                  Email address
                </label>

                <div className="relative">
                  <Mail
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600"
                  />

                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    className="h-12 w-full rounded-xl border border-white/[0.09] bg-white/[0.035] pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/10"
                  />
                </div>
              </div>

              {/* PASSWORD */}
              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium text-zinc-300"
                >
                  Password
                </label>

                <div className="relative">
                  <Lock
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600"
                  />

                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                    className="h-12 w-full rounded-xl border border-white/[0.09] bg-white/[0.035] pl-11 pr-12 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/10"
                  />

                  <button
                    type="button"
                    aria-label="Toggle password visibility"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300"
                  >
                    {showPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
              </div>

              {/* CONFIRM PASSWORD */}
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-2 block text-sm font-medium text-zinc-300"
                >
                  Confirm password
                </label>

                <div className="relative">
                  <Lock
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600"
                  />

                  <input
                    id="confirmPassword"
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    autoComplete="new-password"
                    className="h-12 w-full rounded-xl border border-white/[0.09] bg-white/[0.035] pl-11 pr-12 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/10"
                  />

                  <button
                    type="button"
                    aria-label="Toggle confirm password visibility"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300"
                  >
                    {showConfirm ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
              </div>

              {/* TERMS */}
              <label className="flex cursor-pointer items-start gap-3 pt-1 text-xs leading-5 text-zinc-500">
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                  className="mt-1 h-4 w-4 shrink-0 accent-cyan-400"
                />

                <span>
                  I agree to the{" "}
                  <span className="text-cyan-400">Terms of Service</span> and{" "}
                  <span className="text-cyan-400">Privacy Policy</span>.
                </span>
              </label>

              {/* ERROR */}
              {error && (
                <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-4 py-3 text-sm leading-5 text-amber-300">
                  {error}
                </div>
              )}

              {/* SUBMIT */}
              <button
                type="submit"
                disabled={loading}
                className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 text-sm font-semibold text-black transition hover:bg-cyan-300 hover:shadow-[0_0_30px_rgba(34,211,238,0.18)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Creating account..." : "Create account"}

                {!loading && (
                  <ArrowRight
                    size={17}
                    className="transition-transform group-hover:translate-x-0.5"
                  />
                )}
              </button>
            </form>

            <p className="mt-7 text-center text-sm text-zinc-500">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-cyan-400 hover:text-cyan-300"
              >
                Sign in
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}