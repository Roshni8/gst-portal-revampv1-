import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type TaxHeads = { taxable_value: number; igst: number; cgst: number; sgst_utgst: number; cess: number };
const zero = (): TaxHeads => ({ taxable_value: 0, igst: 0, cgst: 0, sgst_utgst: 0, cess: 0 });
const number = (value: unknown) => Number(value ?? 0);
const add = (target: TaxHeads, source: Record<string, unknown>, multiplier = 1) => {
  target.taxable_value += number(source.taxable_value ?? source.amount) * multiplier;
  target.igst += number(source.igst) * multiplier;
  target.cgst += number(source.cgst) * multiplier;
  target.sgst_utgst += number(source.sgst_utgst) * multiplier;
  target.cess += number(source.cess) * multiplier;
  return target;
};
const subtract = (left: TaxHeads, right: TaxHeads): TaxHeads => ({
  taxable_value: left.taxable_value - right.taxable_value,
  igst: left.igst - right.igst,
  cgst: left.cgst - right.cgst,
  sgst_utgst: left.sgst_utgst - right.sgst_utgst,
  cess: left.cess - right.cess,
});
const cappedAtZero = (value: TaxHeads): TaxHeads => ({ ...value, igst: Math.max(0, value.igst), cgst: Math.max(0, value.cgst), sgst_utgst: Math.max(0, value.sgst_utgst), cess: Math.max(0, value.cess) });

