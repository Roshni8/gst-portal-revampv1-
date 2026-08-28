import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/api-auth";
import { parseImsErpCsv } from "@/lib/ims-csv";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await requireAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const form = await request.formData();
  const taxPeriod = form.get("taxPeriod");
  const file = form.get("file");
  if (typeof taxPeriod !== "string" || !/^\d{6}$/.test(taxPeriod) || !(file instanceof File)) return NextResponse.json({ error: "Upload a CSV file and provide taxPeriod as MMYYYY." }, { status: 400 });
  if (!file.name.toLowerCase().endsWith(".csv")) return NextResponse.json({ error: "Only CSV uploads are supported for now. Download the sample template to begin." }, { status: 400 });
  try {
    const content = await file.text();
    const parsed = parseImsErpCsv(content);
    if (!parsed.rows.length) return NextResponse.json({ error: "No valid invoice rows were found.", errors: parsed.errors }, { status: 400 });
    const supabase = getSupabaseAdmin();
    const { data: profile, error: profileError } = await supabase.from("taxpayer_profiles").select("gstin").eq("user_id", user.id).maybeSingle();
    if (profileError || !profile) return NextResponse.json({ error: "A taxpayer profile is required before uploading ERP invoices." }, { status: 404 });
    const { data: workspace, error: workspaceError } = await supabase.from("ims_workspaces").upsert({ user_id: user.id, gstin: profile.gstin, tax_period: taxPeriod }, { onConflict: "user_id,tax_period" }).select().single();
    if (workspaceError || !workspace) return NextResponse.json({ error: "Unable to initialise IMS workspace." }, { status: 500 });
    const { data: upload, error: uploadError } = await supabase.from("ims_erp_uploads").insert({ workspace_id: workspace.id, uploaded_by_user_id: user.id, original_filename: file.name, file_sha256: createHash("sha256").update(content).digest("hex"), status: "VALIDATING", total_rows: parsed.totalRows, accepted_rows: parsed.rows.length, rejected_rows: parsed.errors.length, errors: parsed.errors }).select().single();
    if (uploadError || !upload) return NextResponse.json({ error: "Unable to create ERP upload." }, { status: 500 });
    const { error: rowsError } = await supabase.from("ims_erp_invoice_rows").insert(parsed.rows.map((row, index) => ({ upload_id: upload.id, source_row_number: index + 2, ...row })));
    if (rowsError) return NextResponse.json({ error: "Unable to save ERP invoice rows." }, { status: 500 });
    const { data: runId, error: reconcileError } = await supabase.rpc("reconcile_ims_erp_upload", { p_upload_id: upload.id });
    if (reconcileError) return NextResponse.json({ error: "ERP upload saved, but reconciliation could not run." }, { status: 500 });
    const { data: matches, error: matchesError } = await supabase.from("ims_reconciliation_results").select("portal_invoice_id").eq("run_id", runId).eq("status", "AUTO_MATCHED").not("portal_invoice_id", "is", null);
    if (matchesError) return NextResponse.json({ error: "ERP upload reconciled, but matched invoice decisions could not be saved." }, { status: 500 });
    if (matches?.length) {
      const matchedInvoiceIds = matches.map((match) => match.portal_invoice_id);
      const { data: existingDecisions, error: existingError } = await supabase.from("ims_invoice_decisions").select("portal_invoice_id,status,remark").eq("workspace_id", workspace.id).in("portal_invoice_id", matchedInvoiceIds);
      if (existingError) return NextResponse.json({ error: "ERP upload reconciled, but existing decisions could not be checked." }, { status: 500 });
      const existingByInvoice = new Map((existingDecisions ?? []).map((decision) => [decision.portal_invoice_id, decision]));
      const automaticDecisions = matches.filter((match) => {
        const decision = existingByInvoice.get(match.portal_invoice_id);
        return !decision || decision.status === "PENDING" || decision.remark === "Accepted automatically after exact ERP purchase-invoice match.";
      }).map((match) => ({ workspace_id: workspace.id, portal_invoice_id: match.portal_invoice_id, status: "ACCEPTED", decided_by_user_id: user.id, remark: "Accepted automatically after exact ERP purchase-invoice match.", decided_at: new Date().toISOString() }));
      if (automaticDecisions.length) {
        const { error: decisionsError } = await supabase.from("ims_invoice_decisions").upsert(automaticDecisions, { onConflict: "workspace_id,portal_invoice_id" });
        if (decisionsError) return NextResponse.json({ error: "ERP upload reconciled, but matched invoice decisions could not be saved." }, { status: 500 });
      }
    }
    return NextResponse.json({ workspaceId: workspace.id, uploadId: upload.id, reconciliationRunId: runId, acceptedRows: parsed.rows.length, rejectedRows: parsed.errors.length, errors: parsed.errors }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to read ERP CSV." }, { status: 400 }); }
}
