"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  FileText,
  Lock,
  Mail,
} from "lucide-react";
import { loginUser } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) {
      return;
    }

    setError("");

    const normalizedEmail = email.trim();
    const normalizedPassword = password.trim();

    if (!normalizedEmail || !normalizedPassword) {
      setError("Please enter your email and password.");
      return;
    }

    if (!normalizedEmail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);

    try {
      const result = loginUser(
        normalizedEmail,
        normalizedPassword,
      );

      if (!result.success) {
        setError(result.message);
        setLoading(false);
        return;
      }

      /*
       * Current DocuFlow authentication is localStorage-based.
       * The remember-me option is kept in the UI for now, while
       * the existing auth system controls the actual session.
       */
      if (typeof window !== "undefined") {
        localStorage.setItem(
          "docuflow_remember_me",
          String(rememberMe),
        );
      }

      router.push("/dashboard");
    } catch (loginError) {
      console.error("Login failed:", loginError);

      setError(
        "Unable to sign in right now. Please try again.",
      );

      setLoading(false);
    }
  }

  function fillDemo() {
    setEmail("demo@docuflow.app");
    setPassword("demo12345");
    setError(
      "Demo account details filled. Create this account from Sign Up first if it does not exist.",
    );
  }

  function handleForgotPassword() {
    setError(
      "Password reset is not available yet. Please use your registered password.",
    );
  }

  return (
    <main className="min-h-screen bg-[#05070b] text-white">
      <div className="grid min-h-screen lg:grid-cols-2">
        {/* Left branding panel */}
        <section className="relative hidden overflow-hidden border-r border-white/[0.06] lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-0 background-grid opacity-30" />

          <div className="absolute left-1/4 top-1/4 h-72 w-72 rounded-full bg-cyan-500/10 blur-[100px]" />

          <div className="absolute bottom-1/4 right-1/4 h-72 w-72 rounded-full bg-violet-500/10 blur-[110px]" />

          <div className="relative z-10 p-10">
            <Link
              href="/"
              className="inline-flex items-center gap-3"
            >
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
              AI Document Workspace
            </div>

            <h1 className="text-5xl font-semibold leading-[1.08] tracking-tight xl:text-6xl">
              Your documents.
              <br />
              <span className="text-gradient">
                One intelligent workspace.
              </span>
            </h1>

            <p className="mt-6 max-w-lg text-base leading-7 text-zinc-400">
              Upload, edit, search, analyze and understand
              your documents with powerful PDF tools and AI
              assistance in one place.
            </p>

            <div className="mt-10 grid grid-cols-2 gap-3">
              {[
                "PDF utilities",
                "AI document assistant",
                "Smart search",
                "OCR & insights",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-3 text-sm text-zinc-300"
                >
                  <span className="mr-2 text-cyan-400">
                    ✓
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

        {/* Login panel */}
        <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-10">
          <div className="absolute inset-0 background-grid opacity-20 lg:hidden" />

          <div className="relative z-10 w-full max-w-md">
            {/* Mobile logo */}
            <div className="mb-12 flex justify-center lg:hidden">
              <Link
                href="/"
                className="inline-flex items-center gap-3"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400 text-black">
                  <FileText size={21} />
                </div>

                <span className="text-xl font-semibold">
                  Docu<span className="text-cyan-400">
                    Flow
                  </span>
                </span>
              </Link>
            </div>

            <div className="mb-8">
              <p className="mb-3 text-sm font-medium text-cyan-400">
                Welcome back
              </p>

              <h2 className="text-3xl font-semibold tracking-tight">
                Sign in to DocuFlow
              </h2>

              <p className="mt-3 text-sm leading-6 text-zinc-500">
                Access your documents, workspace and AI
                tools.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-5"
              noValidate
            >
              {/* Email */}
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
                    onChange={(event) => {
                      setEmail(event.target.value);

                      if (error) {
                        setError("");
                      }
                    }}
                    placeholder="you@example.com"
                    autoComplete="email"
                    disabled={loading}
                    className="h-12 w-full rounded-xl border border-white/[0.09] bg-white/[0.035] pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-cyan-400/50 focus:bg-white/[0.05] focus:ring-2 focus:ring-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-zinc-300"
                  >
                    Password
                  </label>

                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={loading}
                    className="text-xs font-medium text-cyan-400 transition hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Forgot password?
                  </button>
                </div>

                <div className="relative">
                  <Lock
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600"
                  />

                  <input
                    id="password"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);

                      if (error) {
                        setError("");
                      }
                    }}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    disabled={loading}
                    className="h-12 w-full rounded-xl border border-white/[0.09] bg-white/[0.035] pl-11 pr-12 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-cyan-400/50 focus:bg-white/[0.05] focus:ring-2 focus:ring-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-60"
                  />

                  <button
                    type="button"
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                    onClick={() =>
                      setShowPassword(
                        (value) => !value,
                      )
                    }
                    disabled={loading}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 transition hover:text-zinc-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {showPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember me */}
              <label className="flex cursor-pointer items-center gap-3 text-sm text-zinc-500">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) =>
                    setRememberMe(
                      event.target.checked,
                    )
                  }
                  disabled={loading}
                  className="h-4 w-4 accent-cyan-400"
                />

                Remember me
              </label>

              {/* Error */}
              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-3 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-4 py-3 text-sm leading-5 text-amber-300"
                >
                  <span className="mt-0.5 shrink-0">
                    <CheckCircle2 size={16} />
                  </span>

                  <span>{error}</span>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 text-sm font-semibold text-black transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in

                    <ArrowRight
                      size={17}
                      className="transition-transform group-hover:translate-x-0.5"
                    />
                  </>
                )}
              </button>
            </form>

            <div className="my-8 flex items-center gap-4">
              <div className="h-px flex-1 bg-white/[0.07]" />

              <span className="text-xs text-zinc-700">
                OR
              </span>

              <div className="h-px flex-1 bg-white/[0.07]" />
            </div>

            {/* Demo account */}
            <button
              type="button"
              onClick={fillDemo}
              disabled={loading}
              className="flex h-12 w-full items-center justify-center rounded-xl border border-white/[0.09] bg-white/[0.025] text-sm font-medium text-zinc-300 transition hover:border-white/[0.15] hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Use demo account
            </button>

            <p className="mt-8 text-center text-sm text-zinc-500">
              Don&apos;t have an account?{" "}
              <Link
                href="/signup"
                className="font-medium text-cyan-400 transition hover:text-cyan-300"
              >
                Create one
              </Link>
            </p>

            <p className="mt-6 text-center text-[11px] leading-5 text-zinc-700">
              Your account and workspace are currently
              stored locally in this browser.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}