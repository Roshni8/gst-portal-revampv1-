"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initialState);
  return <form action={action} className="grid gap-4">
    <label className="grid gap-1 text-sm font-medium">Username<input name="username" autoComplete="username" required className="rounded border-border bg-surface px-3 py-2" /></label>
    <label className="grid gap-1 text-sm font-medium">Password<input name="password" type="password" autoComplete="current-password" required className="rounded border-border bg-surface px-3 py-2" /></label>
    {state.error ? <p role="alert" className="text-sm text-error">{state.error}</p> : null}
    <button disabled={pending} className="rounded bg-primary px-4 py-2 text-on-primary hover:bg-primary-hover disabled:opacity-60">{pending ? "Signing in…" : "Sign in"}</button>
  </form>;
}
