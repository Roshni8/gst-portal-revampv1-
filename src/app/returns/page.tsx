"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { GstServiceNavigation } from "@/components/gst-service-navigation";
import { PageLoadingSkeleton } from "@/components/page-loading-skeleton";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type Filing = { return_type: string; tax_period: string; filing_date: string | null; arn: string | null; status: "Filed" | "Not Filed"; due_date: string };
type Gstr1Return = { id: string; tax_period: string; status: string; arn: string | null; filed_at: string | null };
type Workspace = { id: string; tax_period: string; submitted_at: string | null };
type ReturnsData = { profile: { gstin: string; legal_name: string; trade_name: string | null }; filing_history: Filing[]; gstr1_returns: Gstr1Return[]; ims_workspaces: Workspace[] };
type TaxLine = { taxable_value: number; igst: number; cgst: number; sgst_utgst: number; cess: number; hsn_sac_code?: string };
type OutwardDocument = { id: string; bucket: string; document_number: string; document_date: string; recipient_name: string; recipient_gstin: string; place_of_supply: string; total_document_value: number; source: string; irn: string | null; gstr1_document_lines: TaxLine[] };
type OutwardErpInvoice = { id: string; document_number: string; document_date: string; recipient_name: string | null; recipient_gstin: string | null; place_of_supply: string; total_invoice_value: number; taxable_value: number; igst: number; cgst: number; sgst_utgst: number; cess: number; source_row_number: number };
type OutwardReconciliation = { status: "MATCHED" | "ERP_ONLY" | "EINVOICE_ONLY" | "AMOUNT_MISMATCH" | "FIELD_MISMATCH"; erp_invoice_row_id: string | null; einvoice_document_id: string | null; difference_summary: Record<string, number | boolean> };
type OutwardData = { return: Gstr1Return; documents: OutwardDocument[]; erp_rows: OutwardErpInvoice[]; irp: { id: string; imported_gstr1_document_id: string | null }[]; latest_upload: { accepted_rows: number; rejected_rows: number } | null; reconciliation: { matched_count: number; exception_count: number } | null; reconciliation_results: OutwardReconciliation[] };
type PortalInvoice = { id: string; invoice_number: string; invoice_date: string; supplier_name: string; supplier_gstin: string; place_of_supply: string; total_invoice_value: number; taxable_value: number; tax_value: number; igst: number; cgst: number; sgst_utgst: number; cess: number; irn: string | null };
type ErpInvoice = PortalInvoice & { source_row_number: number };
type ImsDecision = { portal_invoice_id: string; status: "PENDING" | "ACCEPTED" | "REJECTED" };
type MatchResult = { portal_invoice_id: string | null; erp_invoice_row_id: string | null; status: string; difference_summary: Record<string, number | boolean> };
type RecentCheck = { id: string; portal_invoice_id: string | null; erp_invoice_row_id: string | null; counterparty_gstin: string; registration_status: string; remarks: string; checked_at: string };
type ImsData = { workspace: Workspace; portal_invoices: PortalInvoice[]; decisions: ImsDecision[]; reconciliation_results: MatchResult[]; erp_rows: ErpInvoice[]; recent_counterparty_checks: RecentCheck[]; latest_run: { auto_matched_count: number; exception_count: number } | null };
type Gstr3bTax = { taxable_value: number; igst: number; cgst: number; sgst_utgst: number; cess: number };
type Gstr3bRow = Gstr3bTax & { section: string; ref: string; nature: string; type: "Sale" | "Purchase" };
type Gstr3bData = { profile: { gstin: string; legal_name: string; trade_name: string | null }; tax_period: string; rows: Gstr3bRow[]; summary: { output_tax: Gstr3bTax; net_itc: Gstr3bTax; reverse_charge: Gstr3bTax; interest: Gstr3bTax; total_payable_in_cash: Gstr3bTax }; generated_from: { outward_documents: number; inward_invoices: number; preparation_rows: number; preparation_ledger_available: boolean } };
type View = "periods" | "tasks" | "outward" | "ims" | "gstr3b";

const periods = [
  { value: "042026", label: "April", short: "Apr 2026" },
  { value: "052026", label: "May", short: "May 2026" },
  { value: "062026", label: "June", short: "Jun 2026" },
  { value: "072026", label: "July", short: "Jul 2026" },
  { value: "082026", label: "August", short: "Aug 2026" },
];

