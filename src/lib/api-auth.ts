import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function requireAuthenticatedUser(request: Request) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : undefined;

  if (!token) return null;

  const supabase = getSupabaseAdmin();
  // getUser() always calls Supabase Auth. getClaims() validates asymmetric JWTs
  // against the cached JWKS instead, removing an Auth network round-trip from
  // every database-backed API request. Some existing Supabase projects use a
  // token configuration that cannot take the cached-JWKS path, so use getUser
  // as a secure compatibility fallback rather than treating a valid session as
  // anonymous.
  const { data, error } = await supabase.auth.getClaims(token);
  const claims = data?.claims;
  const id = claims?.sub;
  if (!error && claims && typeof id === "string") {
    const email = claims.email;
    return { id, email: typeof email === "string" ? email : undefined };
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) return null;
  return { id: userData.user.id, email: userData.user.email };
}
