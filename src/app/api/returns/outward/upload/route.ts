import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { parseOutwardErpCsv } from "@/lib/outward-csv";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await requireAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const form = await request.formData();
  const taxPeriod = form.get("taxPeriod");
  const file = form.get("file");
  if (typeof taxPeriod !== "string" || !/^\d{6}$/.test(taxPeriod) || !(file instanceof File) || !file.name.toLowerCase().endsWith(".csv")) return NextResponse.json({ error: "Choose an outward ERP CSV and a valid tax period." }, { status: 400 });
  try {
    const content = await file.text();
    const parsed = parseOutwardErpCsv(content);
    if (!parsed.rows.length) return NextResponse.json({ error: "No valid ERP rows were found.", errors: parsed.errors }, { status: 400 });
    const supabase = getSupabaseAdmin();
    const { data: returnRow } = await supabase.from("gstr1_returns").select("id,status").eq("user_id", user.id).eq("tax_period", taxPeriod).maybeSingle();
    if (!returnRow) return NextResponse.json({ error: "GSTR-1 return not found." }, { status: 404 });
    if (returnRow.status === "FILED") return NextResponse.json({ error: "A filed return cannot receive another ERP upload." }, { status: 409 });
    const { data: upload, error: uploadError } = await supabase.from("erp_invoice_uploads").insert({ gstr1_return_id: returnRow.id, uploaded_by_user_id: user.id, source_format: "CSV", original_filename: file.name, file_sha256: createHash("sha256").update(content).digest("hex"), status: "VALIDATING", total_rows: parsed.totalRows, accepted_rows: parsed.rows.length, rejected_rows: parsed.errors.length, error_summary: parsed.errors }).select("id").single();
    if (uploadError || !upload) return NextResponse.json({ error: "Unable to create the ERP upload." }, { status: 500 });
    const { error: rowsError } = await supabase.from("erp_invoice_rows").insert(parsed.rows.map((row, index) => ({ ...row, upload_id: upload.id, source_row_number: index + 2 })));
    if (rowsError) return NextResponse.json({ error: "Unable to save ERP invoice rows." }, { status: 500 });
    const { data: runId, error: runError } = await supabase.rpc("reconcile_erp_invoice_upload", { p_upload_id: upload.id });
    if (runError) return NextResponse.json({ error: "ERP data was saved, but reconciliation could not run." }, { status: 500 });
    return NextResponse.json({ uploadId: upload.id, reconciliationRunId: runId, acceptedRows: parsed.rows.length, rejectedRows: parsed.errors.length, errors: parsed.errors }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to read the ERP CSV." }, { status: 400 });
  }
}

