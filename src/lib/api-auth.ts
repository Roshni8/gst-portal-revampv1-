import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function requireAuthenticatedUser(request: Request) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : undefined;

  if (!token) return null;

  const { data, error } = await getSupabaseAdmin().auth.getUser(token);
  return error || !data.user ? null : data.user;
}
