export type OutwardErpRow = {
  document_type: "INVOICE" | "CREDIT_NOTE" | "DEBIT_NOTE";
  document_number: string;
  document_date: string;
  recipient_gstin: string;
  recipient_name: string;
  place_of_supply: string;
  total_invoice_value: number;
  taxable_value: number;
  igst: number;
  cgst: number;
  sgst_utgst: number;
  cess: number;
  raw_row: Record<string, string>;
};

const requiredHeaders = ["document_type", "document_number", "document_date", "recipient_gstin", "recipient_name", "place_of_supply", "total_invoice_value", "taxable_value", "igst", "cgst", "sgst_utgst", "cess"];

function parseLine(line: string) {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && line[index + 1] === '"') { cell += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { cells.push(cell.trim()); cell = ""; }
    else cell += char;
  }
  cells.push(cell.trim());
  return cells;
}

export function parseOutwardErpCsv(content: string) {
  const lines = content.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) throw new Error("The CSV must include a header row and at least one invoice.");
  const headers = parseLine(lines[0]).map((header) => header.toLowerCase());
  if (requiredHeaders.some((header) => !headers.includes(header))) throw new Error(`Use the outward ERP template header: ${requiredHeaders.join(", ")}.`);
  const rows: OutwardErpRow[] = [];
  const errors: { row: number; message: string }[] = [];
  lines.slice(1).forEach((line, index) => {
    const sourceRow = index + 2;
    const cells = parseLine(line);
    const raw = Object.fromEntries(headers.map((header, cellIndex) => [header, cells[cellIndex] ?? ""]));
    const type = raw.document_type.toUpperCase();
    const numbers = ["total_invoice_value", "taxable_value", "igst", "cgst", "sgst_utgst", "cess"].map((key) => Number(raw[key]));
    const [total, taxable, igst, cgst, sgst, cess] = numbers;
    if (!(["INVOICE", "CREDIT_NOTE", "DEBIT_NOTE"].includes(type)) || !raw.document_number || !/^\d{4}-\d{2}-\d{2}$/.test(raw.document_date)) { errors.push({ row: sourceRow, message: "Use a valid document type, number and YYYY-MM-DD date." }); return; }
    if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z][A-Z][0-9A-Z]$/.test(raw.recipient_gstin.toUpperCase())) { errors.push({ row: sourceRow, message: "Recipient GSTIN must be a valid 15-character GSTIN." }); return; }
    if (!/^\d{2}$/.test(raw.place_of_supply)) { errors.push({ row: sourceRow, message: "Place of supply must be a two-digit state code." }); return; }
    if (numbers.some((value) => !Number.isFinite(value) || value < 0)) { errors.push({ row: sourceRow, message: "Invoice, taxable and tax-head amounts must be non-negative numbers." }); return; }
    if (igst > 0 && (cgst > 0 || sgst > 0)) { errors.push({ row: sourceRow, message: "Use IGST or CGST plus SGST/UTGST, never both." }); return; }
    if (cgst !== sgst) { errors.push({ row: sourceRow, message: "CGST and SGST/UTGST must be equal." }); return; }
    if (Math.abs(total - (taxable + igst + cgst + sgst + cess)) > 0.01) { errors.push({ row: sourceRow, message: "Total invoice value must equal taxable value plus all tax heads." }); return; }
    rows.push({ document_type: type as OutwardErpRow["document_type"], document_number: raw.document_number, document_date: raw.document_date, recipient_gstin: raw.recipient_gstin.toUpperCase(), recipient_name: raw.recipient_name, place_of_supply: raw.place_of_supply, total_invoice_value: total, taxable_value: taxable, igst, cgst, sgst_utgst: sgst, cess, raw_row: raw });
  });
  return { rows, errors, totalRows: lines.length - 1 };
}

