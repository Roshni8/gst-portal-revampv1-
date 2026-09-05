"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

const DEMO_ACCOUNT = {
  username: "test_admin@123",
  password: "Bhilai@482#",
  email: "test_admin123@gstprototype.test",
};

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  async function signIn(username: string, password: string) {
    setError(undefined);
    setPending(true);

    const email = username === DEMO_ACCOUNT.username ? DEMO_ACCOUNT.email : `${username}@gstprototype.test`;
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await signIn(username.trim().toLowerCase(), password);
  }

  function useDemoAccount() {
    setUsername(DEMO_ACCOUNT.username);
    setPassword(DEMO_ACCOUNT.password);
    void signIn(DEMO_ACCOUNT.username, DEMO_ACCOUNT.password);
  }

  return <form onSubmit={handleSubmit} className="gst-login-form">
    <section className="gst-demo-login-card" aria-labelledby="demo-login-title">
      <div>
        <h2 id="demo-login-title">Try the demo account</h2>
        <p>Loads the sample taxpayer and signs you in.</p>
      </div>
      <button type="button" className="gst-demo-login-button" disabled={pending} onClick={useDemoAccount}>
        {pending ? "Logging in..." : "Use demo account"}
      </button>
    </section>
    <label>Username<input name="username" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" pattern="[a-zA-Z0-9._@-]{3,32}" title="Use 3 to 32 letters, numbers, dots, underscores, @ symbols, or hyphens." required disabled={pending} /></label>
    <label>Password<input name="password" value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" required disabled={pending} /></label>
    {error ? <p role="alert" className="gst-login-error">{error}</p> : null}
    <button disabled={pending} aria-busy={pending} className="gst-login-submit">{pending ? "Logging in..." : "Login"}</button>
    {pending ? <p role="status" className="gst-login-pending">Checking your details and signing you in securely...</p> : null}
  </form>;
}
