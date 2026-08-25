"use client";

import { useActionState, useState } from "react";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initialState);
  const [captchaKey, setCaptchaKey] = useState(0);
  return <form action={action} className="grid gap-4">
    <label className="grid gap-1 text-sm font-medium">Username<input name="username" autoComplete="username" required className="rounded border px-3 py-2" /></label>
    <label className="grid gap-1 text-sm font-medium">Password<input name="password" type="password" autoComplete="current-password" required className="rounded border px-3 py-2" /></label>
    <div className="grid gap-2"><span className="text-sm font-medium">CAPTCHA</span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/api/captcha?v=${captchaKey}`} alt="CAPTCHA challenge" className="h-16 w-full rounded border bg-zinc-100 object-contain" />
      <button type="button" onClick={() => setCaptchaKey((value) => value + 1)} className="justify-self-start text-sm underline">Get a new CAPTCHA</button>
      <input name="captcha" required autoComplete="off" aria-label="CAPTCHA answer" className="rounded border px-3 py-2" />
    </div>
    {state.error ? <p role="alert" className="text-sm text-red-700">{state.error}</p> : null}
    <button disabled={pending} className="rounded bg-zinc-900 px-4 py-2 text-white disabled:opacity-60">{pending ? "Signing in…" : "Sign in"}</button>
  </form>;
}
