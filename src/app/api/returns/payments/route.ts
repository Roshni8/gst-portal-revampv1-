import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await requireAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = getSupabaseAdmin();
  const { data: profile, error: profileError } = await supabase.from("taxpayer_profiles").select("gstin").eq("user_id", user.id).maybeSingle();
  if (profileError || !profile) return NextResponse.json({ error: "Unable to load return payments." }, { status: 500 });
  const { data, error } = await supabase.from("taxpayer_filing_history").select("tax_period,tax_paid").eq("gstin", profile.gstin).eq("return_type", "GSTR-3B").in("tax_period", ["042026", "052026", "062026", "072026", "082026"]);
  if (error) return NextResponse.json({ error: "Unable to load return payments." }, { status: 500 });
  return NextResponse.json({ payments: data ?? [] });
}
