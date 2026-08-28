import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/api-auth";
import { diagnoseSupplier, type ComplianceProfile } from "@/lib/inward-compile";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const GSTIN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z][A-Z][0-9A-Z]$/;
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

type CompileRequest = { workspaceId?: string; inward_batch_ref?: string; gstin_list?: string[] };

function asProfile(row: Record<string, unknown>): ComplianceProfile {
  return {
    supplier_gstin: String(row.supplier_gstin), legal_name: String(row.legal_name), trade_name: typeof row.trade_name === "string" ? row.trade_name : null,
    state_code: String(row.state_code), gstin_status: row.gstin_status as ComplianceProfile["gstin_status"], filing_frequency: row.filing_frequency as ComplianceProfile["filing_frequency"],
    is_bank_validated: Boolean(row.is_bank_validated), is_e_way_bill_blocked: Boolean(row.is_e_way_bill_blocked),
    last_gstr1_filed_period: typeof row.last_gstr1_filed_period === "string" ? row.last_gstr1_filed_period : null,
    last_gstr3b_filed_period: typeof row.last_gstr3b_filed_period === "string" ? row.last_gstr3b_filed_period : null,
  };
}

export async function POST(request: Request) {
  const user = await requireAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as CompileRequest | null;
  if (!body?.workspaceId) return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });

  const requestedGstins = [...new Set((body.gstin_list ?? []).map((value) => value.trim().toUpperCase()))];
  if (!requestedGstins.length || requestedGstins.some((gstin) => !GSTIN.test(gstin))) return NextResponse.json({ error: "Provide one or more valid supplier GSTINs." }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data: workspace, error: workspaceError } = await supabase.from("ims_workspaces").select("id,gstin").eq("id", body.workspaceId).eq("user_id", user.id).maybeSingle();
  if (workspaceError || !workspace) return NextResponse.json({ error: "Inward workspace not found." }, { status: 404 });
  const { data: invoices, error: invoiceError } = await supabase.from("ims_portal_invoices").select("supplier_gstin").eq("workspace_id", workspace.id);
  if (invoiceError) return NextResponse.json({ error: "Unable to validate inward bills." }, { status: 500 });
  const { data: uploads, error: uploadsError } = await supabase.from("ims_erp_uploads").select("id").eq("workspace_id", workspace.id);
  if (uploadsError) return NextResponse.json({ error: "Unable to validate ERP purchase invoices." }, { status: 500 });
  const uploadIds = (uploads ?? []).map((upload) => upload.id);
  const { data: erpRows, error: erpError } = uploadIds.length ? await supabase.from("ims_erp_invoice_rows").select("supplier_gstin").in("upload_id", uploadIds) : { data: [], error: null };
  if (erpError) return NextResponse.json({ error: "Unable to validate ERP purchase invoices." }, { status: 500 });
  const workspaceGstins = new Set([...(invoices ?? []).map((invoice) => invoice.supplier_gstin), ...(erpRows ?? []).map((invoice) => invoice.supplier_gstin)]);
  if (requestedGstins.some((gstin) => !workspaceGstins.has(gstin))) return NextResponse.json({ error: "Every GSTIN must belong to an inward bill in this workspace." }, { status: 400 });

  const { data: batch, error: batchError } = await supabase.from("inward_compile_batches").insert({ owner_gstin: workspace.gstin, workspace_id: workspace.id, inward_batch_ref: body.inward_batch_ref ?? `IMS-${workspace.id}`, triggered_by_user_id: user.id, total_gstins_count: requestedGstins.length }).select("batch_id").single();
  if (batchError || !batch) return NextResponse.json({ error: "Unable to create the compile batch." }, { status: 500 });

  try {
    const { data: cached, error: cacheError } = await supabase.from("counterparty_profiles").select("*").in("supplier_gstin", requestedGstins);
    if (cacheError) throw new Error("Unable to load supplier compliance cache.");
    const cachedByGstin = new Map((cached ?? []).map((row) => [row.supplier_gstin, row]));
    const staleGstins = requestedGstins.filter((gstin) => {
      const profile = cachedByGstin.get(gstin);
      return !profile || Date.now() - new Date(profile.last_verified_at).getTime() > CACHE_MAX_AGE_MS;
    });
    const missingCount = staleGstins.filter((gstin) => !cachedByGstin.has(gstin)).length;

    // This prototype's GSTN adapter is the seeded registry. Replace this query
    // with the authorised GSTN provider call without changing the audit flow.
    if (staleGstins.length) {
      const { data: registryRows, error: registryError } = await supabase.from("gst_counterparties").select("*").in("gstin", staleGstins);
      if (registryError) throw new Error("Unable to query the supplier registry.");
      const registryByGstin = new Map((registryRows ?? []).map((row) => [row.gstin, row]));
      const refreshed = staleGstins.map((gstin) => {
        const registry = registryByGstin.get(gstin);
        const status = registry?.registration_status === "SUSPENDED" || registry?.registration_status === "CANCELLED" ? registry.registration_status : registry ? "ACTIVE" : "PROVISIONAL";
        const riskNote = registry?.risk_note?.toLowerCase() ?? "";
        return {
          supplier_gstin: gstin, legal_name: registry?.legal_name ?? "Supplier record unavailable from registry", trade_name: registry?.trade_name ?? null, state_code: registry?.state_code ?? gstin.slice(0, 2),
          gstin_status: status, filing_frequency: registry?.gstr1_filing_frequency === "QUARTERLY" ? "QUARTERLY" : "MONTHLY",
          is_bank_validated: status === "ACTIVE", is_e_way_bill_blocked: riskNote.includes("pending") || status === "SUSPENDED", last_gstr1_filed_period: registry?.last_gstr1_period ?? null, last_gstr3b_filed_period: registry?.last_gstr3b_period ?? null,
          last_verified_at: new Date().toISOString(),
        };
      });
      const { error: upsertError } = await supabase.from("counterparty_profiles").upsert(refreshed, { onConflict: "supplier_gstin" });
      if (upsertError) throw new Error("Unable to update supplier compliance cache.");
    }

    const { data: profiles, error: profilesError } = await supabase.from("counterparty_profiles").select("*").in("supplier_gstin", requestedGstins);
    if (profilesError || !profiles || profiles.length !== requestedGstins.length) throw new Error("Unable to load refreshed supplier profiles.");
    const results = profiles.map((row) => {
      const profile = asProfile(row);
      return { ...profile, ...diagnoseSupplier(profile) };
    }).sort((a, b) => a.supplier_gstin.localeCompare(b.supplier_gstin));
    const { error: remarksError } = await supabase.from("inward_compile_gstin_remarks").insert(results.map((result) => ({ batch_id: batch.batch_id, supplier_gstin: result.supplier_gstin, severity: result.severity, diagnostic_code: result.diagnostic_code, system_remark: result.system_remark, action_recommendation: result.action_recommendation, credit_at_risk_flag: result.credit_at_risk_flag })));
    if (remarksError) throw new Error("Unable to write supplier compliance remarks.");
    const summary = { total_gstins: results.length, info_count: results.filter((result) => result.severity === "INFO").length, warning_count: results.filter((result) => result.severity === "WARNING").length, critical_count: results.filter((result) => result.severity === "CRITICAL").length, stale_refreshed: staleGstins.length };
    const { error: completeError } = await supabase.from("inward_compile_batches").update({ status: "COMPLETED", fresh_lookups_count: missingCount, stale_refreshed_count: staleGstins.length, completed_at: new Date().toISOString() }).eq("batch_id", batch.batch_id);
    if (completeError) throw new Error("Unable to complete the compile batch.");
    return NextResponse.json({ batch_id: batch.batch_id, inward_batch_ref: body.inward_batch_ref ?? `IMS-${workspace.id}`, status: "COMPLETED", summary, results });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "The compile could not be completed.";
    await supabase.from("inward_compile_batches").update({ status: "FAILED", error_message: message, completed_at: new Date().toISOString() }).eq("batch_id", batch.batch_id);
    return NextResponse.json({ error: message, batch_id: batch.batch_id }, { status: 500 });
  }
}
