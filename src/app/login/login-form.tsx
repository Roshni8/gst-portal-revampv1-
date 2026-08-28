"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

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

  return <form onSubmit={handleSubmit} className="gst-login-form">
    <label>Username<input name="username" autoComplete="username" pattern="[a-zA-Z0-9._-]{3,32}" title="Use 3 to 32 letters, numbers, dots, underscores, or hyphens." required disabled={pending} /></label>
    <label>Password<input name="password" type="password" autoComplete="current-password" required disabled={pending} /></label>
    {error ? <p role="alert" className="gst-login-error">{error}</p> : null}
    <button disabled={pending} aria-busy={pending} className="gst-login-submit">{pending ? "Logging in..." : "Login"}</button>
    {pending ? <p role="status" className="gst-login-pending">Checking your details and signing you in securely...</p> : null}
  </form>;
}
