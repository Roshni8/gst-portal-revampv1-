import type { SupabaseClient } from "@supabase/supabase-js";

export const TEST_ADMIN_EMAIL = "test_admin123@gstprototype.test";
export const TEST_ADMIN_GSTIN = "29AAHCA3412R1Z5";

const months = [
  { period: "042026", month: "April", filed: "2026-05-10", due1: "2026-05-11", due3b: "2026-05-20" },
  { period: "052026", month: "May", filed: "2026-06-09", due1: "2026-06-11", due3b: "2026-06-20" },
  { period: "062026", month: "June", filed: "2026-07-10", due1: "2026-07-11", due3b: "2026-07-20" },
  { period: "072026", month: "July", filed: "2026-08-10", due1: "2026-08-11", due3b: "2026-08-20" },
];

const outwardParties = [
  { gstin: "27AAGCK5678L1ZP", name: "Kavya Steel Traders Private Limited", state: "27" },
  { gstin: "06AAFCN4321M1Z9", name: "Nimbus Retail Solutions Private Limited", state: "06" },
  { gstin: "33AAECO9988R1Z2", name: "Orbit Components Limited", state: "33" },
];

const inwardInvoices = [
  { no: "KST-0826-041", date: "2026-08-03", gstin: "27AAGCK5678L1ZP", name: "Kavya Steel Traders", pos: "29", taxable: 125000, igst: 0, cgst: 11250, sgst: 11250, irn: "a101000000000000000000000000000000000000000000000000000000000001" },
  { no: "NRS-0826-118", date: "2026-08-05", gstin: "06AAFCN4321M1Z9", name: "Nimbus Retail Solutions", pos: "29", taxable: 84000, igst: 15120, cgst: 0, sgst: 0, irn: "a102000000000000000000000000000000000000000000000000000000000002" },
  { no: "ORB-0826-077", date: "2026-08-08", gstin: "33AAECO9988R1Z2", name: "Orbit Components", pos: "29", taxable: 210000, igst: 37800, cgst: 0, sgst: 0, irn: "a103000000000000000000000000000000000000000000000000000000000003" },
  { no: "SOL-0826-014", date: "2026-08-11", gstin: "24AAACS7788K1Z6", name: "Solstice Logistics", pos: "29", taxable: 48000, igst: 8640, cgst: 0, sgst: 0, irn: "a104000000000000000000000000000000000000000000000000000000000004" },
  { no: "MAP-0826-209", date: "2026-08-14", gstin: "19AAACM5544P1Z8", name: "Meridian Auto Parts", pos: "29", taxable: 156000, igst: 28080, cgst: 0, sgst: 0, irn: "a105000000000000000000000000000000000000000000000000000000000005" },
  { no: "COB-0826-033", date: "2026-08-17", gstin: "07AAACC6622D1Z4", name: "Cobalt Packaging", pos: "29", taxable: 72000, igst: 12960, cgst: 0, sgst: 0, irn: "a106000000000000000000000000000000000000000000000000000000000006" },
  { no: "VAN-0826-051", date: "2026-08-20", gstin: "23AAACV1122N1Z7", name: "Vantage Chemicals", pos: "29", taxable: 99000, igst: 17820, cgst: 0, sgst: 0, irn: "a107000000000000000000000000000000000000000000000000000000000007" },
  { no: "ARA-0826-095", date: "2026-08-24", gstin: "29AACCA1234F1Z5", name: "Aravind Textiles", pos: "29", taxable: 64000, igst: 0, cgst: 5760, sgst: 5760, irn: "a108000000000000000000000000000000000000000000000000000000000008" },
];

function outwardPayload(period: string, index: number) {
  const party = outwardParties[index % outwardParties.length];
  const month = period.slice(0, 2);
  const taxable = 180000 + index * 27500 + Number(month) * 1000;
  const interstate = party.state !== "29";
  const igst = interstate ? taxable * 0.18 : 0;
  const cgst = interstate ? 0 : taxable * 0.09;
  const sgst_utgst = cgst;
  const documentNumber = `ARH-${period.slice(2)}${month}-${String(index + 1).padStart(3, "0")}`;
  return {
    bucket: "B2B",
    document_type: "INVOICE",
    document_number: documentNumber,
    document_date: `2026-${month}-${String(4 + index * 4).padStart(2, "0")}`,
    recipient_gstin: party.gstin,
    recipient_name: party.name,
    place_of_supply: party.state,
    total_document_value: taxable + igst + cgst + sgst_utgst,
    line: { line_number: 1, hsn_sac_code: index % 2 ? "9983" : "8471", description: index % 2 ? "Technology support services" : "Computer systems", uqc: index % 2 ? "OTH" : "NOS", quantity: index % 2 ? 1 : 4, rate: 18, taxable_value: taxable, igst, cgst, sgst_utgst, cess: 0 },
  };
}

async function seedHistoricalOutward(supabase: SupabaseClient, userId: string) {
  for (const month of months) {
    const { data: returnRow, error } = await supabase.from("gstr1_returns").upsert({
      user_id: userId,
      gstin: TEST_ADMIN_GSTIN,
      tax_period: month.period,
      financial_year: "2026-27",
      status: "FILED",
      arn: `AA29${month.period}G1${month.period.slice(0, 2)}26`,
      arn_date: month.filed,
      filed_at: `${month.filed}T10:30:00+05:30`,
      filing_method: "EVC",
    }, { onConflict: "user_id,tax_period" }).select("id").single();
    if (error || !returnRow) throw new Error("Unable to seed historical GSTR-1 returns.");

    const { count } = await supabase.from("gstr1_documents").select("id", { count: "exact", head: true }).eq("gstr1_return_id", returnRow.id);
    if ((count ?? 0) > 0) continue;
    for (let index = 0; index < 3; index += 1) {
      const payload = outwardPayload(month.period, index);
      const { line, ...header } = payload;
      const irn = `${month.period}${String(index + 1).padStart(58, "0")}`;
      const { data: document, error: documentError } = await supabase.from("gstr1_documents").insert({ ...header, gstr1_return_id: returnRow.id, source: "EINVOICE", irn, irn_date: header.document_date, record_status: "PROCESSED" }).select("id").single();
      if (documentError || !document) throw new Error("Unable to seed historical outward invoices.");
      const { error: lineError } = await supabase.from("gstr1_document_lines").insert({ ...line, document_id: document.id });
      if (lineError) throw new Error("Unable to seed historical outward invoice lines.");
    }
  }
}

