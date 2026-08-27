"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User>();
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let active = true;

    void getSupabaseBrowserClient().auth.getUser().then(({ data, error }) => {
      if (!active) return;
      if (error || !data.user) {
        router.replace("/login");
        return;
      }
      setUser(data.user);
    }).catch(() => {
      if (active) router.replace("/login");
    });

    return () => {
      active = false;
    };
  }, [router]);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await getSupabaseBrowserClient().auth.signOut();
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  if (!user) return <main id="main-content" className="mx-auto grid flex-1 max-w-2xl content-center px-6"><p className="text-text-muted">Checking your secure session...</p></main>;

  const role = typeof user.user_metadata.role === "string" ? user.user_metadata.role : "Authenticated user";
  const username = typeof user.user_metadata.username === "string" ? user.user_metadata.username : user.email;
  return <main id="main-content" className="mx-auto grid flex-1 max-w-2xl content-center gap-6 px-6"><div><h1 className="text-2xl font-semibold">Dashboard</h1><p className="mt-2">Signed in as <strong>{username}</strong>.</p><p className="text-text-muted">Role: {role}</p></div><button type="button" onClick={handleSignOut} disabled={signingOut} className="rounded border-border bg-surface px-4 py-2 text-primary hover:bg-surface-subtle disabled:opacity-60">{signingOut ? "Signing out..." : "Logout"}</button></main>;
}
