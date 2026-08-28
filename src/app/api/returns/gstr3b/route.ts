import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await requireAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { taxPeriod } = await request.json() as { taxPeriod?: string };
  if (!taxPeriod || !/^\d{6}$/.test(taxPeriod)) return NextResponse.json({ error: "taxPeriod must use MMYYYY." }, { status: 400 });
  const supabase = getSupabaseAdmin();
  const { data: profile } = await supabase.from("taxpayer_profiles").select("gstin").eq("user_id", user.id).maybeSingle();
  if (!profile) return NextResponse.json({ error: "Taxpayer profile not found." }, { status: 404 });
  const [{ data: gstr1 }, { data: ims }] = await Promise.all([
    supabase.from("gstr1_returns").select("status").eq("user_id", user.id).eq("tax_period", taxPeriod).maybeSingle(),
    supabase.from("ims_workspaces").select("submitted_at").eq("user_id", user.id).eq("tax_period", taxPeriod).maybeSingle(),
  ]);
  if (gstr1?.status !== "FILED") return NextResponse.json({ error: "File GSTR-1 before GSTR-3B." }, { status: 409 });
  if (!ims?.submitted_at) return NextResponse.json({ error: "Submit IMS before GSTR-3B." }, { status: 409 });
  const filedAt = new Date().toISOString();
  const arn = `SIM293B${taxPeriod}${Date.now().toString().slice(-6)}`;
  const dueDate = taxPeriod === "082026" ? "2026-09-20" : filedAt.slice(0, 10);
  const { error } = await supabase.from("taxpayer_filing_history").upsert({ gstin: profile.gstin, return_type: "GSTR-3B", tax_period: taxPeriod, filing_date: filedAt.slice(0, 10), arn, status: "Filed", due_date: dueDate }, { onConflict: "gstin,return_type,tax_period" });
  if (error) return NextResponse.json({ error: "Unable to file GSTR-3B." }, { status: 500 });
  return NextResponse.json({ filed: true, arn });
}

