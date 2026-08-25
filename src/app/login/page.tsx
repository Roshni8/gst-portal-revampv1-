import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  if (await auth()) redirect("/dashboard");
  return <main className="mx-auto grid min-h-screen max-w-md content-center gap-6 px-6"><div><h1 className="text-2xl font-semibold">Prototype sign in</h1><p className="mt-2 text-sm text-zinc-600">Use a test account created by the project administrator.</p></div><LoginForm /><p className="text-xs text-zinc-500">Independent hackathon prototype. Not affiliated with GSTN or the Government of India.</p></main>;
}