export async function GET(request: Request) {
  const user = await requireAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const taxPeriod = new URL(request.url).searchParams.get("taxPeriod");
  if (!taxPeriod || !/^\d{6}$/.test(taxPeriod)) return NextResponse.json({ error: "taxPeriod must use MMYYYY." }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data: profile, error: profileError } = await supabase.from("taxpayer_profiles").select("gstin,legal_name,trade_name").eq("user_id", user.id).maybeSingle();
  if (profileError || !profile) return NextResponse.json({ error: "Taxpayer profile not found." }, { status: 404 });
  const { data: returnRow, error: returnError } = await supabase.from("gstr1_returns").select("id").eq("user_id", user.id).eq("tax_period", taxPeriod).maybeSingle();
  if (returnError) return NextResponse.json({ error: "Unable to load GSTR-3B source data." }, { status: 500 });

  const returnId = returnRow?.id;
  const [{ data: documents, error: documentsError }, { data: b2cs, error: b2csError }, { data: nilSupplies, error: nilError }, { data: workspace, error: workspaceError }, { data: adjustments, error: adjustmentError }] = await Promise.all([
    returnId ? supabase.from("gstr1_documents").select("bucket,document_type,reverse_charge,gstr1_document_lines(taxable_value,igst,cgst,sgst_utgst,cess)").eq("gstr1_return_id", returnId).neq("record_status", "DELETED") : Promise.resolve({ data: [], error: null }),
    returnId ? supabase.from("gstr1_b2cs_summaries").select("place_of_supply,taxable_value,igst,cgst,sgst_utgst,cess").eq("gstr1_return_id", returnId).eq("is_amendment", false) : Promise.resolve({ data: [], error: null }),
    returnId ? supabase.from("gstr1_nil_exempt_supplies").select("supply_nature,amount").eq("gstr1_return_id", returnId) : Promise.resolve({ data: [], error: null }),
    supabase.from("ims_workspaces").select("id").eq("user_id", user.id).eq("tax_period", taxPeriod).maybeSingle(),
    supabase.from("gstr3b_adjustments").select("table_ref,taxable_value,igst,cgst,sgst_utgst,cess,source_note").eq("user_id", user.id).eq("tax_period", taxPeriod),
  ]);
  // The preparation ledger was introduced after the invoice tables. Keep the
  // computation usable for an account whose database migration is pending:
  // invoice-derived rows remain accurate and preparation-only rows display as
  // zero until migration 009 is applied.
  if (documentsError || b2csError || nilError || workspaceError) return NextResponse.json({ error: "Unable to load GSTR-3B source data." }, { status: 500 });
  const [{ data: inwardInvoices, error: inwardError }, { data: decisions, error: decisionsError }] = workspace ? await Promise.all([
    supabase.from("ims_portal_invoices").select("id,taxable_value,igst,cgst,sgst_utgst,cess").eq("workspace_id", workspace.id),
    supabase.from("ims_invoice_decisions").select("portal_invoice_id,status").eq("workspace_id", workspace.id),
  ]) : [{ data: [], error: null }, { data: [], error: null }];
  if (inwardError || decisionsError) return NextResponse.json({ error: "Unable to load GSTR-3B inward data." }, { status: 500 });

  const adjustmentMap = new Map((adjustments ?? []).map((row) => [row.table_ref, row]));
  const adjustment = (ref: string) => add(zero(), adjustmentMap.get(ref) ?? {});
  const outward = { standard: zero(), zeroRated: zero(), reverseCharge: adjustment("3.1D"), nil: zero(), nonGst: zero() };
  for (const document of documents ?? []) {
    const destination = ["EXPORT_WITH_PAYMENT", "EXPORT_WITHOUT_PAYMENT", "EXPORT_AMENDMENT"].includes(document.bucket) ? outward.zeroRated : outward.standard;
    const multiplier = document.document_type === "CREDIT_NOTE" ? -1 : 1;
    for (const line of document.gstr1_document_lines ?? []) add(destination, line, multiplier);
  }
  for (const row of nilSupplies ?? []) {
    if (row.supply_nature === "NON_GST") outward.nonGst.taxable_value += number(row.amount);
    else outward.nil.taxable_value += number(row.amount);
  }
  const interState = new Map<string, TaxHeads>();
  for (const row of b2cs ?? []) {
    const current = interState.get(row.place_of_supply) ?? zero();
    add(current, row); interState.set(row.place_of_supply, current);
  }
  const decisionMap = new Map((decisions ?? []).map((row) => [row.portal_invoice_id, row.status]));
  const ordinaryItc = zero();
  for (const invoice of inwardInvoices ?? []) if (decisionMap.get(invoice.id) !== "REJECTED") add(ordinaryItc, invoice);
  const itcAvailable = ["4A1", "4A2", "4A3", "4A4"].reduce((total, ref) => add(total, adjustment(ref)), ordinaryItc);
  const itcReversed = ["4B1", "4B2"].reduce((total, ref) => add(total, adjustment(ref)), zero());
  const netItc = cappedAtZero(subtract(itcAvailable, itcReversed));
  const outputTax = [outward.standard, outward.zeroRated].reduce((total, value) => add(total, value), zero());
  const interest = adjustment("5.1");
  const cash = add(add(cappedAtZero(subtract(outputTax, netItc)), outward.reverseCharge), interest);
  const rows = [
    { section: "3.1", ref: "3.1(a)", nature: "Outward taxable supplies (other than zero rated, nil rated and exempted)", type: "Sale", ...outward.standard },
    { section: "3.1", ref: "3.1(b)", nature: "Outward taxable supplies (zero rated)", type: "Sale", ...outward.zeroRated },
    { section: "3.1", ref: "3.1(c)", nature: "Other outward supplies (nil rated, exempted)", type: "Sale", ...outward.nil },
    { section: "3.1", ref: "3.1(d)", nature: "Inward supplies liable to reverse charge", type: "Purchase", ...outward.reverseCharge },
    { section: "3.1", ref: "3.1(e)", nature: "Non-GST outward supplies", type: "Sale", ...outward.nonGst },
    ...Array.from(interState.entries()).map(([place_of_supply, value]) => ({ section: "3.2", ref: place_of_supply, nature: `Inter-state supplies to unregistered persons — place of supply ${place_of_supply}`, type: "Sale", ...value })),
    { section: "4", ref: "4A(1)", nature: "Import of goods", type: "Purchase", ...adjustment("4A1") },
    { section: "4", ref: "4A(2)", nature: "Import of services", type: "Purchase", ...adjustment("4A2") },
    { section: "4", ref: "4A(3)", nature: "Inward supplies liable to reverse charge", type: "Purchase", ...adjustment("4A3") },
    { section: "4", ref: "4A(4)", nature: "Inward supplies from ISD", type: "Purchase", ...adjustment("4A4") },
    { section: "4", ref: "4A(5)", nature: "All other ITC from GSTR-2A / IMS", type: "Purchase", ...ordinaryItc },
    { section: "4", ref: "4B(1)", nature: "ITC reversed — Rules 42 & 43", type: "Purchase", ...adjustment("4B1") },
    { section: "4", ref: "4B(2)", nature: "ITC reversed — other", type: "Purchase", ...adjustment("4B2") },
    { section: "5", ref: "5", nature: "Inter-state exempt, nil rated and non-GST inward supplies", type: "Purchase", ...adjustment("5_INTER") },
    { section: "5", ref: "5", nature: "Intra-state exempt, nil rated and non-GST inward supplies", type: "Purchase", ...adjustment("5_INTRA") },
    { section: "5.1", ref: "5.1", nature: "Interest and late fee payable", type: "Purchase", ...interest },
  ];
  return NextResponse.json({ profile, tax_period: taxPeriod, rows, summary: { output_tax: outputTax, net_itc: netItc, reverse_charge: outward.reverseCharge, interest, total_payable_in_cash: cash }, generated_from: { outward_documents: documents?.length ?? 0, inward_invoices: inwardInvoices?.length ?? 0, preparation_rows: adjustments?.length ?? 0, preparation_ledger_available: !adjustmentError } });
}

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
