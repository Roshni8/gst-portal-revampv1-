"use client";

import { type FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let active = true;

    void getSupabaseBrowserClient().auth.getUser().then(({ data }) => {
      if (active && data.user) router.replace("/dashboard");
    });

    return () => {
      active = false;
    };
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setPending(true);

    const formData = new FormData(event.currentTarget);
    const username = String(formData.get("username") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");
    const email = `${username}@gstprototype.test`;
    try {
      const { error: signInError } = await getSupabaseBrowserClient().auth.signInWithPassword({ email, password });

      if (signInError) {
        setError("The username or password is incorrect. Please try again.");
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("We could not reach the sign-in service. Please check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return <form onSubmit={handleSubmit} className="grid gap-4">
    <label className="grid gap-1 text-sm font-medium">Username<input name="username" autoComplete="username" pattern="[a-zA-Z0-9._-]{3,32}" title="Use 3 to 32 letters, numbers, dots, underscores, or hyphens." required disabled={pending} className="rounded border-border bg-surface px-3 py-2" /></label>
    <label className="grid gap-1 text-sm font-medium">Password<input name="password" type="password" autoComplete="current-password" required disabled={pending} className="rounded border-border bg-surface px-3 py-2" /></label>
    {error ? <p role="alert" className="text-sm text-error">{error}</p> : null}
    <button disabled={pending} className="rounded bg-primary px-4 py-2 text-on-primary hover:bg-primary-hover disabled:opacity-60">{pending ? "Signing in..." : "Sign in"}</button>
  </form>;
}
