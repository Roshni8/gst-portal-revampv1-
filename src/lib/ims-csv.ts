export type ImsErpCsvRow = {
  invoice_number: string;
  invoice_date: string;
  supplier_gstin: string;
  supplier_name: string;
  place_of_supply: string;
  total_invoice_value: number;
  hsn_sac_code: string;
  rate: number;
  taxable_value: number;
  tax_value: number;
  igst: number;
  cgst: number;
  sgst_utgst: number;
  cess: number;
  raw_row: Record<string, string>;
};

const requiredHeaders = ["invoice_number", "invoice_date", "supplier_gstin", "supplier_name", "place_of_supply", "total_invoice_value", "hsn_sac_code", "rate", "taxable_value", "igst", "cgst", "sgst_utgst", "cess"];

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

export function parseImsErpCsv(content: string) {
  const lines = content.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) throw new Error("The CSV must include a header row and at least one invoice.");
  const headers = parseLine(lines[0]).map((header) => header.toLowerCase());
  if (requiredHeaders.some((header) => !headers.includes(header))) throw new Error(`Use the sample header: ${requiredHeaders.join(", ")}.`);

  const rows: ImsErpCsvRow[] = [];
  const errors: { row: number; message: string }[] = [];
  lines.slice(1).forEach((line, index) => {
    const sourceRow = index + 2;
    const cells = parseLine(line);
    const raw = Object.fromEntries(headers.map((header, cellIndex) => [header, cells[cellIndex] ?? ""]));
    const taxable = Number(raw.taxable_value);
    const invoiceValue = Number(raw.total_invoice_value);
    const rate = Number(raw.rate);
    const igst = Number(raw.igst);
    const cgst = Number(raw.cgst);
    const sgst = Number(raw.sgst_utgst);
    const cess = Number(raw.cess);
    const amounts = [taxable, invoiceValue, rate, igst, cgst, sgst, cess];
    if (!raw.invoice_number || !raw.invoice_date || !raw.supplier_gstin || !raw.place_of_supply || !raw.hsn_sac_code || amounts.some((value) => !Number.isFinite(value) || value < 0)) {
      errors.push({ row: sourceRow, message: "Invoice identity, place of supply, HSN, rate, invoice value and every tax head are required." });
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw.invoice_date)) { errors.push({ row: sourceRow, message: "Invoice date must use YYYY-MM-DD." }); return; }
    if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z][A-Z][0-9A-Z]$/.test(raw.supplier_gstin.toUpperCase())) { errors.push({ row: sourceRow, message: "Supplier GSTIN must be a valid 15-character GSTIN." }); return; }
    if (!/^\d{2}$/.test(raw.place_of_supply)) { errors.push({ row: sourceRow, message: "Place of supply must be a two-digit state code." }); return; }
    if (!/^\d{4,8}$/.test(raw.hsn_sac_code)) { errors.push({ row: sourceRow, message: "HSN/SAC must contain 4 to 8 digits." }); return; }
    if (igst > 0 && (cgst > 0 || sgst > 0)) { errors.push({ row: sourceRow, message: "Use IGST or CGST plus SGST/UTGST, never both." }); return; }
    if (cgst !== sgst) { errors.push({ row: sourceRow, message: "CGST and SGST/UTGST must be equal." }); return; }
    const tax = igst + cgst + sgst + cess;
    if (Math.abs(invoiceValue - (taxable + tax)) > 0.01) { errors.push({ row: sourceRow, message: "Total invoice value must equal taxable value plus IGST, CGST, SGST/UTGST and cess." }); return; }
    rows.push({ invoice_number: raw.invoice_number, invoice_date: raw.invoice_date, supplier_gstin: raw.supplier_gstin.toUpperCase(), supplier_name: raw.supplier_name, place_of_supply: raw.place_of_supply, total_invoice_value: invoiceValue, hsn_sac_code: raw.hsn_sac_code, rate, taxable_value: taxable, tax_value: tax, igst, cgst, sgst_utgst: sgst, cess, raw_row: raw });
  });
  return { rows, errors, totalRows: lines.length - 1 };
}

export function csvCell(value: string | number | null | undefined) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
