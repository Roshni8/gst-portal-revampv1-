import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type PortalInvoice = { invoice_number: string; invoice_date: string; supplier_gstin: string; supplier_name?: string; place_of_supply?: string; total_invoice_value: number; hsn_sac_code?: string; rate?: number; taxable_value: number; igst: number; cgst: number; sgst_utgst: number; cess: number; irn?: string; irn_date?: string; raw_payload?: Record<string, unknown> };

export async function POST(request: Request) {
  const user = await requireAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { taxPeriod, invoices } = await request.json() as { taxPeriod?: string; invoices?: PortalInvoice[] };
  if (!taxPeriod || !/^\d{6}$/.test(taxPeriod) || !Array.isArray(invoices)) return NextResponse.json({ error: "taxPeriod and an invoice list are required." }, { status: 400 });
  if (invoices.some((invoice) => !invoice.invoice_number || !invoice.invoice_date || !invoice.supplier_gstin || !Number.isFinite(invoice.taxable_value) || !Number.isFinite(invoice.total_invoice_value) || invoice.igst > 0 && (invoice.cgst > 0 || invoice.sgst_utgst > 0) || invoice.cgst !== invoice.sgst_utgst)) return NextResponse.json({ error: "Every portal invoice requires valid identity, value and mutually exclusive GST tax heads." }, { status: 400 });
  const supabase = getSupabaseAdmin();
  const { data: profile, error: profileError } = await supabase.from("taxpayer_profiles").select("gstin").eq("user_id", user.id).maybeSingle();
  if (profileError || !profile) return NextResponse.json({ error: "A taxpayer profile is required before syncing portal invoices." }, { status: 404 });
  const { data: workspace, error: workspaceError } = await supabase.from("ims_workspaces").upsert({ user_id: user.id, gstin: profile.gstin, tax_period: taxPeriod, portal_populated_at: new Date().toISOString() }, { onConflict: "user_id,tax_period" }).select().single();
  if (workspaceError || !workspace) return NextResponse.json({ error: "Unable to initialise IMS workspace." }, { status: 500 });
  const { error: upsertError } = await supabase.from("ims_portal_invoices").upsert(invoices.map((invoice) => ({ workspace_id: workspace.id, invoice_number: invoice.invoice_number, invoice_date: invoice.invoice_date, supplier_gstin: invoice.supplier_gstin.toUpperCase(), supplier_name: invoice.supplier_name ?? null, place_of_supply: invoice.place_of_supply ?? null, total_invoice_value: invoice.total_invoice_value, hsn_sac_code: invoice.hsn_sac_code ?? null, rate: invoice.rate ?? null, taxable_value: invoice.taxable_value, tax_value: invoice.igst + invoice.cgst + invoice.sgst_utgst + invoice.cess, igst: invoice.igst, cgst: invoice.cgst, sgst_utgst: invoice.sgst_utgst, cess: invoice.cess, irn: invoice.irn ?? null, irn_date: invoice.irn_date ?? null, raw_payload: invoice.raw_payload ?? {} })), { onConflict: "workspace_id,supplier_gstin,normalized_invoice_number,invoice_date" });
  if (upsertError) return NextResponse.json({ error: "Unable to store portal invoices." }, { status: 500 });
  return NextResponse.json({ workspaceId: workspace.id, imported: invoices.length });
}
