import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/api-auth";
import { csvCell } from "@/lib/ims-csv";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await requireAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const taxPeriod = new URL(request.url).searchParams.get("taxPeriod");
  if (!taxPeriod || !/^\d{6}$/.test(taxPeriod)) return NextResponse.json({ error: "taxPeriod must use MMYYYY." }, { status: 400 });
  const supabase = getSupabaseAdmin();
  const { data: returnRow } = await supabase.from("gstr1_returns").select("id").eq("user_id", user.id).eq("tax_period", taxPeriod).maybeSingle();
  if (!returnRow) return NextResponse.json({ error: "GSTR-1 return not found." }, { status: 404 });
  const { data: documents, error } = await supabase.from("gstr1_documents").select("document_type,document_number,document_date,recipient_gstin,recipient_name,place_of_supply,total_document_value,irn,irn_date,gstr1_document_lines(taxable_value,igst,cgst,sgst_utgst,cess)").eq("gstr1_return_id", returnRow.id).eq("source", "EINVOICE").order("document_date");
  if (error) return NextResponse.json({ error: "Unable to prepare the IRN download." }, { status: 500 });
  const header = ["document_type", "document_number", "document_date", "recipient_gstin", "recipient_name", "place_of_supply", "total_invoice_value", "taxable_value", "igst", "cgst", "sgst_utgst", "cess", "irn", "irn_date"];
  const rows = (documents ?? []).map((document) => {
    const lines = document.gstr1_document_lines ?? [];
    const sum = (key: "taxable_value" | "igst" | "cgst" | "sgst_utgst" | "cess") => lines.reduce((total, line) => total + Number(line[key]), 0);
    return [document.document_type, document.document_number, document.document_date, document.recipient_gstin, document.recipient_name, document.place_of_supply, document.total_document_value, sum("taxable_value"), sum("igst"), sum("cgst"), sum("sgst_utgst"), sum("cess"), document.irn, document.irn_date].map(csvCell).join(",");
  });
  return new NextResponse([header.join(","), ...rows].join("\n"), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="irn-einvoices-${taxPeriod}.csv"` } });
}

