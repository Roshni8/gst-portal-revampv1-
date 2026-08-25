import { NextResponse } from "next/server";
import svgCaptcha from "svg-captcha";
import { CAPTCHA_COOKIE, captchaCookieOptions, createCaptchaToken } from "@/lib/captcha";

export const dynamic = "force-dynamic";

export async function GET() {
  const captcha = svgCaptcha.create({ noise: 3, size: 6, color: true, background: "#f4f4f5", ignoreChars: "0oO1ilI" });
  const response = new NextResponse(captcha.data, { headers: { "Cache-Control": "no-store, max-age=0", "Content-Type": "image/svg+xml; charset=utf-8", "X-Content-Type-Options": "nosniff" } });
  response.cookies.set(CAPTCHA_COOKIE, createCaptchaToken(captcha.text), captchaCookieOptions);
  return response;
}
