"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";

export type LoginState = { error?: string };

export async function loginAction(_state: LoginState, formData: FormData): Promise<LoginState> {
  try {
    await signIn("credentials", { username: formData.get("username"), password: formData.get("password"), captcha: formData.get("captcha"), redirect: false });
  } catch (error) {
    if (error instanceof AuthError) {
      const code = "code" in error ? error.code : undefined;
      if (code === "invalid_captcha") return { error: "The CAPTCHA was incorrect or expired. Try the new image." };
      return { error: "Invalid username or password." };
    }
    throw error;
  }
  redirect("/dashboard");
}
