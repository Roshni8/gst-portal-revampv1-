import { NextResponse } from "next/server";
import svgCaptcha from "svg-captcha";
import { CAPTCHA_COOKIE, captchaCookieOptions, createCaptchaToken } from "@/lib/captcha";

export const dynamic = "force-dynamic";

export async function GET() {
  const captcha = svgCaptcha.create({
    size: 5,
    width: 320,
    height: 90,
    fontSize: 64,
    noise: 1,
    color: false,
    background: "#ffffff",
    ignoreChars: "0oO1ilI",
  });
  const response = new NextResponse(captcha.data, { headers: { "Cache-Control": "no-store, max-age=0", "Content-Type": "image/svg+xml; charset=utf-8", "X-Content-Type-Options": "nosniff" } });
  response.cookies.set(CAPTCHA_COOKIE, createCaptchaToken(captcha.text), captchaCookieOptions);
  return response;
}
