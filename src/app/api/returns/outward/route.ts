import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

async function ownedReturn(userId: string, taxPeriod: string) {
  return getSupabaseAdmin().from("gstr1_returns").select("*").eq("user_id", userId).eq("tax_period", taxPeriod).maybeSingle();
}

const categoryColumnUnavailable = (error: { code?: string; message?: string } | null) =>
  Boolean(error && (error.code === "PGRST204" || error.message?.includes("gstr1_category")));

const categoryMigrationMessage = "GSTR1 category storage is not ready. Apply database migration 011_gstr1_workspace_actions.sql, then try again.";

export async function GET(request: Request) {
  const user = await requireAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const taxPeriod = new URL(request.url).searchParams.get("taxPeriod");
  if (!taxPeriod || !/^\d{6}$/.test(taxPeriod)) return NextResponse.json({ error: "taxPeriod must use MMYYYY." }, { status: 400 });
  const supabase = getSupabaseAdmin();
  const { data: returnRow, error: returnError } = await ownedReturn(user.id, taxPeriod);
  if (returnError || !returnRow) return NextResponse.json({ error: "GSTR-1 return not found." }, { status: 404 });
  const [{ data: documents, error: documentsError }, { data: irp, error: irpError }, { data: upload, error: uploadError }] = await Promise.all([
    supabase.from("gstr1_documents").select("*, gstr1_document_lines(*)").eq("gstr1_return_id", returnRow.id).neq("record_status", "DELETED").order("document_date"),
    supabase.from("irp_einvoices").select("id,irn,irn_date,imported_gstr1_document_id").eq("user_id", user.id).eq("period", taxPeriod),
    supabase.from("erp_invoice_uploads").select("id,status,total_rows,accepted_rows,rejected_rows,uploaded_at").eq("gstr1_return_id", returnRow.id).order("uploaded_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (documentsError || irpError || uploadError) return NextResponse.json({ error: "Unable to load outward invoices." }, { status: 500 });
  let reconciliation = null;
  let reconciliationResults: unknown[] = [];
  let erpRows: unknown[] = [];
  if (upload) {
    const { data: run } = await supabase.from("invoice_reconciliation_runs").select("id,matched_count,exception_count,completed_at").eq("upload_id", upload.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    reconciliation = run ?? null;
    if (run) {
      const { data: results, error: resultsError } = await supabase.from("invoice_reconciliation_results").select("status,erp_invoice_row_id,einvoice_document_id,difference_summary").eq("reconciliation_run_id", run.id);
      if (resultsError) return NextResponse.json({ error: "Unable to load ERP comparison results." }, { status: 500 });
      reconciliationResults = results ?? [];
    }
    const rowFields = "id,document_number,document_date,recipient_name,recipient_gstin,place_of_supply,total_invoice_value,taxable_value,igst,cgst,sgst_utgst,cess,source_row_number";
    const categoryRowsResult = await supabase.from("erp_invoice_rows").select(`${rowFields},gstr1_category`).eq("upload_id", upload.id).order("source_row_number");
    let rows: unknown[] = categoryRowsResult.data ?? [];
    let rowsError = categoryRowsResult.error;
    // ERP is optional and old workspaces may not have migration 011 yet. In
    // that case, show the ERP invoices with their derived categories rather
    // than failing the entire GSTR1 page.
    if (categoryColumnUnavailable(rowsError)) {
      const fallbackRowsResult = await supabase.from("erp_invoice_rows").select(rowFields).eq("upload_id", upload.id).order("source_row_number");
      rows = fallbackRowsResult.data ?? [];
      rowsError = fallbackRowsResult.error;
    }
    if (rowsError) return NextResponse.json({ error: "Unable to load ERP invoices." }, { status: 500 });
    erpRows = rows;
  }
  return NextResponse.json({ return: returnRow, documents: documents ?? [], erp_rows: erpRows, irp: irp ?? [], latest_upload: upload ?? null, reconciliation, reconciliation_results: reconciliationResults });
}

export async function PATCH(request: Request) {
  const user = await requireAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { taxPeriod, source, invoiceId, category, documentNumber, recipientName } = await request.json() as { taxPeriod?: string; source?: "EINVOICE" | "ERP"; invoiceId?: string; category?: string; documentNumber?: string; recipientName?: string | null };
  if (!taxPeriod || !/^\d{6}$/.test(taxPeriod) || !invoiceId || !["EINVOICE", "ERP"].includes(source ?? "")) return NextResponse.json({ error: "A valid invoice, source and tax period are required." }, { status: 400 });
  if (category !== undefined && typeof category !== "string") return NextResponse.json({ error: "Category must be text." }, { status: 400 });
  const supabase = getSupabaseAdmin();
  const { data: returnRow, error: returnError } = await ownedReturn(user.id, taxPeriod);
  if (returnError || !returnRow) return NextResponse.json({ error: "GSTR-1 return not found." }, { status: 404 });
  if (returnRow.status === "FILED") return NextResponse.json({ error: "A filed return cannot be changed." }, { status: 409 });
  const values = { ...(category !== undefined ? { gstr1_category: category || null } : {}), ...(documentNumber !== undefined ? { document_number: documentNumber.trim() } : {}), ...(recipientName !== undefined ? { recipient_name: recipientName?.trim() || null } : {}) };
  if (!Object.keys(values).length) return NextResponse.json({ error: "Choose a value to update." }, { status: 400 });
  if (source === "EINVOICE") {
    const { data: current, error: currentError } = await supabase.from("gstr1_documents").select("document_number,recipient_name").eq("id", invoiceId).eq("gstr1_return_id", returnRow.id).maybeSingle();
    if (currentError) return NextResponse.json({ error: "Unable to load the E-invoice." }, { status: 500 });
    if (!current) return NextResponse.json({ error: "E-invoice not found." }, { status: 404 });
    const contentChanged = (documentNumber !== undefined && documentNumber.trim() !== current.document_number) || (recipientName !== undefined && (recipientName?.trim() || null) !== current.recipient_name);
    const { data, error } = await supabase.from("gstr1_documents").update({ ...values, ...(contentChanged ? { is_irp_edited: true } : {}) }).eq("id", invoiceId).eq("gstr1_return_id", returnRow.id).select("id").maybeSingle();
    if (category !== undefined && categoryColumnUnavailable(error)) return NextResponse.json({ error: categoryMigrationMessage }, { status: 409 });
    if (error) return NextResponse.json({ error: "Unable to update the E-invoice." }, { status: 500 });
    if (!data) return NextResponse.json({ error: "E-invoice not found." }, { status: 404 });
  } else {
    const { data: row } = await supabase.from("erp_invoice_rows").select("id,erp_invoice_uploads!inner(gstr1_return_id)").eq("id", invoiceId).maybeSingle();
    const upload = row?.erp_invoice_uploads?.[0];
    if (!row || !upload || upload.gstr1_return_id !== returnRow.id) return NextResponse.json({ error: "ERP invoice not found." }, { status: 404 });
    const { error } = await supabase.from("erp_invoice_rows").update(values).eq("id", invoiceId);
    if (category !== undefined && categoryColumnUnavailable(error)) return NextResponse.json({ error: categoryMigrationMessage }, { status: 409 });
    if (error) return NextResponse.json({ error: "Unable to update the ERP invoice." }, { status: 500 });
  }
  return NextResponse.json({ updated: true });
}

export async function DELETE(request: Request) {
  const user = await requireAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { taxPeriod, source, invoiceId } = await request.json() as { taxPeriod?: string; source?: "EINVOICE" | "ERP"; invoiceId?: string };
  if (!taxPeriod || !/^\d{6}$/.test(taxPeriod) || !invoiceId || !["EINVOICE", "ERP"].includes(source ?? "")) return NextResponse.json({ error: "A valid invoice, source and tax period are required." }, { status: 400 });
  const supabase = getSupabaseAdmin();
  const { data: returnRow, error: returnError } = await ownedReturn(user.id, taxPeriod);
  if (returnError || !returnRow) return NextResponse.json({ error: "GSTR-1 return not found." }, { status: 404 });
  if (returnRow.status === "FILED") return NextResponse.json({ error: "A filed return cannot be changed." }, { status: 409 });
  if (source === "EINVOICE") {
    const { data: document, error } = await supabase.from("gstr1_documents").update({ record_status: "DELETED" }).eq("id", invoiceId).eq("gstr1_return_id", returnRow.id).select("id,irn").maybeSingle();
    if (error || !document) return NextResponse.json({ error: "E-invoice not found." }, { status: 404 });
    if (document.irn) await supabase.from("irp_einvoices").update({ imported_gstr1_document_id: null }).eq("user_id", user.id).eq("period", taxPeriod).eq("irn", document.irn);
  } else {
    const { data: row } = await supabase.from("erp_invoice_rows").select("id,upload_id,erp_invoice_uploads!inner(gstr1_return_id)").eq("id", invoiceId).maybeSingle();
    const upload = row?.erp_invoice_uploads?.[0];
    if (!row || !upload || upload.gstr1_return_id !== returnRow.id) return NextResponse.json({ error: "ERP invoice not found." }, { status: 404 });
    const { error } = await supabase.from("erp_invoice_rows").delete().eq("id", row.id);
    if (error) return NextResponse.json({ error: "Unable to remove the ERP invoice." }, { status: 500 });
    await supabase.rpc("reconcile_erp_invoice_upload", { p_upload_id: row.upload_id });
  }
  return NextResponse.json({ removed: true });
}

export async function POST(request: Request) {
  const user = await requireAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { action, taxPeriod } = await request.json() as { action?: "import_irn" | "file"; taxPeriod?: string };
  if (!taxPeriod || !/^\d{6}$/.test(taxPeriod) || !action) return NextResponse.json({ error: "A valid tax period and action are required." }, { status: 400 });
  const supabase = getSupabaseAdmin();
  const { data: returnRow, error: returnError } = await ownedReturn(user.id, taxPeriod);
  if (returnError || !returnRow) return NextResponse.json({ error: "GSTR-1 return not found." }, { status: 404 });
  if (returnRow.status === "FILED") return NextResponse.json({ error: "This GSTR-1 is already filed." }, { status: 409 });

  if (action === "import_irn") {
    const { data: irpRows, error: irpError } = await supabase.from("irp_einvoices").select("*").eq("user_id", user.id).eq("period", taxPeriod).is("imported_gstr1_document_id", null).order("irn_date");
    if (irpError) return NextResponse.json({ error: "Unable to load IRP invoices." }, { status: 500 });
    let imported = 0;
    for (const irp of irpRows ?? []) {
      const payload = irp.payload as Record<string, unknown> & { line?: Record<string, unknown> };
      const { line, ...header } = payload;
      const { data: document, error: documentError } = await supabase.from("gstr1_documents").insert({ ...header, gstr1_return_id: returnRow.id, source: "EINVOICE", irn: irp.irn, irn_date: irp.irn_date, record_status: "PROCESSED" }).select("id").single();
      if (documentError || !document) return NextResponse.json({ error: "IRP import stopped before all invoices were copied." }, { status: 500 });
      const { error: lineError } = await supabase.from("gstr1_document_lines").insert({ ...line, document_id: document.id });
      if (lineError) return NextResponse.json({ error: "IRP invoice header imported, but its line could not be saved." }, { status: 500 });
      await supabase.from("irp_einvoices").update({ imported_gstr1_document_id: document.id }).eq("id", irp.id).eq("user_id", user.id);
      imported += 1;
    }
    return NextResponse.json({ imported });
  }

  const { count } = await supabase.from("gstr1_documents").select("id", { count: "exact", head: true }).eq("gstr1_return_id", returnRow.id).neq("record_status", "DELETED");
  if (!count) return NextResponse.json({ error: "Import or upload at least one outward invoice before filing." }, { status: 400 });
  const filedAt = new Date().toISOString();
  const arn = `SIM29G1${taxPeriod}${Date.now().toString().slice(-6)}`;
  const { error } = await supabase.from("gstr1_returns").update({ status: "FILED", arn, arn_date: filedAt.slice(0, 10), filed_at: filedAt, filing_method: "EVC" }).eq("id", returnRow.id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: "Unable to file GSTR-1." }, { status: 500 });
  await supabase.from("taxpayer_filing_history").upsert({ gstin: returnRow.gstin, return_type: "GSTR-1", tax_period: taxPeriod, filing_date: filedAt.slice(0, 10), arn, status: "Filed", due_date: taxPeriod === "082026" ? "2026-09-11" : filedAt.slice(0, 10) }, { onConflict: "gstin,return_type,tax_period" });
  return NextResponse.json({ filed: true, arn });
}