async function seedAugust(supabase: SupabaseClient, userId: string) {
  await supabase.from("gstr1_returns").upsert({ user_id: userId, gstin: TEST_ADMIN_GSTIN, tax_period: "082026", financial_year: "2026-27", status: "DRAFT" }, { onConflict: "user_id,tax_period" });

  const irpRows = Array.from({ length: 6 }, (_, index) => {
    const payload = outwardPayload("082026", index);
    return { user_id: userId, period: "082026", irn: `082026${String(index + 101).padStart(58, "0")}`, irn_date: payload.document_date, payload };
  });
  const { error: irpError } = await supabase.from("irp_einvoices").upsert(irpRows, { onConflict: "irn", ignoreDuplicates: true });
  if (irpError) throw new Error(`Unable to seed August IRP invoices: ${irpError.message}`);

  const { data: workspace, error: workspaceError } = await supabase.from("ims_workspaces").upsert({ user_id: userId, gstin: TEST_ADMIN_GSTIN, tax_period: "082026", portal_populated_at: "2026-08-28T09:00:00+05:30" }, { onConflict: "user_id,tax_period" }).select("id").single();
  if (workspaceError || !workspace) throw new Error("Unable to seed August IMS workspace.");
  const portalRows = inwardInvoices.map((invoice) => ({
    workspace_id: workspace.id,
    invoice_number: invoice.no,
    invoice_date: invoice.date,
    supplier_gstin: invoice.gstin,
    supplier_name: invoice.name,
    place_of_supply: invoice.pos,
    taxable_value: invoice.taxable,
    tax_value: invoice.igst + invoice.cgst + invoice.sgst,
    total_invoice_value: invoice.taxable + invoice.igst + invoice.cgst + invoice.sgst,
    hsn_sac_code: "8471",
    rate: 18,
    igst: invoice.igst,
    cgst: invoice.cgst,
    sgst_utgst: invoice.sgst,
    cess: 0,
    irn: invoice.irn,
    irn_date: invoice.date,
    raw_payload: { source: "IRP/GSTR-2B synthetic portal feed" },
  }));
  const { error: portalError } = await supabase.from("ims_portal_invoices").upsert(portalRows, { onConflict: "workspace_id,supplier_gstin,normalized_invoice_number,invoice_date" });
  if (portalError) throw new Error(`Unable to seed August portal purchases: ${portalError.message}`);
}

async function seedHistoricalIms(supabase: SupabaseClient, userId: string) {
  const rows = months.map((month) => ({ user_id: userId, gstin: TEST_ADMIN_GSTIN, tax_period: month.period, portal_populated_at: `${month.filed}T08:30:00+05:30`, submitted_at: `${month.filed}T09:30:00+05:30` }));
  const { error } = await supabase.from("ims_workspaces").upsert(rows, { onConflict: "user_id,tax_period" });
  if (error) throw new Error("Unable to seed historical IMS submissions.");
}

async function seedFilingHistory(supabase: SupabaseClient) {
  type HistorySeed = { gstin: string; return_type: string; tax_period: string; filing_date: string | null; arn: string | null; status: string; due_date: string };
  const history: HistorySeed[] = months.flatMap((month, index): HistorySeed[] => [
    { gstin: TEST_ADMIN_GSTIN, return_type: "GSTR-1", tax_period: month.period, filing_date: month.filed, arn: `AA29${month.period}G1${index + 1}`, status: "Filed", due_date: month.due1 },
    { gstin: TEST_ADMIN_GSTIN, return_type: "GSTR-3B", tax_period: month.period, filing_date: month.due3b, arn: `AA29${month.period}3B${index + 1}`, status: "Filed", due_date: month.due3b },
  ]).concat([
    { gstin: TEST_ADMIN_GSTIN, return_type: "GSTR-1", tax_period: "082026", filing_date: null, arn: null, status: "Not Filed", due_date: "2026-09-11" },
    { gstin: TEST_ADMIN_GSTIN, return_type: "GSTR-3B", tax_period: "082026", filing_date: null, arn: null, status: "Not Filed", due_date: "2026-09-20" },
  ]);
  const { error } = await supabase.from("taxpayer_filing_history").upsert(history, { onConflict: "gstin,return_type,tax_period" });
  if (error) throw new Error("Unable to seed April–August filing history.");
}

export async function provisionTestAdminReturns(supabase: SupabaseClient, userId: string, email?: string) {
  if (email !== TEST_ADMIN_EMAIL) return { provisioned: false, reason: "not-test-admin" };
  const { data: profile } = await supabase.from("taxpayer_profiles").select("gstin").eq("user_id", userId).maybeSingle();
  if (!profile || profile.gstin !== TEST_ADMIN_GSTIN) throw new Error("Provision the Aarohan taxpayer profile before return data.");
  await seedFilingHistory(supabase);
  await seedHistoricalOutward(supabase, userId);
  await seedHistoricalIms(supabase, userId);
  await seedAugust(supabase, userId);
  return { provisioned: true };
}
