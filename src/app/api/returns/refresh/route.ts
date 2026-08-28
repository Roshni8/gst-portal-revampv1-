import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/api-auth";
import { provisionTestAdminReturns } from "@/lib/returns-demo";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

// This deliberately resets only the synthetic August workspace. IRP source
// records are retained, so the user can import the same e-invoices again.
export async function POST(request: Request) {
  const user = await requireAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { taxPeriod } = await request.json() as { taxPeriod?: string };
  if (taxPeriod !== "082026") return NextResponse.json({ error: "Only the August 2026 prototype workspace can be refreshed." }, { status: 400 });

  const supabase = getSupabaseAdmin();
  try {
    const { data: returnRow, error: returnError } = await supabase.from("gstr1_returns").select("id,gstin").eq("user_id", user.id).eq("tax_period", taxPeriod).maybeSingle();
    if (returnError || !returnRow) return NextResponse.json({ error: "August GSTR-1 return not found." }, { status: 404 });
    const { data: workspace, error: workspaceError } = await supabase.from("ims_workspaces").select("id").eq("user_id", user.id).eq("tax_period", taxPeriod).maybeSingle();
    if (workspaceError) throw workspaceError;

    // Uploads must go first because their reconciliation results restrict a
    // referenced e-invoice document from being deleted.
    const deletions = await Promise.all([
      supabase.from("erp_invoice_uploads").delete().eq("gstr1_return_id", returnRow.id),
      workspace ? supabase.from("ims_workspaces").delete().eq("id", workspace.id) : Promise.resolve({ error: null }),
    ]);
    if (deletions.some((result) => result.error)) throw new Error("Unable to clear August uploads.");
    const { error: documentsError } = await supabase.from("gstr1_documents").delete().eq("gstr1_return_id", returnRow.id);
    if (documentsError) throw documentsError;
    const { error: hsnError } = await supabase.from("gstr1_hsn_summaries").delete().eq("gstr1_return_id", returnRow.id);
    if (hsnError) throw hsnError;
    const { error: returnUpdateError } = await supabase.from("gstr1_returns").update({ status: "DRAFT", arn: null, arn_date: null, filed_at: null, filing_method: null }).eq("id", returnRow.id);
    if (returnUpdateError) throw returnUpdateError;
    const { error: historyError } = await supabase.from("taxpayer_filing_history").upsert([
      { gstin: returnRow.gstin, return_type: "GSTR-1", tax_period: taxPeriod, filing_date: null, arn: null, status: "Not Filed", due_date: "2026-09-11" },
      { gstin: returnRow.gstin, return_type: "GSTR-3B", tax_period: taxPeriod, filing_date: null, arn: null, status: "Not Filed", due_date: "2026-09-20" },
    ], { onConflict: "gstin,return_type,tax_period" });
    if (historyError) throw historyError;
    await provisionTestAdminReturns(supabase, user.id, user.email);
    return NextResponse.json({ refreshed: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to refresh August data." }, { status: 500 });
  }
}
