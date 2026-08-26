"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";

export type LoginState = { error?: string };

export async function loginAction(_state: LoginState, formData: FormData): Promise<LoginState> {
  try {
    await signIn("credentials", { username: formData.get("username"), password: formData.get("password"), redirect: false });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid username or password." };
    }
    throw error;
  }
  redirect("/dashboard");
}
