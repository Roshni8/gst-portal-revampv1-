"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    void getSupabaseBrowserClient().auth.getUser().then(({ data, error }) => {
      if (error || !data.user) router.replace("/login");
    }).catch(() => router.replace("/login"));
  }, [router]);

  return <main id="main-content" className="min-h-[50vh] flex-1" />;
}
