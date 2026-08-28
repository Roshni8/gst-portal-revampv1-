import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

async function ownedReturn(userId: string, taxPeriod: string) {
  return getSupabaseAdmin().from("gstr1_returns").select("*").eq("user_id", userId).eq("tax_period", taxPeriod).maybeSingle();
}

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
    const { data: rows, error: rowsError } = await supabase.from("erp_invoice_rows").select("id,document_number,document_date,recipient_name,recipient_gstin,place_of_supply,total_invoice_value,taxable_value,igst,cgst,sgst_utgst,cess,source_row_number").eq("upload_id", upload.id).order("source_row_number");
    if (rowsError) return NextResponse.json({ error: "Unable to load ERP invoices." }, { status: 500 });
    erpRows = rows ?? [];
  }
  return NextResponse.json({ return: returnRow, documents: documents ?? [], erp_rows: erpRows, irp: irp ?? [], latest_upload: upload ?? null, reconciliation, reconciliation_results: reconciliationResults });
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
