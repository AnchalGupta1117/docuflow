"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getCurrentUser,
  type DocuFlowUser,
} from "@/lib/auth";

export default function DashboardAuth({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const [user, setUser] = useState<DocuFlowUser | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const currentUser = getCurrentUser();

    if (!currentUser) {
      router.replace("/login");
      return;
    }

    setUser(currentUser);
    setChecking(false);
  }, [router]);

  if (checking || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#020617]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-cyan-400/20 border-t-cyan-400" />

          <p className="text-sm text-slate-500">
            Loading your workspace...
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}