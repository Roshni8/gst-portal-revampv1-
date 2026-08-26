import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { AppUser, getSupabaseAdmin } from "@/lib/supabase-admin";

class InvalidLoginError extends CredentialsSignin { code = "invalid_credentials"; }

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  providers: [Credentials({
    credentials: { username: { label: "Username", type: "text" }, password: { label: "Password", type: "password" } },
    async authorize(credentials) {
      if (typeof credentials.username !== "string" || typeof credentials.password !== "string") throw new InvalidLoginError();
      const username = credentials.username.trim().toLowerCase();
      const { data, error } = await getSupabaseAdmin().from("users").select("id, username, password_hash, role").eq("username", username).maybeSingle<AppUser>();
      if (error) throw new Error("Unable to query users.");
      if (!data || !(await bcrypt.compare(credentials.password, data.password_hash))) throw new InvalidLoginError();
      return { id: data.id, name: data.username, role: data.role };
    },
  })],
  callbacks: {
    jwt({ token, user }) { if (user) token.role = user.role; return token; },
    session({ session, token }) { if (session.user) { session.user.id = token.sub ?? ""; session.user.role = typeof token.role === "string" ? token.role : "admin"; } return session; },
  },
});