const money = (value: number | string | null | undefined) => `₹${Number(value ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const prettyDate = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

export default function ReturnsPage() {
  const router = useRouter();
  const [token, setToken] = useState<string>();
  const [data, setData] = useState<ReturnsData>();
  const [outward, setOutward] = useState<OutwardData>();
  const [ims, setIms] = useState<ImsData>();
  const [gstr3b, setGstr3b] = useState<Gstr3bData>();
  const [view, setView] = useState<View>("periods");
  const [selectedPeriod, setSelectedPeriod] = useState("082026");
  const [filterPeriod, setFilterPeriod] = useState("082026");
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const api = useCallback(async (url: string, init: RequestInit = {}) => {
    const client = getSupabaseBrowserClient();
    const { data: sessionData } = await client.auth.getSession();
    let accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      const refreshed = await client.auth.refreshSession();
      accessToken = refreshed.data.session?.access_token;
    }
    if (!accessToken) throw new Error("Your session has expired. Please sign in again.");
    let response = await fetch(url, { ...init, headers: { Authorization: `Bearer ${accessToken}`, ...(init.headers ?? {}) } });
    if (response.status === 401) {
      const refreshed = await client.auth.refreshSession();
      const retryToken = refreshed.data.session?.access_token;
      if (retryToken) response = await fetch(url, { ...init, headers: { Authorization: `Bearer ${retryToken}`, ...(init.headers ?? {}) } });
    }
    if (!response.ok) {
      const result = await response.json().catch(() => ({})) as { error?: string };
      throw new Error(result.error ?? "The request could not be completed.");
    }
    return response;
  }, []);

  const loadReturns = useCallback(async (accessToken: string) => {
    const headers = { Authorization: `Bearer ${accessToken}` };
    let response = await fetch("/api/returns", { headers });
    if (response.status === 404) {
      const profile = await fetch("/api/profile/demo", { method: "POST", headers });
      if (!profile.ok) throw new Error("Unable to provision the taxpayer profile.");
      response = await fetch("/api/returns", { headers });
    }
    if (!response.ok) throw new Error((await response.json() as { error?: string }).error ?? "Unable to load returns.");
    setData(await response.json() as ReturnsData);
  }, []);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const client = getSupabaseBrowserClient();
      const { data: sessionData } = await client.auth.getSession();
      const session = sessionData.session;
      const accessToken = session?.access_token;
      if (!session || !accessToken) { router.replace("/login"); return; }
      if (!mounted) return;
      setToken(accessToken);
      const headers = { Authorization: `Bearer ${accessToken}` };
      const returnsResponse = await fetch("/api/returns", { headers });
      if (returnsResponse.status === 404) {
        const profile = await fetch("/api/profile/demo", { method: "POST", headers });
        if (!profile.ok) throw new Error("Unable to provision the taxpayer profile.");
      }
      // Seeding is an expensive, idempotent setup operation. It used to run on
      // every visit to Returns, delaying the real data request substantially.
      const seededKey = "gst-returns-demo-seeded";
      if (session.user.email === "test_admin123@gstprototype.test" && !sessionStorage.getItem(seededKey)) {
        const seed = await fetch("/api/returns/demo", { method: "POST", headers });
        if (!seed.ok) throw new Error((await seed.json() as { error?: string }).error ?? "Unable to provision return test data.");
        sessionStorage.setItem(seededKey, "1");
      }
      await loadReturns(accessToken);
      const params = new URLSearchParams(window.location.search);
      if (params.get("view") === "ims") {
        const imsResponse = await fetch(`/api/returns/ims?taxPeriod=${params.get("taxPeriod") ?? "082026"}`, { headers });
        if (!imsResponse.ok) throw new Error((await imsResponse.json() as { error?: string }).error ?? "Unable to load IMS.");
        if (!mounted) return;
        setIms(await imsResponse.json() as ImsData);
        setView("ims");
      }
    })().catch((cause) => { if (mounted) setError(cause instanceof Error ? cause.message : "Unable to load returns."); });
    return () => { mounted = false; };
  }, [loadReturns, router]);

  const selectedLabel = periods.find((item) => item.value === selectedPeriod)?.short ?? selectedPeriod;
  const selectedGstr1 = data?.gstr1_returns.find((item) => item.tax_period === selectedPeriod);
  const selectedIms = data?.ims_workspaces.find((item) => item.tax_period === selectedPeriod);
  const selected3b = data?.filing_history.find((item) => item.tax_period === selectedPeriod && item.return_type === "GSTR-3B");

  const rows = useMemo(() => periods.map((period) => ({
    ...period,
    gstr1: data?.filing_history.find((item) => item.tax_period === period.value && item.return_type === "GSTR-1"),
    gstr3b: data?.filing_history.find((item) => item.tax_period === period.value && item.return_type === "GSTR-3B"),
  })), [data]);

  async function loadOutward() {
    setBusy(true); setError(undefined); setMessage(undefined);
    try { setOutward(await (await api(`/api/returns/outward?taxPeriod=${selectedPeriod}`)).json() as OutwardData); setView("outward"); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load outward invoices."); }
    finally { setBusy(false); }
  }

  async function loadIms() {
    setBusy(true); setError(undefined); setMessage(undefined);
    try { setIms(await (await api(`/api/returns/ims?taxPeriod=${selectedPeriod}`)).json() as ImsData); setView("ims"); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load IMS."); }
    finally { setBusy(false); }
  }

  async function loadGstr3b() {
    setBusy(true); setError(undefined); setMessage(undefined);
    try { setGstr3b(await (await api(`/api/returns/gstr3b?taxPeriod=${selectedPeriod}`)).json() as Gstr3bData); setView("gstr3b"); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load the GSTR-3B computation."); }
    finally { setBusy(false); }
  }

  async function refreshOutward() { setOutward(await (await api(`/api/returns/outward?taxPeriod=${selectedPeriod}`)).json() as OutwardData); }
  async function refreshIms() { setIms(await (await api(`/api/returns/ims?taxPeriod=${selectedPeriod}`)).json() as ImsData); }

  async function importAndDownloadIrn() {
    setBusy(true); setError(undefined);
    try {
      const result = await (await api("/api/returns/outward", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "import_irn", taxPeriod: selectedPeriod }) })).json() as { imported: number };
      const download = await api(`/api/returns/outward/download?taxPeriod=${selectedPeriod}`);
      const url = URL.createObjectURL(await download.blob());
      const link = document.createElement("a"); link.href = url; link.download = `irn-einvoices-${selectedPeriod}.csv`; link.click(); URL.revokeObjectURL(url);
      await refreshOutward(); setMessage(`${result.imported} new IRN e-invoices imported. The complete IRN CSV was downloaded.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to import IRN invoices."); }
    finally { setBusy(false); }
  }

  async function uploadOutward(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(undefined);
    try {
      const form = new FormData(event.currentTarget); form.set("taxPeriod", selectedPeriod);
      const result = await (await api("/api/returns/outward/upload", { method: "POST", body: form })).json() as { acceptedRows: number; rejectedRows: number };
      await refreshOutward(); setMessage(`${result.acceptedRows} ERP rows reconciled; ${result.rejectedRows} rejected by validation.`); return true;
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to upload outward ERP data."); return false; }
    finally { setBusy(false); }
  }

  async function uploadIms(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(undefined);
    try {
      const form = new FormData(event.currentTarget); form.set("taxPeriod", selectedPeriod);
      const result = await (await api("/api/returns/ims/upload", { method: "POST", body: form })).json() as { acceptedRows: number; rejectedRows: number; errors?: { row: number; message: string }[] };
      await refreshIms(); setMessage(result.rejectedRows ? `${result.acceptedRows} purchase invoices reconciled. ${result.rejectedRows} row needs correction and was not imported: ${result.errors?.[0]?.message ?? "check the CSV values."}` : `${result.acceptedRows} purchase invoices reconciled.`);
      return true;
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to upload purchase ERP data."); return false; }
    finally { setBusy(false); }
  }

  async function decide(invoiceId: string, status: ImsDecision["status"]) {
    if (!ims) return;
    setBusy(true); setError(undefined);
    try { await api("/api/returns/ims", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "decision", workspaceId: ims.workspace.id, portalInvoiceId: invoiceId, status }) }); await refreshIms(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save the IMS decision."); }
    finally { setBusy(false); }
  }

  async function checkErpCounterparty(erpInvoiceRowId: string, followUpRemark: string) {
    if (!ims) return;
    setBusy(true); setError(undefined);
    try {
      await api("/api/returns/ims/counterparty-check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId: ims.workspace.id, erpInvoiceRowId, followUpRemark }) });
      await refreshIms();
      setMessage("Counterparty check saved with the ERP follow-up note.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to complete the counterparty check."); }
    finally { setBusy(false); }
  }

  async function fileGstr3b() {
    if (!window.confirm(`Simulate filing GSTR-3B for ${selectedLabel}?`)) return;
    setBusy(true); setError(undefined);
    try { const result = await (await api("/api/returns/gstr3b", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ taxPeriod: selectedPeriod }) })).json() as { arn: string }; if (token) await loadReturns(token); setMessage(`GSTR-3B filed in the prototype. ARN ${result.arn}`); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to file GSTR-3B."); }
    finally { setBusy(false); }
  }

  async function fileGstr1() {
    if (!window.confirm(`Finalise GSTR-1 for ${selectedLabel}? This makes its invoice and HSN values available to GSTR-3B.`)) return;
    setBusy(true); setError(undefined);
    try {
      const result = await (await api("/api/returns/outward", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "file", taxPeriod: selectedPeriod }) })).json() as { arn: string };
      await refreshOutward(); if (token) await loadReturns(token); setMessage(`GSTR-1 finalised. ARN ${result.arn}.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to finalise GSTR-1."); }
    finally { setBusy(false); }
  }

  async function refreshAugust() {
    if (!window.confirm("Refresh August? This removes only August uploads, reconciliations and filing progress, then restores the starting portal data.")) return;
    setBusy(true); setError(undefined); setMessage(undefined);
    try {
      await api("/api/returns/refresh", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ taxPeriod: "082026" }) });
      if (token) await loadReturns(token); setOutward(undefined); setIms(undefined); setView("tasks"); setMessage("August was refreshed. E-invoices remain ready to import.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to refresh August."); }
    finally { setBusy(false); }
  }

  if (!data) return error ? <main className="gst-returns-page"><div className="gst-returns-container"><section className="gst-returns-results"><p className="gst-ims-upload-error" role="alert">{error}</p></section></div></main> : <PageLoadingSkeleton variant="returns" />;

  return <main id="main-content" className="gst-returns-page">
    <GstServiceNavigation active="returns" company={data.profile.trade_name ?? data.profile.legal_name} gstin={data.profile.gstin} />
    <div className="gst-returns-container">
      {view === "periods" || view === "tasks" ? <><div className="gst-profile-breadcrumb"><a href="/dashboard">Dashboard</a><span>/</span><button className="gst-link-button" onClick={() => setView("periods")}>Returns</button>{view !== "periods" ? <><span>/</span><span>{selectedLabel}</span></> : null}</div><header className="gst-returns-heading"><div><p className="gst-returns-kicker">Returns dashboard</p><h1>{view === "periods" ? "File returns" : `${selectedLabel} return`}</h1><p>{view === "periods" ? "All values below are loaded from the authenticated taxpayer database." : "Choose outward supplies or IMS; saved work remains available when you go back."}</p></div></header></> : null}
      {error ? <p className="gst-ims-upload-error" role="alert">{error}</p> : null}{message ? <p className="gst-ims-upload-status" role="status">{message}</p> : null}

      {view === "periods" ? <>
        <form className="gst-return-filters" onSubmit={(event) => { event.preventDefault(); setSelectedPeriod(filterPeriod); setView("tasks"); setMessage(undefined); setError(undefined); }}><div className="gst-return-filter-heading"><h2>Find returns</h2><p>April to August 2026 is stored for this test account.</p></div><div className="gst-return-filter-fields"><label><span>Financial year</span><select><option>2026–27</option></select></label><label><span>Quarter</span><select><option>All quarters</option><option>Q1 (Apr–Jun)</option><option>Q2 (Jul–Sep)</option></select></label><label><span>Period</span><select value={filterPeriod} onChange={(event) => setFilterPeriod(event.target.value)}>{periods.map((item) => <option value={item.value} key={item.value}>{item.short}</option>)}</select></label><Button className="gst-return-search-button">Open period</Button></div></form>
        <section className="gst-returns-results"><div className="gst-returns-results-head"><div><p>Financial year</p><h2>FY 2026–27</h2></div><span>{rows.length} periods shown</span></div><div className="gst-returns-table-wrap"><table className="gst-returns-table"><thead><tr><th>Month</th><th>GSTR-1</th><th>GSTR-3B</th><th>Due dates</th><th>Action</th></tr></thead><tbody>{rows.map((row) => <tr key={row.value}><th><span>{row.label}</span><small>{row.short}</small></th><td><span className={`gst-return-badge ${row.gstr1?.status === "Filed" ? "is-filed" : "is-not-filed"}`}>{row.gstr1?.status ?? "Not filed"}</span></td><td><span className={`gst-return-badge ${row.gstr3b?.status === "Filed" ? "is-filed" : "is-not-filed"}`}>{row.gstr3b?.status ?? "Not filed"}</span></td><td><small>GSTR-1: {row.gstr1 ? prettyDate(row.gstr1.due_date) : "—"}<br />GSTR-3B: {row.gstr3b ? prettyDate(row.gstr3b.due_date) : "—"}</small></td><td><button className="gst-return-change-period" onClick={() => { setSelectedPeriod(row.value); setView("tasks"); }}>Open</button></td></tr>)}</tbody></table></div></section>
      </> : null}

      {view === "tasks" ? <section className="gst-return-workspace"><header className="gst-return-workspace-head"><div><p>Selected return period</p><h2>{selectedLabel} · FY 2026–27</h2></div><div className="gst-return-form-actions">{selectedPeriod === "082026" ? <button className="gst-return-change-period gst-august-refresh" onClick={refreshAugust} disabled={busy}>↻ Refresh August data</button> : null}<button className="gst-return-change-period" onClick={() => setView("periods")}>Back to returns dashboard</button></div></header><section className="gst-return-form-section"><div className="gst-return-form-heading"><div><p className="gst-return-form-label">Choose a task</p><h3>{selectedPeriod === "082026" ? "August filing workspace" : "Return filing workspace"}</h3><p>Outward supplies and IMS can be completed in either order.</p></div></div><div className="gst-return-task-grid"><article className="gst-return-task gst-return-task-outward"><div><p className="gst-return-task-kicker">GSTR-1 · outward supplies</p><h4>Sales invoices and IRN data</h4><p>Open E-invoice to import IRP data, upload ERP invoices, assign categories and resolve differences.</p></div><Button size="sm" onClick={loadOutward} disabled={busy}>Open outward supplies</Button></article><article className="gst-return-task gst-return-task-ims"><div><p className="gst-return-task-kicker">IMS · inward supplies</p><h4>Portal purchase invoices</h4><p>Review portal purchases, reconcile ERP records and check counterparties.</p></div><Button size="sm" onClick={loadIms} disabled={busy}>Open IMS</Button></article><article className={`gst-return-task gst-return-task-3b ${selectedGstr1?.status === "FILED" && selectedIms?.submitted_at ? "is-available" : "is-locked"}`}><div><p className="gst-return-task-kicker">GSTR-3B</p><h4>Tax computation summary</h4><p>{selected3b?.status === "Filed" ? `Filed · ARN ${selected3b.arn}` : "Review every 3B line, including invoice-derived sales and ITC, before filing."}</p></div><Button size="sm" disabled={busy} onClick={loadGstr3b}>Open GSTR-3B</Button></article></div></section></section> : null}

      {view === "outward" && outward ? <OutwardView data={outward} busy={busy} error={error} onImport={importAndDownloadIrn} onUpload={uploadOutward} onFinalise={fileGstr1} /> : null}
      {view === "ims" && ims ? <ImsView data={ims} busy={busy} error={error} onUpload={uploadIms} onDecide={decide} onCounterpartyCheck={checkErpCounterparty} /> : null}
      {view === "gstr3b" && gstr3b ? <Gstr3bView data={gstr3b} selectedLabel={selectedLabel} busy={busy} canFile={selectedGstr1?.status === "FILED" && Boolean(selectedIms?.submitted_at) && selected3b?.status !== "Filed"} filedArn={selected3b?.status === "Filed" ? selected3b.arn : null} onBack={() => setView("tasks")} onFile={fileGstr3b} /> : null}
    </div>
    <footer className="gst-prototype-footer">Prototype · synthetic data · filing is simulated</footer>
  </main>;
}

function Gstr3bView({ data, selectedLabel, busy, canFile, filedArn, onBack, onFile }: { data: Gstr3bData; selectedLabel: string; busy: boolean; canFile: boolean; filedArn: string | null; onBack: () => void; onFile: () => void }) {
  const sectionNames: Record<string, string> = {
    "3.1": "3.1 — Tax on outward and reverse charge inward supplies",
    "3.2": "3.2 — Inter-state supplies to unregistered / composition / UIN holders",
    "4": "4 — Eligible ITC",
    "5": "5 — Exempt, nil and non-GST inward supplies",
    "5.1": "5.1 — Interest and late fee for previous tax period",
  };
  const sectionOrder = ["3.1", "3.2", "4", "5", "5.1"];
  const taxCells = (value: Gstr3bTax) => <><td className="gst-money-cell">{money(value.taxable_value)}</td><td className="gst-money-cell">{money(value.igst)}</td><td className="gst-money-cell">{money(value.cgst)}</td><td className="gst-money-cell">{money(value.sgst_utgst)}</td><td className="gst-money-cell">{money(value.cess)}</td></>;
  const summaryRows = [
    ["Output tax on outward supplies (offsettable)", data.summary.output_tax],
    ["Less: Net ITC available", { ...data.summary.net_itc, igst: -data.summary.net_itc.igst, cgst: -data.summary.net_itc.cgst, sgst_utgst: -data.summary.net_itc.sgst_utgst, cess: -data.summary.net_itc.cess }],
    ["Add: Reverse charge liability (cash only)", data.summary.reverse_charge],
    ["Add: Interest & late fee", data.summary.interest],
    ["Total payable in cash", data.summary.total_payable_in_cash],
  ] as const;
  return <section className="gst-3b-page">
    <header className="gst-3b-head">
      <div><p>GSTR-3B · Monthly summary return</p><h2>Tax computation summary</h2><span>{selectedLabel} · {data.profile.trade_name ?? data.profile.legal_name} · {data.profile.gstin}</span></div>
      <div><button className="gst-return-change-period" onClick={onBack}>Back to return workspace</button>{filedArn ? <span className="gst-return-badge is-filed">Filed · {filedArn}</span> : <Button size="sm" disabled={busy || !canFile} onClick={onFile}>{canFile ? "File GSTR-3B" : "Complete GSTR-1 & IMS to file"}</Button>}</div>
    </header>
    <p className="gst-3b-source-note">{data.generated_from.preparation_ledger_available ? <>Figures are generated for this account only from {data.generated_from.outward_documents} outward invoice records, {data.generated_from.inward_invoices} inward invoice records and {data.generated_from.preparation_rows} saved 3B preparation disclosures.</> : <>Invoice-derived figures are available. Run database migration 009 to load reverse-charge, import, reversal, exempt-inward and interest preparation disclosures.</>}</p>
    <section className="gst-3b-summary"><h3>Net tax liability</h3><div className="gst-3b-table-wrap"><table className="gst-3b-summary-table"><thead><tr><th>Computation</th><th>Integrated Tax</th><th>Central Tax</th><th>State/UT Tax</th><th>CESS</th></tr></thead><tbody>{summaryRows.map(([label, value], index) => <tr key={label} className={index === summaryRows.length - 1 ? "is-total" : undefined}><th>{label}</th><td>{money(value.igst)}</td><td>{money(value.cgst)}</td><td>{money(value.sgst_utgst)}</td><td>{money(value.cess)}</td></tr>)}</tbody></table></div></section>
    <section className="gst-3b-lines"><div className="gst-3b-lines-head"><div><h3>Return details</h3><p>Every tax line is shown in one reviewable table before filing.</p></div><span>Invoice amounts are calculated live; preparation-only disclosures are saved per account and period.</span></div><div className="gst-3b-table-wrap"><table className="gst-3b-lines-table"><thead><tr><th>Ref</th><th>Nature of supply</th><th>Type</th><th>Taxable value</th><th>Integrated Tax</th><th>Central Tax</th><th>State/UT Tax</th><th>CESS</th></tr></thead><tbody>{sectionOrder.flatMap((section) => [<tr className="gst-3b-section" key={`${section}-heading`}><th colSpan={8}>{sectionNames[section]}</th></tr>, ...data.rows.filter((row) => row.section === section).map((row, index) => <tr key={`${section}-${row.ref}-${index}`}><th>{row.ref}</th><td>{row.nature}</td><td><span className={`gst-3b-type ${row.type === "Sale" ? "is-sale" : "is-purchase"}`}>{row.type}</span></td>{taxCells(row)}</tr>)])}</tbody></table></div></section>
  </section>;
}

const outwardCategories = ["4A, 4B, 6B, 6C - B2B, SEZ, DE Invoices", "5A - B2C (Large) Invoices", "6A - Exports Invoices", "7 - B2C (Others)", "8A, 8B, 8C, 8D - Nil Rated Supplies", "9B - Credit / Debit Notes (Registered)", "9B - Credit / Debit Notes (Unregistered)", "11A(1), 11A(2) - Tax Liability (Advances Received)", "11B(1), 11B(2) - Adjustment of Advances", "12 - HSN-wise summary of outward supplies", "13 - Documents Issued", "14 - Supplies made through ECO", "15 - Supplies U/s 9(5)"] as const;
type OutwardCategory = typeof outwardCategories[number];
type OutwardTableRow = { kind: "einvoice"; invoice: OutwardDocument; category: OutwardCategory } | { kind: "erp"; invoice: OutwardErpInvoice; category: OutwardCategory };
const categoryForDocument = (document: OutwardDocument): OutwardCategory => {
  if (["CDNR", "CDNR_AMENDMENT"].includes(document.bucket)) return "9B - Credit / Debit Notes (Registered)";
  if (["CDNUR", "CDNUR_AMENDMENT"].includes(document.bucket)) return "9B - Credit / Debit Notes (Unregistered)";
  if (["EXPORT_WITH_PAYMENT", "EXPORT_WITHOUT_PAYMENT", "EXPORT_AMENDMENT"].includes(document.bucket)) return "6A - Exports Invoices";
  if (["B2CL", "B2CL_AMENDMENT"].includes(document.bucket)) return "5A - B2C (Large) Invoices";
  if (document.document_number.toUpperCase().startsWith("CN") || document.document_number.toUpperCase().startsWith("DN")) return document.recipient_gstin ? "9B - Credit / Debit Notes (Registered)" : "9B - Credit / Debit Notes (Unregistered)";
  return document.recipient_gstin ? "4A, 4B, 6B, 6C - B2B, SEZ, DE Invoices" : "7 - B2C (Others)";
};
const categoryForErp = (invoice: OutwardErpInvoice): OutwardCategory => invoice.recipient_gstin ? "4A, 4B, 6B, 6C - B2B, SEZ, DE Invoices" : "7 - B2C (Others)";
const outwardAmounts = (row: OutwardTableRow) => {
  if (row.kind === "einvoice") {
    const line = row.invoice.gstr1_document_lines[0];
    return { taxable: line?.taxable_value ?? 0, tax: (line?.igst ?? 0) + (line?.cgst ?? 0) + (line?.sgst_utgst ?? 0) + (line?.cess ?? 0) };
  }
  return { taxable: row.invoice.taxable_value, tax: row.invoice.igst + row.invoice.cgst + row.invoice.sgst_utgst + row.invoice.cess };
};

function OutwardView({ data, busy, error, onImport, onUpload, onFinalise }: { data: OutwardData; busy: boolean; error?: string; onImport: () => void; onUpload: (event: React.FormEvent<HTMLFormElement>) => Promise<boolean>; onFinalise: () => void }) {
  const [tab, setTab] = useState<"einvoice" | "erp" | "combined">("einvoice");
  const [category, setCategory] = useState<"all" | OutwardCategory>("all");
  const [categories, setCategories] = useState<Record<string, OutwardCategory>>({});
  const [uploadOpen, setUploadOpen] = useState(false);
  const [visibleRows, setVisibleRows] = useState(30);
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const eInvoices: OutwardTableRow[] = data.documents.map((invoice) => ({ kind: "einvoice", invoice, category: categories[invoice.id] ?? categoryForDocument(invoice) }));
  const erpInvoices: OutwardTableRow[] = data.erp_rows.map((invoice) => ({ kind: "erp", invoice, category: categories[invoice.id] ?? categoryForErp(invoice) }));
  const invoices: OutwardTableRow[] = tab === "einvoice" ? eInvoices : tab === "erp" ? erpInvoices : [...eInvoices, ...erpInvoices];
  const filtered = category === "all" ? invoices : invoices.filter((item) => item.category === category);
  const confirmationCount = tab === "einvoice" ? data.irp.filter((row) => !row.imported_gstr1_document_id).length : data.reconciliation?.exception_count ?? 0;
  const comparisonFor = (row: OutwardTableRow) => data.reconciliation_results.find((result) => row.kind === "einvoice" ? result.einvoice_document_id === row.invoice.id : result.erp_invoice_row_id === row.invoice.id);
  const hsnSummary = Array.from(data.documents.flatMap((document) => document.gstr1_document_lines).reduce((summary, line) => { const code = line.hsn_sac_code ?? "Not specified"; const current = summary.get(code) ?? { taxable: 0, tax: 0 }; current.taxable += line.taxable_value; current.tax += line.igst + line.cgst + line.sgst_utgst + line.cess; summary.set(code, current); return summary; }, new Map<string, { taxable: number; tax: number }>()));
  const displayed = filtered.slice(0, visibleRows);
  const grouped = outwardCategories.map((name) => [name, displayed.filter((item) => item.category === name)] as const).filter(([, rows]) => rows.length);
  const resetTableScroll = () => { setVisibleRows(30); tableScrollRef.current?.scrollTo({ top: 0 }); };
  const loadMoreOnScroll = () => {
    const element = tableScrollRef.current;
    if (element && element.scrollTop + element.clientHeight >= element.scrollHeight - 80) setVisibleRows((count) => Math.min(count + 30, filtered.length));
  };
  return <section className="gst-ims-review is-reference-layout gst-gstr1-filing">
    <header className="gst-ims-review-head"><div><p>GSTR-1 · outward supplies</p><h2>GSTR1 Filing</h2><span>Open E-invoice to bring IRP invoices into their GST categories, then upload ERP data and resolve any comparison differences.</span></div><Button className="gst-upload-erp-button" type="button" size="sm" onClick={() => setUploadOpen(true)} disabled={busy || data.return.status === "FILED"}><UploadIcon />ERP Sales Invoices</Button></header>
    <nav className="gst-ims-tabs gst-ims-workflow-tabs gst-gstr1-tabs" role="tablist" aria-label="Outward invoice sources"><button type="button" role="tab" aria-selected={tab === "einvoice"} className={tab === "einvoice" ? "is-active" : undefined} onClick={() => { setTab("einvoice"); resetTableScroll(); if (!data.documents.length && data.irp.some((row) => !row.imported_gstr1_document_id)) onImport(); }}>E-invoice <span>{data.documents.length}</span></button><button type="button" role="tab" aria-selected={tab === "erp"} className={tab === "erp" ? "is-active" : undefined} onClick={() => { setTab("erp"); resetTableScroll(); }}>ERP <span>{data.erp_rows.length}</span></button><button type="button" role="tab" aria-selected={tab === "combined"} className={tab === "combined" ? "is-active" : undefined} onClick={() => { setTab("combined"); resetTableScroll(); }}>ERP invoices + E-invoices <span>{data.erp_rows.length + data.documents.length}</span></button></nav>
    <div className="gst-gstr1-toolbar"><label>Category<select value={category} onChange={(event) => { setCategory(event.target.value as "all" | OutwardCategory); resetTableScroll(); }}><option value="all">All categories (clubbed)</option>{outwardCategories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><p><strong>{filtered.length}</strong> invoices <span>·</span> <strong>{confirmationCount}</strong> {tab === "erp" ? "ERP rows ready to categorise" : "awaiting import or comparison"}</p><div className="gst-gstr1-toolbar-actions"><Button size="sm" onClick={onImport} disabled={busy || data.return.status === "FILED" || !data.irp.some((row) => !row.imported_gstr1_document_id)}>Import E-invoices</Button></div></div>
    <div className="gst-ims-stage gst-gstr1-stage"><div className="gst-ims-table-wrap gst-gstr1-scroll" ref={tableScrollRef} onScroll={loadMoreOnScroll}><table className="gst-ims-table gst-ims-reference-table gst-gstr1-table"><thead><tr><th>Invoice No</th><th>Date</th><th>Customer</th><th>GSTIN</th><th>Category</th><th>Taxable</th><th>Tax</th><th>Comparison</th><th>Source</th></tr></thead><tbody>{grouped.length ? grouped.flatMap(([groupName, rows]) => [<tr className="gst-gstr1-group" key={`${groupName}-group`}><th colSpan={9}>{groupName} <span>({rows.length})</span></th></tr>, ...rows.map((row) => { const invoice = row.invoice; const { taxable, tax } = outwardAmounts(row); const comparison = comparisonFor(row); const status = comparison?.status === "MATCHED" ? "Matched" : comparison ? comparison.status.replaceAll("_", " ") : row.kind === "erp" ? "Awaiting e-invoice" : "Ready"; return <tr key={`${row.kind}-${invoice.id}`}><th>{invoice.document_number}</th><td>{prettyDate(invoice.document_date)}</td><td>{invoice.recipient_name || "Walk-in customer"}</td><td className="gst-invoice-gstin">{invoice.recipient_gstin || "—"}</td><td className="gst-invoice-category"><select aria-label={`Category for ${invoice.document_number}`} value={row.category} disabled={data.return.status === "FILED"} onChange={(event) => setCategories((current) => ({ ...current, [invoice.id]: event.target.value as OutwardCategory }))}>{outwardCategories.map((item) => <option key={item}>{item}</option>)}</select></td><td className="gst-money-cell">{money(taxable)}</td><td className="gst-money-cell">{money(tax)}</td><td><span className={`gst-ims-status ${comparison && comparison.status !== "MATCHED" ? "is-pending" : "is-approved"}`}>{status}</span></td><td><span className="gst-gstr1-source">{row.kind === "einvoice" ? "E-invoice" : "ERP"}</span></td></tr>; })]) : <tr><td colSpan={9} className="gst-invoice-empty">{tab === "einvoice" ? "No invoices are shown until E-invoice is selected; selecting it imports the August IRP invoices automatically." : "Upload your ERP CSV to add invoices and categories."}</td></tr>}</tbody></table>{displayed.length < filtered.length ? <p className="gst-gstr1-load-more">Scroll to load more invoices</p> : null}</div></div>
    <section className="gst-gstr1-finalisation"><div><p className="gst-return-form-label">Month-end finalisation</p><h3>HSN summary for GSTR-3B</h3><p>Finalising locks these GSTR-1 invoices and makes their outward tax values available to the GSTR-3B workflow.</p></div><div className="gst-gstr1-hsn-list">{hsnSummary.length ? hsnSummary.map(([code, value]) => <p key={code}><strong>HSN {code}</strong><span>{money(value.taxable)} taxable · {money(value.tax)} tax</span></p>) : <p>HSN codes appear after e-invoices are imported.</p>}</div><Button size="sm" onClick={onFinalise} disabled={busy || data.return.status === "FILED" || !data.documents.length}>{data.return.status === "FILED" ? "GSTR-1 finalised" : "Finalise GSTR-1"}</Button></section>
    {uploadOpen ? <div className="gst-confirmation-backdrop" role="presentation"><section className="gst-confirmation-modal gst-upload-modal" role="dialog" aria-modal="true" aria-labelledby="outward-upload-heading"><p className="gst-returns-kicker">ERP data import</p><h3 id="outward-upload-heading">Upload sales ERP CSV</h3><p>Use the sample format. Every row must include invoice value, taxable value, IGST, CGST, SGST/UTGST and cess.</p><a className="gst-ims-template-link" href="/templates/outward-erp-upload-sample.csv" download>Download sample CSV</a><form className="gst-ims-upload-form" onSubmit={async (event) => { if (await onUpload(event)) setUploadOpen(false); }}><label><span>ERP CSV file</span><input name="file" type="file" accept=".csv,text/csv" required disabled={busy} /></label>{error ? <p className="gst-ims-upload-error" role="alert">{error}</p> : null}<div><button className="gst-confirmation-cancel" type="button" onClick={() => setUploadOpen(false)}>Cancel</button><Button type="submit" size="sm" disabled={busy}>{busy ? "Uploading…" : "Import & reconcile"}</Button></div></form></section></div> : null}
  </section>;
}

function ImsView({ data, busy, error, onUpload, onDecide, onCounterpartyCheck }: { data: ImsData; busy: boolean; error?: string; onUpload: (event: React.FormEvent<HTMLFormElement>) => Promise<boolean>; onDecide: (id: string, status: ImsDecision["status"]) => void; onCounterpartyCheck: (erpInvoiceRowId: string, followUpRemark: string) => void }) {
  const [tab, setTab] = useState<"gstr2a" | "review" | "to-check" | "finalised">("gstr2a");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [rejecting, setRejecting] = useState<PortalInvoice>();
  const [followUp, setFollowUp] = useState<Record<string, string>>({});
  const decisions = new Map(data.decisions.map((item) => [item.portal_invoice_id, item.status]));
  const erp = new Map(data.erp_rows.map((item) => [item.id, item]));
  const results = new Map<string, MatchResult>(data.reconciliation_results.filter((item): item is MatchResult & { portal_invoice_id: string } => Boolean(item.portal_invoice_id)).map((item) => [item.portal_invoice_id, item]));
  const checks = new Map<string, RecentCheck>();
  data.recent_counterparty_checks.forEach((item) => { if (item.erp_invoice_row_id && !checks.has(item.erp_invoice_row_id)) checks.set(item.erp_invoice_row_id, item); });
  const erpOnly = data.reconciliation_results.filter((item) => item.status === "ERP_ONLY" && item.erp_invoice_row_id).map((item) => erp.get(item.erp_invoice_row_id!)).filter((item): item is ErpInvoice => Boolean(item));
  const groups = {
    gstr2a: data.portal_invoices,
    review: data.latest_run ? data.portal_invoices.filter((invoice) => (decisions.get(invoice.id) ?? "PENDING") === "PENDING") : [],
    "to-check": erpOnly,
    finalised: data.portal_invoices.filter((invoice) => ["ACCEPTED", "REJECTED"].includes(decisions.get(invoice.id) ?? "PENDING")),
  };
  return <section className="gst-ims-review is-reference-layout">
    <header className="gst-ims-review-head"><div><p>Inward supplies</p><h2>Manage Inward Supplies</h2><span>See what GST has received, compare it with your purchase invoices, and resolve only the exceptions that need your attention.</span></div><Button className="gst-upload-erp-button" type="button" size="sm" onClick={() => setUploadOpen(true)} disabled={busy}><UploadIcon />ERP Purchase Invoices</Button></header>
    <nav className="gst-ims-tabs gst-ims-workflow-tabs" role="tablist" aria-label="Inward supply workflow">{(["gstr2a", "review", "to-check", "finalised"] as const).map((item) => <button key={item} type="button" role="tab" aria-selected={tab === item} className={tab === item ? "is-active" : undefined} onClick={() => setTab(item)}>{item === "gstr2a" ? "GSTR-2A" : item === "to-check" ? "To Check" : item[0].toUpperCase() + item.slice(1)}<span>{groups[item].length}</span></button>)}</nav>
    {tab === "gstr2a" ? <InvoiceTable invoices={groups.gstr2a} title="Invoices received through GSTR-2A" /> : null}
    {tab === "review" ? <ReviewTable invoices={groups.review} results={results} erp={erp} decisions={decisions} busy={busy} onAccept={(invoice) => onDecide(invoice.id, "ACCEPTED")} onReject={setRejecting} /> : null}
    {tab === "to-check" ? <ToCheckTable invoices={groups["to-check"]} checks={checks} followUp={followUp} setFollowUp={setFollowUp} busy={busy} onCheck={onCounterpartyCheck} /> : null}
    {tab === "finalised" ? <ReviewTable invoices={groups.finalised} results={results} erp={erp} decisions={decisions} busy={busy} finalised onAccept={(invoice) => onDecide(invoice.id, "PENDING")} onReject={setRejecting} /> : null}
    {rejecting ? <div className="gst-confirmation-backdrop" role="presentation"><section className="gst-confirmation-modal" role="dialog" aria-modal="true" aria-labelledby="reject-heading"><p className="gst-returns-kicker">Confirm decision</p><h3 id="reject-heading">Reject this invoice?</h3><p>{rejecting.invoice_number} from {rejecting.supplier_name} ({rejecting.supplier_gstin}) will be moved to Finalised.</p><div><button className="gst-confirmation-cancel" type="button" onClick={() => setRejecting(undefined)}>Cancel</button><Button type="button" size="sm" onClick={() => { onDecide(rejecting.id, "REJECTED"); setRejecting(undefined); }}>Reject invoice</Button></div></section></div> : null}
    {uploadOpen ? <div className="gst-confirmation-backdrop" role="presentation"><section className="gst-confirmation-modal gst-upload-modal" role="dialog" aria-modal="true" aria-labelledby="erp-upload-heading"><p className="gst-returns-kicker">ERP data import</p><h3 id="erp-upload-heading">Upload purchase ERP CSV</h3><p>Use the sample format. Every row must include invoice value, taxable value, IGST, CGST, SGST/UTGST and cess.</p><a className="gst-ims-template-link" href="/templates/ims-erp-upload-sample.csv" download>Download sample CSV</a><form className="gst-ims-upload-form" onSubmit={async (event) => { if (await onUpload(event)) setUploadOpen(false); }}><label><span>ERP CSV file</span><input name="file" type="file" accept=".csv,text/csv" required disabled={busy} /></label>{error ? <p className="gst-ims-upload-error" role="alert">{error}</p> : null}<div><button className="gst-confirmation-cancel" type="button" onClick={() => setUploadOpen(false)}>Cancel</button><Button type="submit" size="sm" disabled={busy}>{busy ? "Uploading…" : "Import & reconcile"}</Button></div></form></section></div> : null}
  </section>;
}

function InvoiceTable({ invoices, title }: { invoices: PortalInvoice[]; title: string }) { return <section className="gst-ims-stage"><p>{title}</p><div className="gst-ims-table-wrap"><table className="gst-ims-table gst-ims-reference-table"><thead><tr><th rowSpan={2}>Invoice</th><th rowSpan={2}>Date</th><th rowSpan={2}>Supplier / GSTIN</th><th rowSpan={2}>Taxable value</th><th colSpan={3}>Tax</th><th rowSpan={2}>Status</th></tr><tr><th>IGST</th><th>SGST/UTGST</th><th>CGST</th></tr></thead><tbody>{invoices.length ? invoices.map((invoice) => <tr key={invoice.id}><th>{invoice.invoice_number}</th><td>{prettyDate(invoice.invoice_date)}</td><td><span>{invoice.supplier_name}</span><small className="gst-invoice-gstin">{invoice.supplier_gstin}</small></td><td className="gst-money-cell">{money(invoice.taxable_value)}</td><td className="gst-money-cell">{money(invoice.igst)}</td><td className="gst-money-cell">{money(invoice.sgst_utgst)}</td><td className="gst-money-cell">{money(invoice.cgst)}</td><td><span className="gst-ims-status is-pending">GSTR-2A</span></td></tr>) : <tr><td colSpan={8} className="gst-invoice-empty">No GSTR-2A invoices are available for this period.</td></tr>}</tbody></table></div></section>; }
function ReviewTable({ invoices, results, erp, decisions, busy, onAccept, onReject, finalised = false }: { invoices: PortalInvoice[]; results: Map<string, MatchResult>; erp: Map<string, ErpInvoice>; decisions: Map<string, ImsDecision["status"]>; busy: boolean; onAccept: (invoice: PortalInvoice) => void; onReject: (invoice: PortalInvoice) => void; finalised?: boolean }) { return <section className="gst-ims-stage"><p>{finalised ? "Invoices with a recorded decision" : "Invoices needing a decision after automatic reconciliation"}</p><div className="gst-ims-table-wrap"><table className="gst-ims-table gst-ims-reference-table"><thead><tr><th rowSpan={2}>Invoice</th><th rowSpan={2}>Supplier / GSTIN</th><th rowSpan={2}>ERP comparison</th><th colSpan={3}>GST tax</th><th rowSpan={2}>Status</th><th rowSpan={2}>Action</th></tr><tr><th>IGST</th><th>SGST/UTGST</th><th>CGST</th></tr></thead><tbody>{invoices.length ? invoices.map((invoice) => { const result = results.get(invoice.id); const erpRow = result?.erp_invoice_row_id ? erp.get(result.erp_invoice_row_id) : undefined; const decision = decisions.get(invoice.id) ?? "PENDING"; return <tr key={invoice.id}><th>{invoice.invoice_number}<small>{prettyDate(invoice.invoice_date)}</small></th><td><span>{invoice.supplier_name}</span><small className="gst-invoice-gstin">{invoice.supplier_gstin}</small></td><td>{erpRow ? <span>Invoice {erpRow.invoice_number}<small>Taxable {money(erpRow.taxable_value)} · Tax {money(erpRow.tax_value)}</small></span> : "No matching ERP invoice"}</td><td className="gst-money-cell">{money(invoice.igst)}</td><td className="gst-money-cell">{money(invoice.sgst_utgst)}</td><td className="gst-money-cell">{money(invoice.cgst)}</td><td><span className={`gst-ims-status is-${decision === "ACCEPTED" ? "approved" : decision === "REJECTED" ? "rejected" : "pending"}`}>{decision === "PENDING" ? "Pending" : decision === "ACCEPTED" ? "Accepted" : "Rejected"}</span></td><td><div className="gst-ims-row-actions">{finalised ? <button disabled={busy} onClick={() => onAccept(invoice)}>Remove decision</button> : <><button disabled={busy} onClick={() => onAccept(invoice)}>Accept</button><button disabled={busy} onClick={() => onReject(invoice)}>Reject</button></>}</div></td></tr>; }) : <tr><td colSpan={8} className="gst-invoice-empty">{finalised ? "No invoices have been finalised yet." : "Upload ERP purchase invoices to begin reconciliation, or no invoices require review."}</td></tr>}</tbody></table></div></section>; }
function ToCheckTable({ invoices, checks, followUp, setFollowUp, busy, onCheck }: { invoices: ErpInvoice[]; checks: Map<string, RecentCheck>; followUp: Record<string, string>; setFollowUp: React.Dispatch<React.SetStateAction<Record<string, string>>>; busy: boolean; onCheck: (id: string, remark: string) => void }) { return <section className="gst-ims-stage"><p>Purchase invoices in your ERP that are not yet available in GSTR-2A. Follow up with the supplier before deciding what to do next.</p><div className="gst-ims-table-wrap"><table className="gst-ims-table gst-ims-reference-table"><thead><tr><th rowSpan={2}>ERP invoice</th><th rowSpan={2}>Supplier / GSTIN</th><th colSpan={3}>Tax</th><th rowSpan={2}>Follow-up note</th><th rowSpan={2}>Counterparty Check</th></tr><tr><th>IGST</th><th>SGST/UTGST</th><th>CGST</th></tr></thead><tbody>{invoices.length ? invoices.map((invoice) => { const check = checks.get(invoice.id); return <tr key={invoice.id}><th>{invoice.invoice_number}<small>{prettyDate(invoice.invoice_date)}</small></th><td><span>{invoice.supplier_name}</span><small className="gst-invoice-gstin">{invoice.supplier_gstin}</small></td><td className="gst-money-cell">{money(invoice.igst)}</td><td className="gst-money-cell">{money(invoice.sgst_utgst)}</td><td className="gst-money-cell">{money(invoice.cgst)}</td><td><textarea aria-label={`Follow-up note for ${invoice.invoice_number}`} value={followUp[invoice.id] ?? ""} onChange={(event) => setFollowUp((value) => ({ ...value, [invoice.id]: event.target.value }))} placeholder={check?.remarks ?? "Add a supplier follow-up note"} /></td><td><Button size="sm" disabled={busy} onClick={() => onCheck(invoice.id, followUp[invoice.id] ?? "")}>Counterparty Check</Button></td></tr>; }) : <tr><td colSpan={7} className="gst-invoice-empty">Every uploaded ERP purchase invoice has a corresponding GSTR-2A invoice.</td></tr>}</tbody></table></div></section>; }

function UploadIcon() { return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 3v11m0-11 4 4m-4-4-4 4M5 15v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" /></svg>; }
