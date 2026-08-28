import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const periods = ["042026", "052026", "062026", "072026", "082026"];

type TaxLine = { taxable_value: number | string | null; igst: number | string | null; cgst: number | string | null; sgst_utgst: number | string | null };
type ReturnWithDocuments = { tax_period: string; status: string; filed_at: string | null; gstr1_documents: { gstr1_document_lines: TaxLine[] }[] | null };

const amount = (value: number | string | null | undefined) => Number(value ?? 0);

export async function GET(request: Request) {
  const user = await requireAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdmin();
  const { data: profile, error: profileError } = await supabase
    .from("taxpayer_profiles")
    .select("gstin,legal_name,trade_name")
    .eq("user_id", user.id)
    .maybeSingle();
  if (profileError) return NextResponse.json({ error: "Unable to load the taxpayer." }, { status: 500 });
  if (!profile) return NextResponse.json({ error: "Taxpayer profile not provisioned." }, { status: 404 });

  const [returnsResult, historyResult] = await Promise.all([
    supabase.from("gstr1_returns").select("tax_period,status,filed_at,gstr1_documents(gstr1_document_lines(taxable_value,igst,cgst,sgst_utgst))").eq("user_id", user.id).in("tax_period", periods),
    supabase.from("taxpayer_filing_history").select("return_type,tax_period,filing_date,status,due_date").eq("gstin", profile.gstin).in("tax_period", periods).order("due_date", { ascending: true }),
  ]);
  if (returnsResult.error || historyResult.error) return NextResponse.json({ error: "Unable to load dashboard data. Apply the returns migrations if this is a new database." }, { status: 500 });

  const returns = (returnsResult.data ?? []) as ReturnWithDocuments[];
  const history = historyResult.data ?? [];
  const monthlySummary = periods.map((taxPeriod) => {
    const entry = returns.find((item) => item.tax_period === taxPeriod);
    const lines = entry?.gstr1_documents?.flatMap((document) => document.gstr1_document_lines ?? []) ?? [];
    const taxableValue = lines.reduce((total, line) => total + amount(line.taxable_value), 0);
    const igst = lines.reduce((total, line) => total + amount(line.igst), 0);
    const cgst = lines.reduce((total, line) => total + amount(line.cgst), 0);
    const sgst = lines.reduce((total, line) => total + amount(line.sgst_utgst), 0);
    const filing = history.find((item) => item.tax_period === taxPeriod && item.return_type === "GSTR-3B");
    return { tax_period: taxPeriod, taxable_value: taxableValue, igst, cgst, sgst, total_tax: igst + cgst + sgst, status: filing?.status ?? "Not Filed", filing_date: filing?.filing_date ?? entry?.filed_at ?? null, due_date: filing?.due_date ?? null };
  });

  return NextResponse.json({ profile, monthly_summary: monthlySummary, filing_history: history });
}
