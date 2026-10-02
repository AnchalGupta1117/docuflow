"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  FileText,
  LogOut,
  Mail,
  Moon,
  Save,
  Shield,
  User,
} from "lucide-react";
import {
  DocuFlowUser,
  getCurrentUser,
  logoutUser,
} from "@/lib/auth";

const SESSION_KEY = "docuflow_session";
const USERS_KEY = "docuflow_users";

interface StoredUser extends DocuFlowUser {
  password?: string;
}

export default function SettingsPage() {
  const router = useRouter();

  const [user, setUser] = useState<DocuFlowUser | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    const currentUser = getCurrentUser();

    if (!currentUser) {
      router.replace("/login");
      return;
    }

    setUser(currentUser);
    setName(currentUser.name);
    setEmail(currentUser.email);
  }, [router]);

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) return;

    const trimmedName = name.trim();

    if (!trimmedName) {
      setSaveError("Please enter your name.");
      setSaved(false);
      return;
    }

    try {
      const updatedUser: DocuFlowUser = {
        ...user,
        name: trimmedName,
      };

      // Update current browser session.
      localStorage.setItem(
        SESSION_KEY,
        JSON.stringify(updatedUser)
      );

      // Update the locally stored account while preserving
      // the existing password field.
      const storedUsers: StoredUser[] = JSON.parse(
        localStorage.getItem(USERS_KEY) || "[]"
      );

      const updatedUsers = storedUsers.map((storedUser) =>
        storedUser.id === user.id
          ? {
              ...storedUser,
              name: updatedUser.name,
            }
          : storedUser
      );

      localStorage.setItem(
        USERS_KEY,
        JSON.stringify(updatedUsers)
      );

      setUser(updatedUser);
      setName(updatedUser.name);
      setSaveError("");
      setSaved(true);

      window.setTimeout(() => {
        setSaved(false);
      }, 2500);
    } catch (error) {
      console.error("Failed to save profile:", error);
      setSaveError("Unable to save your changes. Please try again.");
      setSaved(false);
    }
  }

  function handleLogout() {
    logoutUser();
    router.replace("/login");
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#05070b] text-white">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-cyan-400/20 border-t-cyan-400" />
          <p className="mt-4 text-sm text-zinc-500">
            Loading settings...
          </p>
        </div>
      </main>
    );
  }

  const initials =
    user.name
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  const createdDate = new Date(user.createdAt);

  const formattedCreatedDate = Number.isNaN(createdDate.getTime())
    ? "Recently"
    : createdDate.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

  return (
    <main className="min-h-screen bg-[#05070b] text-white">
      <div className="pointer-events-none absolute inset-0 background-grid opacity-20" />

      <div className="relative mx-auto max-w-5xl px-5 py-8 sm:px-8">
        {/* Header */}
        <header className="mb-10 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white"
          >
            <ArrowLeft size={17} />
            Back to workspace
          </Link>

          <Link
            href="/"
            className="flex items-center gap-2.5"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-400 text-black">
              <FileText size={19} />
            </div>

            <span className="font-semibold tracking-tight">
              Docu<span className="text-cyan-400">Flow</span>
            </span>
          </Link>
        </header>

        {/* Page heading */}
        <div className="mb-8">
          <p className="mb-2 text-sm font-medium text-cyan-400">
            Account
          </p>

          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Settings
          </h1>

          <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-500">
            Manage your profile and workspace preferences.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
          {/* Sidebar */}
          <aside className="h-fit rounded-2xl border border-white/[0.07] bg-white/[0.025] p-2 lg:sticky lg:top-6">
            <a
              href="#profile"
              className="flex items-center gap-3 rounded-xl bg-cyan-400/[0.07] px-3 py-3 text-sm text-cyan-300 transition hover:bg-cyan-400/[0.1]"
            >
              <User size={17} />
              Profile
            </a>

            <a
              href="#security"
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-zinc-500 transition hover:bg-white/[0.03] hover:text-zinc-300"
            >
              <Shield size={17} />
              Security
            </a>

            <a
              href="#appearance"
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-zinc-500 transition hover:bg-white/[0.03] hover:text-zinc-300"
            >
              <Moon size={17} />
              Appearance
            </a>

            <div className="my-2 border-t border-white/[0.06]" />

            <Link
              href="/dashboard"
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-zinc-500 transition hover:bg-white/[0.03] hover:text-zinc-300"
            >
              <ArrowLeft size={17} />
              Workspace
            </Link>
          </aside>

          {/* Main content */}
          <section className="space-y-6">
            {/* Profile */}
            <div
              id="profile"
              className="scroll-mt-8 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6 sm:p-7"
            >
              <div className="mb-7">
                <h2 className="font-semibold text-white">
                  Profile information
                </h2>

                <p className="mt-1 text-sm leading-6 text-zinc-500">
                  Update the information associated with your
                  DocuFlow workspace.
                </p>
              </div>

              {/* Profile summary */}
              <div className="mb-7 flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-black/10 p-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-cyan-400/10 text-lg font-semibold text-cyan-400 ring-1 ring-cyan-400/10">
                  {initials}
                </div>

                <div className="min-w-0">
                  <p className="truncate font-medium text-zinc-200">
                    {user.name}
                  </p>

                  <p className="mt-1 truncate text-sm text-zinc-500">
                    {user.email}
                  </p>

                  <p className="mt-1 text-xs text-zinc-700">
                    Member since {formattedCreatedDate}
                  </p>
                </div>
              </div>

              <form
                onSubmit={handleSave}
                className="space-y-5"
              >
                {/* Name */}
                <div>
                  <label
                    htmlFor="name"
                    className="mb-2 block text-sm font-medium text-zinc-300"
                  >
                    Full name
                  </label>

                  <div className="relative">
                    <User
                      size={17}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600"
                    />

                    <input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(event) =>
                        setName(event.target.value)
                      }
                      autoComplete="name"
                      className="h-12 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/10"
                      placeholder="Enter your full name"
                    />
                  </div>
                </div>

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
                      size={17}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600"
                    />

                    <input
                      id="email"
                      type="email"
                      value={email}
                      disabled
                      className="h-12 w-full cursor-not-allowed rounded-xl border border-white/[0.06] bg-white/[0.02] pl-11 pr-4 text-sm text-zinc-600 outline-none"
                    />
                  </div>

                  <p className="mt-2 text-xs text-zinc-700">
                    Email changes are disabled for the current
                    local account system.
                  </p>
                </div>

                {/* Save row */}
                <div className="flex flex-col gap-3 border-t border-white/[0.06] pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-h-5">
                    {saved && (
                      <div className="flex items-center gap-2 text-sm text-emerald-400">
                        <Check size={16} />
                        Changes saved successfully
                      </div>
                    )}

                    {saveError && (
                      <p className="text-sm text-red-400">
                        {saveError}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 text-sm font-semibold text-black transition hover:bg-cyan-300 active:scale-[0.98]"
                  >
                    <Save size={16} />
                    Save changes
                  </button>
                </div>
              </form>
            </div>

            {/* Security */}
            <div
              id="security"
              className="scroll-mt-8 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6 sm:p-7"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-400/10 text-violet-400">
                  <Shield size={19} />
                </div>

                <div className="min-w-0">
                  <h2 className="font-semibold text-white">
                    Security
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-zinc-500">
                    Your current account and session are managed
                    locally in this browser.
                  </p>

                  <div className="mt-5 rounded-xl border border-white/[0.06] bg-black/10 p-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-emerald-400" />

                      <div>
                        <p className="text-sm font-medium text-zinc-300">
                          Local account session
                        </p>

                        <p className="mt-1 text-xs leading-5 text-zinc-600">
                          This version of DocuFlow uses browser
                          storage for authentication. A production
                          deployment can later replace this with
                          secure server-side authentication.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Appearance */}
            <div
              id="appearance"
              className="scroll-mt-8 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6 sm:p-7"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-400">
                  <Moon size={19} />
                </div>

                <div>
                  <h2 className="font-semibold text-white">
                    Appearance
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-zinc-500">
                    DocuFlow currently uses its dark workspace
                    interface across the application.
                  </p>

                  <div className="mt-5 flex items-center justify-between rounded-xl border border-cyan-400/10 bg-cyan-400/[0.035] p-4">
                    <div>
                      <p className="text-sm font-medium text-zinc-300">
                        Dark mode
                      </p>

                      <p className="mt-1 text-xs text-zinc-600">
                        Optimized for focused document work.
                      </p>
                    </div>

                    <div className="flex h-7 w-12 items-center justify-end rounded-full bg-cyan-400/20 px-1">
                      <div className="h-5 w-5 rounded-full bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.35)]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sign out */}
            <div className="rounded-2xl border border-red-400/10 bg-red-400/[0.02] p-6 sm:p-7">
              <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
                <div>
                  <h2 className="font-semibold text-white">
                    Sign out
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-zinc-500">
                    Sign out of your DocuFlow account on this
                    browser.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-red-400/20 px-4 text-sm font-medium text-red-400 transition hover:bg-red-400/10 active:scale-[0.98]"
                >
                  <LogOut size={16} />
                  Sign out
                </button>
              </div>
            </div>

            {/* Footer note */}
            <div className="pb-8 text-center">
              <p className="text-xs text-zinc-700">
                DocuFlow · AI Document Workspace
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}