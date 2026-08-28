import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function requireAuthenticatedUser(request: Request) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : undefined;

  if (!token) return null;

  // getUser() always calls Supabase Auth. getClaims() validates asymmetric JWTs
  // against the cached JWKS instead, removing an Auth network round-trip from
  // every database-backed API request.
  const { data, error } = await getSupabaseAdmin().auth.getClaims(token);
  const claims = data?.claims;
  const id = claims?.sub;
  if (error || !claims || typeof id !== "string") return null;

  const email = claims.email;
  return { id, email: typeof email === "string" ? email : undefined };
}
