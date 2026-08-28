import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

async function ownedWorkspace(userId: string, workspaceId: string) {
  return getSupabaseAdmin().from("ims_workspaces").select("id").eq("id", workspaceId).eq("user_id", userId).maybeSingle();
}

export async function POST(request: Request) {
  const user = await requireAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { workspaceId, portalInvoiceId, erpInvoiceRowId, followUpRemark } = await request.json() as { workspaceId?: string; portalInvoiceId?: string; erpInvoiceRowId?: string; followUpRemark?: string };
  if (!workspaceId) return NextResponse.json({ error: "Workspace is required." }, { status: 400 });
  if (portalInvoiceId && erpInvoiceRowId) return NextResponse.json({ error: "Check either a GST invoice or an ERP invoice, not both." }, { status: 400 });
  const supabase = getSupabaseAdmin();
  const { data: workspace } = await ownedWorkspace(user.id, workspaceId);
  if (!workspace) return NextResponse.json({ error: "IMS workspace not found." }, { status: 404 });
  let invoices: { id: string; supplier_gstin: string }[] = [];
  if (erpInvoiceRowId) {
    const { data: invoice, error: invoiceError } = await supabase.from("ims_erp_invoice_rows").select("id,supplier_gstin,upload_id").eq("id", erpInvoiceRowId).maybeSingle();
    if (invoiceError || !invoice) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
    const { data: upload, error: uploadError } = await supabase.from("ims_erp_uploads").select("id").eq("id", invoice.upload_id).eq("workspace_id", workspace.id).maybeSingle();
    if (uploadError || !upload) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
    invoices = [invoice];
  } else {
    let invoiceQuery = supabase.from("ims_portal_invoices").select("id,supplier_gstin").eq("workspace_id", workspace.id);
    if (portalInvoiceId) invoiceQuery = invoiceQuery.eq("id", portalInvoiceId);
    const { data, error: invoiceError } = await invoiceQuery;
    if (invoiceError || !data?.length) return NextResponse.json({ error: portalInvoiceId ? "Invoice not found." : "No invoices were found." }, { status: 404 });
    invoices = data;
  }
  const gstins = [...new Set(invoices.map((invoice) => invoice.supplier_gstin))];
  const { data: counterparties, error: registryError } = await supabase.from("gst_counterparties").select("*").in("gstin", gstins);
  if (registryError) return NextResponse.json({ error: "Unable to check the counterparty registry." }, { status: 500 });
  const counterpartiesByGstin = new Map((counterparties ?? []).map((counterparty) => [counterparty.gstin, counterparty]));
  const checks = invoices.map((invoice) => {
    const counterparty = counterpartiesByGstin.get(invoice.supplier_gstin);
    const registryRemark = !counterparty ? "GSTIN is not present in the synthetic counterparty registry." : counterparty.registration_status !== "ACTIVE" ? counterparty.risk_note ?? `Registration is ${counterparty.registration_status.toLowerCase()}.` : counterparty.risk_note ?? `Registration is active. Filing history is available through GSTR-1 ${counterparty.last_gstr1_period} and GSTR-3B ${counterparty.last_gstr3b_period}.`;
    const remarks = followUpRemark?.trim() ? `${registryRemark} Follow-up: ${followUpRemark.trim()}` : registryRemark;
    return { workspace_id: workspace.id, ...(erpInvoiceRowId ? { erp_invoice_row_id: invoice.id } : { portal_invoice_id: invoice.id }), checked_by_user_id: user.id, outcome: counterparty?.registration_status === "ACTIVE" && !counterparty.risk_note ? "CLEAR" : "REVIEW_REQUIRED", remarks, counterparty_gstin: invoice.supplier_gstin, registration_status: counterparty?.registration_status ?? "UNAVAILABLE", last_gstr1_period: counterparty?.last_gstr1_period ?? null, last_gstr3b_period: counterparty?.last_gstr3b_period ?? null };
  });
  const { data: savedChecks, error } = await supabase.from("ims_counterparty_checks").insert(checks).select("*");
  if (error) return NextResponse.json({ error: "Unable to save this counterparty check." }, { status: 500 });
  return NextResponse.json({ checks: savedChecks ?? [], checked: checks.length });
}

export async function DELETE(request: Request) {
  const user = await requireAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const workspaceId = new URL(request.url).searchParams.get("workspaceId");
  if (!workspaceId) return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });
  const supabase = getSupabaseAdmin();
  const { data: workspace } = await ownedWorkspace(user.id, workspaceId);
  if (!workspace) return NextResponse.json({ error: "IMS workspace not found." }, { status: 404 });
  const { error } = await supabase.from("ims_counterparty_checks").delete().eq("workspace_id", workspace.id).eq("checked_by_user_id", user.id);
  if (error) return NextResponse.json({ error: "Unable to clear recent checks." }, { status: 500 });
  return NextResponse.json({ cleared: true });
}
