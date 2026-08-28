import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await requireAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = getSupabaseAdmin();
  const { data: profile, error: profileError } = await supabase.from("taxpayer_profiles").select("gstin, legal_name, trade_name").eq("user_id", user.id).maybeSingle();
  if (profileError) return NextResponse.json({ error: "Unable to load the taxpayer." }, { status: 500 });
  if (!profile) return NextResponse.json({ error: "Taxpayer profile not provisioned." }, { status: 404 });
  const [{ data: history, error: historyError }, { data: returns, error: returnsError }, { data: workspaces, error: workspaceError }] = await Promise.all([
    supabase.from("taxpayer_filing_history").select("return_type,tax_period,filing_date,arn,status,due_date").eq("gstin", profile.gstin).in("tax_period", ["042026", "052026", "062026", "072026", "082026"]),
    supabase.from("gstr1_returns").select("id,tax_period,status,arn,filed_at").eq("user_id", user.id).in("tax_period", ["042026", "052026", "062026", "072026", "082026"]),
    supabase.from("ims_workspaces").select("id,tax_period,submitted_at").eq("user_id", user.id).in("tax_period", ["042026", "052026", "062026", "072026", "082026"]),
  ]);
  if (historyError || returnsError || workspaceError) return NextResponse.json({ error: "Unable to load return periods. Apply migrations 003–006 if this is a new database." }, { status: 500 });
  return NextResponse.json({ profile, filing_history: history ?? [], gstr1_returns: returns ?? [], ims_workspaces: workspaces ?? [] });
}

