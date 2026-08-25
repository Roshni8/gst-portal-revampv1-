import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

export const CAPTCHA_COOKIE = "gst-prototype-captcha";
const CAPTCHA_TTL_SECONDS = 5 * 60;
type CaptchaPayload = { answer: string; expiresAt: number };

function secret() {
  const value = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET;
  if (!value) throw new Error("NEXTAUTH_SECRET is not configured.");
  return value;
}

function signature(value: string) { return createHmac("sha256", secret()).update(value).digest("base64url"); }

export function createCaptchaToken(answer: string) {
  const payload: CaptchaPayload = { answer: answer.trim().toLowerCase(), expiresAt: Date.now() + CAPTCHA_TTL_SECONDS * 1000 };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${signature(encoded)}`;
}

export function verifyCaptchaToken(token: string | undefined, answer: string) {
  if (!token || !answer.trim()) return false;
  const [encoded, suppliedSignature] = token.split(".");
  if (!encoded || !suppliedSignature) return false;
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(signature(encoded));
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return false;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as CaptchaPayload;
    return payload.expiresAt > Date.now() && payload.answer === answer.trim().toLowerCase();
  } catch { return false; }
}

export const captchaCookieOptions = { httpOnly: true, maxAge: CAPTCHA_TTL_SECONDS, path: "/", sameSite: "strict" as const, secure: process.env.NODE_ENV === "production" };
