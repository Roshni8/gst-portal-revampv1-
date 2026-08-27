import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return <main id="main-content" className="mx-auto grid flex-1 max-w-2xl content-center gap-6 px-6"><div><h1 className="text-2xl font-semibold">Dashboard</h1><p className="mt-2">Signed in as <strong>{session.user.name}</strong>.</p><p className="text-text-muted">Role: {session.user.role}</p></div><form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}><button className="rounded border-border bg-surface px-4 py-2 text-primary hover:bg-surface-subtle">Logout</button></form></main>;
}
