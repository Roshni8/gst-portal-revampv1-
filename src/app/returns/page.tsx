"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Check, ChevronRight, Pencil, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GstServiceNavigation } from "@/components/gst-service-navigation";
import { PageLoadingSkeleton } from "@/components/page-loading-skeleton";
import { StatusBadge } from "@/components/status-badge";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { Toast } from "@/components/ui/toast";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type Filing = { return_type: string; tax_period: string; filing_date: string | null; arn: string | null; status: "Filed" | "Not Filed"; due_date: string };
type ReturnPayment = { tax_period: string; tax_paid: number | null };
type Gstr1Return = { id: string; tax_period: string; status: string; arn: string | null; filed_at: string | null };
type Workspace = { id: string; tax_period: string; submitted_at: string | null };
type ReturnsData = { profile: { gstin: string; legal_name: string; trade_name: string | null }; filing_history: Filing[]; gstr1_returns: Gstr1Return[]; ims_workspaces: Workspace[] };
type TaxLine = { taxable_value: number; igst: number; cgst: number; sgst_utgst: number; cess: number; hsn_sac_code?: string };
type OutwardDocument = { id: string; bucket: string; document_number: string; document_date: string; recipient_name: string; recipient_gstin: string; place_of_supply: string; total_document_value: number; source: string; irn: string | null; is_irp_edited: boolean; gstr1_category: string | null; gstr1_document_lines: TaxLine[] };
type OutwardErpInvoice = { id: string; document_number: string; document_date: string; recipient_name: string | null; recipient_gstin: string | null; place_of_supply: string; total_invoice_value: number; taxable_value: number; igst: number; cgst: number; sgst_utgst: number; cess: number; source_row_number: number; gstr1_category: string | null };
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
  const pathname = usePathname();
  const initialView: View = pathname.endsWith("/gstr1") ? "outward" : pathname.endsWith("/gstr2") ? "ims" : pathname.endsWith("/gstr3b") ? "gstr3b" : "periods";
  const [token, setToken] = useState<string>();
  const [data, setData] = useState<ReturnsData>();
  const [payments, setPayments] = useState<Record<string, number | null>>();
  const [outward, setOutward] = useState<OutwardData>();
  const [ims, setIms] = useState<ImsData>();
  const [gstr3b, setGstr3b] = useState<Gstr3bData>();
  const [view, setView] = useState<View>(initialView);
  const [selectedPeriod, setSelectedPeriod] = useState("082026");
  const [filterPeriod, setFilterPeriod] = useState("082026");
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [busyAction, setBusyAction] = useState<string | null>(null);

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
      const requestedView = params.get("view") === "ims" ? "ims" : initialView;
      const taxPeriod = params.get("taxPeriod") ?? selectedPeriod;
      if (params.get("taxPeriod") && taxPeriod !== selectedPeriod) {
        setSelectedPeriod(taxPeriod);
        setFilterPeriod(taxPeriod);
      }
      if (requestedView === "outward") {
        const response = await fetch(`/api/returns/outward?taxPeriod=${taxPeriod}`, { headers });
        if (!response.ok) throw new Error((await response.json() as { error?: string }).error ?? "Unable to load outward invoices.");
        if (!mounted) return;
        setOutward(await response.json() as OutwardData);
      }
      if (requestedView === "ims") {
        const response = await fetch(`/api/returns/ims?taxPeriod=${taxPeriod}`, { headers });
        if (!response.ok) throw new Error((await response.json() as { error?: string }).error ?? "Unable to load IMS.");
        if (!mounted) return;
        setIms(await response.json() as ImsData);
      }
      if (requestedView === "gstr3b") {
        const response = await fetch(`/api/returns/gstr3b?taxPeriod=${taxPeriod}`, { headers });
        if (!response.ok) throw new Error((await response.json() as { error?: string }).error ?? "Unable to load the GSTR-3B computation.");
        if (!mounted) return;
        setGstr3b(await response.json() as Gstr3bData);
      }
    })().catch((cause) => { if (mounted) setError(cause instanceof Error ? cause.message : "Unable to load returns."); });
    return () => { mounted = false; };
  }, [initialView, loadReturns, router, selectedPeriod]);

  useEffect(() => {
    if (!token || !data) return;
    let mounted = true;
    void api("/api/returns/payments").then((response) => response.json() as Promise<{ payments: ReturnPayment[] }>).then((result) => {
      if (mounted) setPayments(Object.fromEntries(result.payments.map((item) => [item.tax_period, item.tax_paid])));
    }).catch(() => { if (mounted) setPayments({}); });
    return () => { mounted = false; };
  }, [api, data, token]);

  const selectedPeriodMeta = periods.find((item) => item.value === selectedPeriod);
  const selectedLabel = selectedPeriodMeta?.short ?? selectedPeriod;
  const selectedFullLabel = selectedPeriodMeta ? `${selectedPeriodMeta.label} 2026` : selectedPeriod;
  const selectedGstr1 = data?.gstr1_returns.find((item) => item.tax_period === selectedPeriod);
  const selectedIms = data?.ims_workspaces.find((item) => item.tax_period === selectedPeriod);
  const selected3b = data?.filing_history.find((item) => item.tax_period === selectedPeriod && item.return_type === "GSTR-3B");
  const selectedGstr1Done = selectedGstr1?.status === "FILED";
  const selectedImsDone = Boolean(selectedIms?.submitted_at);
  const selected3bDone = selected3b?.status === "Filed";

  const rows = useMemo(() => periods.map((period) => ({
    ...period,
    gstr1: data?.filing_history.find((item) => item.tax_period === period.value && item.return_type === "GSTR-1"),
    gstr3b: data?.filing_history.find((item) => item.tax_period === period.value && item.return_type === "GSTR-3B"),
  })), [data]);

  function loadOutward() { router.push(`/returns/gstr1?taxPeriod=${selectedPeriod}`); }

  function loadIms() { router.push(`/returns/gstr2?taxPeriod=${selectedPeriod}`); }

  function loadGstr3b() { router.push(`/returns/gstr3b?taxPeriod=${selectedPeriod}`); }

  async function refreshOutward() { setOutward(await (await api(`/api/returns/outward?taxPeriod=${selectedPeriod}`)).json() as OutwardData); }
  async function refreshIms() { setIms(await (await api(`/api/returns/ims?taxPeriod=${selectedPeriod}`)).json() as ImsData); }

  async function importAndDownloadIrn() {
    setBusyAction("import-irn"); setError(undefined);
    try {
      const result = await (await api("/api/returns/outward", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "import_irn", taxPeriod: selectedPeriod }) })).json() as { imported: number };
      const download = await api(`/api/returns/outward/download?taxPeriod=${selectedPeriod}`);
      const url = URL.createObjectURL(await download.blob());
      const link = document.createElement("a"); link.href = url; link.download = `irn-einvoices-${selectedPeriod}.csv`; link.click(); URL.revokeObjectURL(url);
      await refreshOutward(); setMessage(`${result.imported} new IRN e-invoices imported. The complete IRN CSV was downloaded.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to import IRN invoices."); }
    finally { setBusyAction(null); }
  }

  async function uploadOutwardData(form: FormData) {
    setBusyAction("upload-outward"); setError(undefined);
    try {
      form.set("taxPeriod", selectedPeriod);
      const result = await (await api("/api/returns/outward/upload", { method: "POST", body: form })).json() as { acceptedRows: number; rejectedRows: number };
      await refreshOutward(); setMessage(result.rejectedRows ? `${result.acceptedRows} ERP invoices imported. ${result.rejectedRows} rows need correction.` : `${result.acceptedRows} ERP invoices imported and reconciled.`);
      return true;
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to import ERP invoices."); return false; }
    finally { setBusyAction(null); }
  }

  async function uploadOutward(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); return uploadOutwardData(new FormData(event.currentTarget)); }

  async function uploadOutwardSample() {
    try {
      const response = await fetch("/templates/outward-erp-upload-sample.csv");
      if (!response.ok) throw new Error("The sample ERP file could not be loaded.");
      const form = new FormData(); form.set("file", new File([await response.blob()], "outward-erp-upload-sample.csv", { type: "text/csv" }));
      return await uploadOutwardData(form);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load the sample ERP file."); return false; }
  }

  async function updateOutwardInvoice(source: "EINVOICE" | "ERP", invoiceId: string, values: { category?: string; documentNumber?: string; recipientName?: string }) {
    setBusyAction(`outward-edit-${invoiceId}`); setError(undefined);
    try { await api("/api/returns/outward", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ taxPeriod: selectedPeriod, source, invoiceId, ...values }) }); await refreshOutward(); setMessage("Invoice updated."); return true; }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to update the invoice."); return false; }
    finally { setBusyAction(null); }
  }

  async function removeOutwardInvoice(source: "EINVOICE" | "ERP", invoiceId: string) {
    setBusyAction(`outward-remove-${invoiceId}`); setError(undefined);
    try { await api("/api/returns/outward", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ taxPeriod: selectedPeriod, source, invoiceId }) }); await refreshOutward(); setMessage("Invoice removed."); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to remove the invoice."); }
    finally { setBusyAction(null); }
  }

  async function fileGstr1() {
    if (!window.confirm(`Submit GSTR1 for ${selectedLabel}?`)) return;
    setBusyAction("file-gstr1"); setError(undefined);
    try {
      const result = await (await api("/api/returns/outward", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "file", taxPeriod: selectedPeriod }) })).json() as { arn: string };
      if (token) await loadReturns(token);
      await refreshOutward();
      setMessage(`GSTR1 submitted in the prototype. ARN ${result.arn}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to submit GSTR1."); }
    finally { setBusyAction(null); }
  }

  async function uploadIms(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusyAction("upload-ims"); setError(undefined);
    try {
      const form = new FormData(event.currentTarget); form.set("taxPeriod", selectedPeriod);
      const result = await (await api("/api/returns/ims/upload", { method: "POST", body: form })).json() as { acceptedRows: number; rejectedRows: number; errors?: { row: number; message: string }[] };
      await refreshIms(); setMessage(result.rejectedRows ? `${result.acceptedRows} purchase invoices reconciled. ${result.rejectedRows} row needs correction and was not imported: ${result.errors?.[0]?.message ?? "check the CSV values."}` : `${result.acceptedRows} purchase invoices reconciled.`);
      return true;
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to upload purchase ERP data."); return false; }
    finally { setBusyAction(null); }
  }

  async function decide(invoiceId: string, status: ImsDecision["status"]) {
    if (!ims) return;
    setBusyAction(`decision-${invoiceId}`); setError(undefined);
    try { await api("/api/returns/ims", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "decision", workspaceId: ims.workspace.id, portalInvoiceId: invoiceId, status }) }); await refreshIms(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save the IMS decision."); }
    finally { setBusyAction(null); }
  }

  async function checkErpCounterparty(erpInvoiceRowId: string, followUpRemark: string) {
    if (!ims) return;
    setBusyAction(`counterparty-${erpInvoiceRowId}`); setError(undefined);
    try {
      await api("/api/returns/ims/counterparty-check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId: ims.workspace.id, erpInvoiceRowId, followUpRemark }) });
      await refreshIms();
      setMessage("Counterparty check saved with the ERP follow-up note.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to complete the counterparty check."); }
    finally { setBusyAction(null); }
  }

  async function fileGstr3b() {
    if (!window.confirm(`Simulate filing GSTR-3B for ${selectedLabel}?`)) return;
    setBusyAction("file-gstr3b"); setError(undefined);
    try { const result = await (await api("/api/returns/gstr3b", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ taxPeriod: selectedPeriod }) })).json() as { arn: string }; if (token) await loadReturns(token); setMessage(`GSTR-3B filed in the prototype. ARN ${result.arn}`); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to file GSTR-3B."); }
    finally { setBusyAction(null); }
  }

  async function refreshAugust() {
    if (!window.confirm("Refresh August? This removes only August uploads, reconciliations and filing progress, then restores the starting portal data.")) return;
    setBusyAction("refresh-august"); setError(undefined); setMessage(undefined);
    try {
      await api("/api/returns/refresh", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ taxPeriod: "082026" }) });
      if (token) await loadReturns(token); setOutward(undefined); setIms(undefined); setMessage("August was refreshed. E-invoices remain ready to import.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to refresh August."); }
    finally { setBusyAction(null); }
  }

  const workflowLoading = (view === "outward" && !outward) || (view === "ims" && !ims) || (view === "gstr3b" && !gstr3b);
  if (!data || workflowLoading) return error ? <main className="gst-returns-page"><div className="gst-returns-container"><section className="gst-returns-results"><p className="gst-ims-upload-error" role="alert">{error}</p></section></div></main> : <PageLoadingSkeleton variant="returns" />;

  return <main id="main-content" className="gst-returns-page">
    <GstServiceNavigation active="returns" company={data.profile.trade_name ?? data.profile.legal_name} gstin={data.profile.gstin} />
    <div className="gst-returns-container">
      {view === "periods" || view === "tasks" ? <><nav className="gst-profile-breadcrumb" aria-label="Breadcrumb"><a href="/dashboard">Dashboard</a><BreadcrumbChevron />{view === "periods" ? <span aria-current="page">Returns</span> : <button className="gst-link-button" onClick={() => setView("periods")}>Returns</button>}{view !== "periods" ? <><BreadcrumbChevron /><span aria-current="page">{selectedFullLabel}</span></> : null}</nav><header className="gst-returns-heading"><div><h1 className={view === "periods" || view === "tasks" ? "gst-returns-dashboard-title" : undefined}>{view === "periods" ? "Returns Dashboard" : `${selectedFullLabel} Returns`}</h1></div>{view === "tasks" && selectedPeriod === "082026" ? <button className="gst-return-change-period gst-august-refresh" type="button" onClick={refreshAugust} disabled={busyAction === "refresh-august"}>{busyAction === "refresh-august" ? "Refreshing August data" : "Refresh August data"}</button> : null}</header></> : null}
      {view === "outward" ? <WorkflowBreadcrumb label="GSTR1" /> : null}
      {view === "ims" ? <WorkflowBreadcrumb label="Portal purchase invoices" /> : null}
      {view === "gstr3b" ? <WorkflowBreadcrumb label="Tax computation summary" /> : null}
      {error ? <p className="gst-ims-upload-error" role="alert">{error}</p> : null}

      {view === "periods" ? <>
        <form className="gst-return-filters" onSubmit={(event) => { event.preventDefault(); setSelectedPeriod(filterPeriod); setView("tasks"); setMessage(undefined); setError(undefined); }}><div className="gst-return-filter-heading"><h2>File Return</h2></div><div className="gst-return-filter-fields"><label><span>Financial year</span><DropdownSelect ariaLabel="Financial year" value="2026–27" onValueChange={() => undefined} options={[{ value: "2026–27", label: "2026–27" }]} /></label><label><span>Period</span><DropdownSelect ariaLabel="Period" value={filterPeriod} onValueChange={setFilterPeriod} options={periods.map((item) => ({ value: item.value, label: item.short }))} /></label><Button className="gst-return-search-button">File</Button></div></form>
        <section className="gst-returns-results"><div className="gst-returns-table-wrap"><table className="gst-returns-table"><colgroup><col className="gst-return-month-col" /><col className="gst-return-status-col" /><col className="gst-return-status-col" /><col className="gst-return-amount-col" /><col className="gst-return-payment-col" /><col className="gst-return-action-col" /></colgroup><thead><tr><th>Month</th><th>GSTR1</th><th>GSTR3B</th><th>GST Amount</th><th>Payment status</th><th><span className="sr-only">Open return</span></th></tr></thead><tbody>{rows.map((row) => { const gstr3bFiled = row.gstr3b?.status === "Filed"; const paymentStatus = gstr3bFiled ? "Paid" : "Pending"; return <tr key={row.value}><th>{row.label}</th><td><StatusBadge tone={row.gstr1?.status === "Filed" ? "success" : "warning"}>{row.gstr1?.status === "Filed" ? "Filed" : "Pending"}</StatusBadge></td><td><StatusBadge tone={gstr3bFiled ? "success" : "warning"}>{gstr3bFiled ? "Filed" : "Pending"}</StatusBadge></td><td className="gst-money-cell">{payments ? money(payments[row.value]) : <span className="gst-return-amount-loading" aria-label="Loading GST amount" />}</td><td><StatusBadge tone={paymentStatus === "Paid" ? "success" : "warning"}>{paymentStatus}</StatusBadge></td><td><button className="gst-return-open" type="button" onClick={() => { setSelectedPeriod(row.value); setView("tasks"); }}>Open</button></td></tr>; })}</tbody></table></div></section>
      </> : null}

      {view === "tasks" ? <section className="gst-return-workflow">
        <nav className="gst-return-vertical-stepper" aria-label="Return filing progress">
          {[selectedGstr1Done, selectedImsDone, selected3bDone].map((done, index) => <div key={index} className={`gst-return-vertical-step ${done ? "is-done" : "is-pending"} ${index < 2 && [selectedGstr1Done, selectedImsDone][index] ? "has-done-line" : ""}`}><span aria-label={`Step ${index + 1}`}>{done ? <Check /> : index + 1}</span></div>)}
        </nav>
        <section className="gst-return-workspace"><section className="gst-return-form-section"><div className="gst-return-task-grid">
            <ReturnTaskCard variant="outward" label="SALES INVOICES" title="Sales invoices and IRN data" description="Import and compare your outward sales invoices" buttonLabel="Open sales invoices" onClick={loadOutward} />
            <ReturnTaskCard variant="ims" label="GSTR2B · INWARD SUPPLIES" title="Purchase Invoice" description="Auto Drafted ITC Statement for the month" buttonLabel="IMS" onClick={loadIms} />
            <ReturnTaskCard variant="gstr3b" label="GSTR3B ." title="Monthly Return" description={selected3bDone && selected3b?.arn ? `Filed · ARN ${selected3b.arn}` : "Finalise tax for the Month"} buttonLabel="File GSTR-3B" onClick={loadGstr3b} />
          </div></section></section>
      </section> : null}

      {view === "outward" && outward ? <OutwardView data={outward} busyAction={busyAction} error={error} onImport={importAndDownloadIrn} onUpload={uploadOutward} onUploadSample={uploadOutwardSample} onUpdate={updateOutwardInvoice} onRemove={removeOutwardInvoice} onSubmit={fileGstr1} /> : null}
      {view === "ims" && ims ? <ImsView data={ims} busyAction={busyAction} error={error} onUpload={uploadIms} onDecide={decide} onCounterpartyCheck={checkErpCounterparty} /> : null}
      {view === "gstr3b" && gstr3b ? <Gstr3bView data={gstr3b} selectedLabel={selectedLabel} busy={busyAction === "file-gstr3b"} canFile={selectedGstr1?.status === "FILED" && Boolean(selectedIms?.submitted_at) && selected3b?.status !== "Filed"} filedArn={selected3b?.status === "Filed" ? selected3b.arn : null} onBack={() => router.push("/returns")} onFile={fileGstr3b} /> : null}
    </div>
    <footer className="gst-prototype-footer">This is a GST Portal redesign prototype, not the actual GST portal. All data is synthetic, and filing information is simulated.</footer>
    <Toast message={message} onDismiss={() => setMessage(undefined)} />
  </main>;
}

function WorkflowBreadcrumb({ label }: { label: string }) { return <nav className="gst-profile-breadcrumb" aria-label="Breadcrumb"><a href="/dashboard">Dashboard</a><BreadcrumbChevron /><a href="/returns">Returns</a><BreadcrumbChevron /><span aria-current="page">{label}</span></nav>; }
function BreadcrumbChevron() { return <ChevronRight className="gst-breadcrumb-chevron" aria-hidden="true" />; }

function ReturnTaskCard({ variant, label, title, description, buttonLabel, onClick }: { variant: "outward" | "ims" | "gstr3b"; label: string; title: string; description: string; buttonLabel: string; onClick: () => void }) {
  return <article className={`gst-return-task gst-return-task-${variant}`}>
    <div className="gst-return-task-content">
      <p className="gst-return-task-kicker">{label}</p>
      <h4>{title}</h4>
      <p>{description}</p>
    </div>
    <Button size="sm" onClick={onClick}>{buttonLabel}</Button>
  </article>;
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
      <div><button className="gst-return-change-period" onClick={onBack}>Back to return workspace</button>{filedArn ? <StatusBadge tone="success">Filed · {filedArn}</StatusBadge> : <Button size="sm" disabled={busy || !canFile} onClick={onFile}>{canFile ? "File GSTR-3B" : "Complete GSTR-1 & IMS to file"}</Button>}</div>
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
const taxAmounts = (row: OutwardTableRow) => {
  if (row.kind === "einvoice") {
    const line = row.invoice.gstr1_document_lines[0];
    return { igst: line?.igst ?? 0, sgst: line?.sgst_utgst ?? 0, cgst: line?.cgst ?? 0, cess: line?.cess ?? 0 };
  }
  return { igst: row.invoice.igst, sgst: row.invoice.sgst_utgst, cgst: row.invoice.cgst, cess: row.invoice.cess };
};

function OutwardView({ data, busyAction, error, onImport, onUpload, onUploadSample, onUpdate, onRemove, onSubmit }: { data: OutwardData; busyAction: string | null; error?: string; onImport: () => void; onUpload: (event: React.FormEvent<HTMLFormElement>) => Promise<boolean>; onUploadSample: () => Promise<boolean>; onUpdate: (source: "EINVOICE" | "ERP", invoiceId: string, values: { category?: string; documentNumber?: string; recipientName?: string }) => Promise<boolean>; onRemove: (source: "EINVOICE" | "ERP", invoiceId: string) => void; onSubmit: () => void }) {
  const [category, setCategory] = useState<"all" | OutwardCategory>("all");
  const [source, setSource] = useState<"all" | "EINVOICE" | "ERP">("all");
  const [tab, setTab] = useState<"einvoice" | "erp" | "review">("einvoice");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editing, setEditing] = useState<OutwardTableRow>();
  const [removing, setRemoving] = useState<OutwardTableRow>();
  const [pendingCategory, setPendingCategory] = useState<{ row: OutwardTableRow; category: OutwardCategory }>();
  const [filingReviewOpen, setFilingReviewOpen] = useState(false);
  const [table13Open, setTable13Open] = useState(false);
  const [hsnSummaryOpen, setHsnSummaryOpen] = useState(false);
  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const [visibleRows, setVisibleRows] = useState(30);
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const eInvoices: OutwardTableRow[] = data.documents.map((invoice) => ({ kind: "einvoice", invoice, category: (invoice.gstr1_category as OutwardCategory | null) ?? categoryForDocument(invoice) }));
  const erpInvoices: OutwardTableRow[] = data.erp_rows.map((invoice) => ({ kind: "erp", invoice, category: (invoice.gstr1_category as OutwardCategory | null) ?? categoryForErp(invoice) }));
  // Review contains every reconciliation exception: one-sided invoices and
  // paired records with a field or amount difference. Exact matches stay out.
  const needsReview = (status: OutwardReconciliation["status"]) => status !== "MATCHED";
  const reviewInvoices = [...eInvoices.filter((row) => { const result = data.reconciliation_results.find((item) => item.einvoice_document_id === row.invoice.id); return result && needsReview(result.status); }), ...erpInvoices.filter((row) => { const result = data.reconciliation_results.find((item) => item.erp_invoice_row_id === row.invoice.id); return result && needsReview(result.status); })];
  const groups = { einvoice: eInvoices, erp: erpInvoices, review: reviewInvoices };
  const invoices = groups[tab];
  const filtered = invoices.filter((item) => (category === "all" || item.category === category) && (source === "all" || (source === "EINVOICE" ? item.kind === "einvoice" : item.kind === "erp")));
  const comparisonFor = (row: OutwardTableRow) => data.reconciliation_results.find((result) => row.kind === "einvoice" ? result.einvoice_document_id === row.invoice.id : result.erp_invoice_row_id === row.invoice.id);
  const displayed = filtered.slice(0, visibleRows);
  const importBusy = busyAction === "import-irn";
  const updateBusy = Boolean(busyAction?.startsWith("outward-edit-"));
  const removeBusy = Boolean(busyAction?.startsWith("outward-remove-"));
  const resetTableScroll = () => { setVisibleRows(30); tableScrollRef.current?.scrollTo({ top: 0 }); };
  const changeSource = (value: "all" | "EINVOICE" | "ERP") => {
    setSource(value);
    if (value === "EINVOICE") setTab("einvoice");
    if (value === "ERP") setTab("erp");
    resetTableScroll();
  };
  const loadMoreOnScroll = () => {
    const element = tableScrollRef.current;
    if (element && element.scrollTop + element.clientHeight >= element.scrollHeight - 80) setVisibleRows((count) => Math.min(count + 30, filtered.length));
  };
  if (finalizeOpen) return <Gstr1Finalize onBack={() => setFinalizeOpen(false)} />;
  if (hsnSummaryOpen) return <Gstr1HsnSummary onBack={() => setHsnSummaryOpen(false)} onNext={() => setFinalizeOpen(true)} />;
  if (table13Open) return <Gstr1Table13 data={data} onBack={() => setTable13Open(false)} onNext={() => setHsnSummaryOpen(true)} />;
  if (filingReviewOpen) return <Gstr1FilingReview data={data} busy={busyAction === "file-gstr1"} onBack={() => setFilingReviewOpen(false)} onSubmit={() => setTable13Open(true)} />;
  return <section className="gst-ims-review is-reference-layout gst-gstr1-filing">
    <nav className="gst-gstr1-progress" aria-label="GSTR-1 filing progress">
      <ol>
        {[
          "GSTR1 Filing",
          "Review GSTR1",
          "Table 13",
          "Review HSN summary",
          "Finalize GSTR 1",
        ].map((stage, index) => <li key={stage} className={index === 0 ? "is-current" : undefined} aria-current={index === 0 ? "step" : undefined}><div className="gst-gstr1-progress-marker"><span aria-hidden="true">{index + 1}</span></div><p>{stage}</p></li>)}
      </ol>
    </nav>
    <header className="gst-ims-review-head"><div><h2>GSTR1 invoices</h2><span>Import, categorise and reconcile your sales invoices in one place.</span></div><div className="gst-gstr1-header-actions"><Button type="button" size="sm" onClick={() => setFilingReviewOpen(true)}>Review GSTR1</Button></div></header>
    <div className="gst-gstr1-toolbar"><DropdownSelect ariaLabel="GSTR-1 category" value={category} onValueChange={(value) => { setCategory(value as "all" | OutwardCategory); resetTableScroll(); }} options={[{ value: "all", label: "All categories" }, ...outwardCategories.map((item) => ({ value: item, label: item }))]} /><DropdownSelect ariaLabel="Invoice source" value={source} onValueChange={(value) => changeSource(value as "all" | "EINVOICE" | "ERP")} options={[{ value: "all", label: "All sources" }, { value: "ERP", label: "ERP" }, { value: "EINVOICE", label: "E-invoice" }]} /><div className="gst-gstr1-toolbar-actions"><Button variant="outline" size="sm" onClick={() => setUploadOpen(true)} disabled={data.return.status === "FILED"}><Upload />Import ERP Invoices</Button><Button size="sm" onClick={onImport} disabled={importBusy || data.return.status === "FILED"}>{importBusy ? "Importing E-invoice" : "Import E-invoice"}</Button></div></div>
    <nav className="gst-ims-tabs gst-ims-workflow-tabs gst-gstr1-tabs" role="tablist" aria-label="GSTR-1 invoice sources">{(["einvoice", "erp", "review"] as const).map((item) => <button key={item} type="button" role="tab" aria-selected={tab === item} className={tab === item ? "is-active" : undefined} onClick={() => { setTab(item); resetTableScroll(); }}>{item === "einvoice" ? "E-invoice" : item[0].toUpperCase() + item.slice(1)}<span>{groups[item].length}</span></button>)}</nav>
    <div className="gst-ims-stage gst-gstr1-stage"><div className="gst-ims-table-wrap gst-gstr1-scroll" ref={tableScrollRef} onScroll={loadMoreOnScroll}><table className="gst-ims-table gst-ims-reference-table gst-gstr1-table"><colgroup><col className="gst-gstr1-invoice-col" /><col className="gst-gstr1-customer-col" /><col className="gst-gstr1-category-col" /><col className="gst-gstr1-tax-col" /><col className="gst-gstr1-tax-col" /><col className="gst-gstr1-tax-col" /><col className="gst-gstr1-tax-col" /><col className="gst-gstr1-source-col" /><col className="gst-gstr1-actions-col" /></colgroup><thead><tr><th rowSpan={2}>Invoice</th><th rowSpan={2}>Customer</th><th rowSpan={2}>Category</th><th colSpan={4} className="gst-gstr1-tax-heading">Tax</th><th rowSpan={2}>Status</th><th rowSpan={2}><span className="sr-only">Actions</span></th></tr><tr><th>IGST</th><th>SGST</th><th>CGST</th><th>CESS</th></tr></thead><tbody>{displayed.length ? displayed.map((row) => { const invoice = row.invoice; const amounts = taxAmounts(row); const comparison = comparisonFor(row); const sourceLabel = !comparison ? row.kind === "erp" ? "ERP" : "IRP" : comparison.status === "MATCHED" ? "MATCHED" : comparison.status === "ERP_ONLY" ? "ERP" : comparison.status === "EINVOICE_ONLY" ? "IRP" : "MISMATCH"; const badgeTone = !comparison ? "neutral" : comparison.status === "MATCHED" ? "success" : "warning"; return <tr key={`${row.kind}-${invoice.id}`}><th><span>{invoice.document_number}</span><small>{prettyDate(invoice.document_date)}</small></th><td><span>{invoice.recipient_name || "Walk-in customer"}</span><small className="gst-invoice-gstin">{invoice.recipient_gstin || "—"}</small></td><td className="gst-invoice-category"><DropdownSelect ariaLabel={`Category for ${invoice.document_number}`} value={row.category} disabled={data.return.status === "FILED"} onValueChange={(value) => { if (value !== row.category) setPendingCategory({ row, category: value as OutwardCategory }); }} options={outwardCategories.map((item) => ({ value: item, label: item }))} /></td><td className="gst-money-cell">{money(amounts.igst)}</td><td className="gst-money-cell">{money(amounts.sgst)}</td><td className="gst-money-cell">{money(amounts.cgst)}</td><td className="gst-money-cell">{money(amounts.cess)}</td><td><StatusBadge tone={badgeTone} showIcon={false}>{sourceLabel}</StatusBadge></td><td><div className="gst-gstr1-row-actions"><Button variant="outline" size="icon" aria-label={`Edit ${invoice.document_number}`} title="Edit invoice" disabled={data.return.status === "FILED"} onClick={() => setEditing(row)}><Pencil /></Button><Button variant="outline" size="icon" aria-label={`Remove ${invoice.document_number}`} title="Remove invoice" disabled={data.return.status === "FILED"} onClick={() => setRemoving(row)}><X /></Button></div></td></tr>; }) : <tr><td colSpan={9} className="gst-invoice-empty">No reconciliation exceptions match the selected filters.</td></tr>}</tbody></table>{displayed.length < filtered.length ? <p className="gst-gstr1-load-more">Scroll to load more invoices</p> : null}</div></div>
    {pendingCategory ? <div className="gst-confirmation-backdrop" role="presentation"><section className="gst-confirmation-modal" role="dialog" aria-modal="true" aria-labelledby="change-category-heading"><p className="gst-returns-kicker">Confirm category change</p><h3 id="change-category-heading">Change this invoice category?</h3><p>{pendingCategory.row.invoice.document_number} will move from “{pendingCategory.row.category}” to “{pendingCategory.category}”.</p><div><button className="gst-confirmation-cancel" type="button" onClick={() => setPendingCategory(undefined)}>Cancel</button><Button type="button" size="sm" disabled={updateBusy} onClick={async () => { const change = pendingCategory; setPendingCategory(undefined); await onUpdate(change.row.kind === "einvoice" ? "EINVOICE" : "ERP", change.row.invoice.id, { category: change.category }); }}>Confirm change</Button></div></section></div> : null}
    {editing ? <InvoiceEditModal row={editing} busy={updateBusy} onClose={() => setEditing(undefined)} onSave={async (values) => { if (await onUpdate(editing.kind === "einvoice" ? "EINVOICE" : "ERP", editing.invoice.id, values)) setEditing(undefined); }} /> : null}
    {removing ? <div className="gst-confirmation-backdrop" role="presentation"><section className="gst-confirmation-modal" role="dialog" aria-modal="true" aria-labelledby="remove-outward-heading"><p className="gst-returns-kicker">Confirm removal</p><h3 id="remove-outward-heading">Remove this invoice?</h3><p>{removing.invoice.document_number} will be removed from this GSTR1 workspace.</p><div><button className="gst-confirmation-cancel" type="button" onClick={() => setRemoving(undefined)}>Cancel</button><Button type="button" size="sm" disabled={removeBusy} onClick={() => { onRemove(removing.kind === "einvoice" ? "EINVOICE" : "ERP", removing.invoice.id); setRemoving(undefined); }}>Remove invoice</Button></div></section></div> : null}
    {uploadOpen ? <div className="gst-confirmation-backdrop" role="presentation"><section className="gst-confirmation-modal gst-upload-modal" role="dialog" aria-modal="true" aria-labelledby="outward-upload-heading"><p className="gst-returns-kicker">ERP data import</p><h3 id="outward-upload-heading">Import ERP invoices</h3><p>Choose a sales ERP CSV to add it to this GSTR1 workspace and reconcile it with your e-invoices.</p><section className="gst-demo-upload-card"><div><strong>Try sample ERP data</strong><p>Import six sample sales invoices: three matched and three ERP-only invoices.</p></div><Button type="button" variant="outline" size="sm" disabled={busyAction === "upload-outward"} onClick={async () => { if (await onUploadSample()) setUploadOpen(false); }}>Use sample file</Button></section><form className="gst-ims-upload-form" onSubmit={async (event) => { if (await onUpload(event)) setUploadOpen(false); }}><label><span>ERP CSV file</span><input name="file" type="file" accept=".csv,text/csv" required disabled={busyAction === "upload-outward"} /></label>{error ? <p className="gst-ims-upload-error" role="alert">{error}</p> : null}<div><button className="gst-confirmation-cancel" type="button" onClick={() => setUploadOpen(false)}>Cancel</button><Button type="submit" size="sm" disabled={busyAction === "upload-outward"}>{busyAction === "upload-outward" ? "Importing" : "Import ERP invoices"}</Button></div></form></section></div> : null}
  </section>;
}

function Gstr1FilingReview({ data, busy, onBack, onSubmit }: { data: OutwardData; busy: boolean; onBack: () => void; onSubmit: () => void }) {
  const irpRows: OutwardTableRow[] = data.documents.map((invoice) => ({ kind: "einvoice", invoice, category: (invoice.gstr1_category as OutwardCategory | null) ?? categoryForDocument(invoice) }));
  const erpRows: OutwardTableRow[] = data.erp_rows.map((invoice) => ({ kind: "erp", invoice, category: (invoice.gstr1_category as OutwardCategory | null) ?? categoryForErp(invoice) }));
  const reconciliationFor = (row: OutwardTableRow) => data.reconciliation_results.find((result) => row.kind === "einvoice" ? result.einvoice_document_id === row.invoice.id : result.erp_invoice_row_id === row.invoice.id);
  // The e-invoice remains the final record for matched and mismatched pairs.
  // Add only ERP-only records so a reconciliation pair is never filed twice.
  const finalRows = [...irpRows, ...erpRows.filter((row) => { const result = reconciliationFor(row); return !result || result.status === "ERP_ONLY"; })];
  const [category, setCategory] = useState<OutwardCategory>(outwardCategories[0]);
  const categoryRows = finalRows.filter((row) => row.category === category);
  return <section className="gst-ims-review is-reference-layout gst-gstr1-filing-review">
    <nav className="gst-gstr1-progress" aria-label="GSTR-1 filing progress"><ol>{["GSTR1 Filing", "Review GSTR1", "Table 13", "Review HSN summary", "Finalize GSTR 1"].map((stage, index) => <li key={stage} className={index <= 1 ? "is-current" : undefined} aria-current={index === 1 ? "step" : undefined}><div className="gst-gstr1-progress-marker"><span aria-hidden="true">{index + 1}</span></div><p>{stage}</p></li>)}</ol></nav>
    <header className="gst-ims-review-head"><div><h2>GSTR1 Filing</h2><span>Review the final invoice data before submitting this return.</span></div><div className="gst-gstr1-header-actions"><Button type="button" variant="outline" size="sm" onClick={onBack}>Back</Button>{data.return.status === "FILED" ? <StatusBadge tone="success">Submitted</StatusBadge> : <Button type="button" size="sm" disabled={busy} onClick={onSubmit}>{busy ? "Submitting" : "Submit"}</Button>}</div></header>
    <nav className="gst-ims-tabs gst-ims-workflow-tabs gst-gstr1-tabs gst-gstr1-category-pills" role="tablist" aria-label="GSTR-1 categories">{outwardCategories.map((item) => <button key={item} type="button" role="tab" aria-selected={category === item} className={category === item ? "is-active" : undefined} onClick={() => setCategory(item)}><span>{item}</span><strong>{finalRows.filter((row) => row.category === item).length}</strong></button>)}</nav>
    <div className="gst-ims-stage gst-gstr1-stage"><div className="gst-ims-table-wrap gst-gstr1-scroll"><table className="gst-ims-table gst-ims-reference-table gst-gstr1-table gst-gstr1-filing-table"><colgroup><col className="gst-gstr1-invoice-col" /><col className="gst-gstr1-customer-col" /><col className="gst-gstr1-tax-col" /><col className="gst-gstr1-tax-col" /><col className="gst-gstr1-tax-col" /><col className="gst-gstr1-tax-col" /><col className="gst-gstr1-source-col" /></colgroup><thead><tr><th rowSpan={2}>Invoice</th><th rowSpan={2}>Customer</th><th colSpan={4} className="gst-gstr1-tax-heading">Tax</th><th rowSpan={2}>Source</th></tr><tr><th>IGST</th><th>SGST</th><th>CGST</th><th>CESS</th></tr></thead><tbody>{categoryRows.length ? categoryRows.map((row) => { const invoice = row.invoice; const amounts = taxAmounts(row); const source = row.kind === "erp" ? "ERP" : row.invoice.is_irp_edited ? "IRP Edited" : "IRP"; const tone = source === "IRP" ? "success" : source === "ERP" ? "neutral" : "warning"; return <tr key={`${row.kind}-${invoice.id}`}><th><span>{invoice.document_number}</span><small>{prettyDate(invoice.document_date)}{row.kind === "einvoice" && row.invoice.irn ? ` · IRN ${row.invoice.irn.slice(-8)}` : ""}</small></th><td><span>{invoice.recipient_name || "Walk-in customer"}</span><small className="gst-invoice-gstin">{invoice.recipient_gstin || "—"}</small></td><td className="gst-money-cell">{money(amounts.igst)}</td><td className="gst-money-cell">{money(amounts.sgst)}</td><td className="gst-money-cell">{money(amounts.cgst)}</td><td className="gst-money-cell">{money(amounts.cess)}</td><td><StatusBadge tone={tone} showIcon={false}>{source}</StatusBadge></td></tr>; }) : <tr><td colSpan={7} className="gst-invoice-empty">No final invoices are available for this category.</td></tr>}</tbody></table></div></div>
  </section>;
}

function Gstr1Table13({ data, onBack, onNext }: { data: OutwardData; onBack: () => void; onNext: () => void }) {
  const irpRows: OutwardTableRow[] = data.documents.map((invoice) => ({ kind: "einvoice", invoice, category: (invoice.gstr1_category as OutwardCategory | null) ?? categoryForDocument(invoice) }));
  const erpRows: OutwardTableRow[] = data.erp_rows.map((invoice) => ({ kind: "erp", invoice, category: (invoice.gstr1_category as OutwardCategory | null) ?? categoryForErp(invoice) }));
  const linkedErp = new Set(data.reconciliation_results.filter((result) => result.status !== "ERP_ONLY").map((result) => result.erp_invoice_row_id).filter(Boolean));
  const rows = [...irpRows, ...erpRows.filter((row) => !linkedErp.has(row.invoice.id))];
  const series = Array.from(rows.reduce((groups, row) => { const match = row.invoice.document_number.match(/^(.*?)(\d+)$/); if (!match) return groups; const [, prefix, serial] = match; const key = `${row.kind}:${prefix}:${serial.length}`; const group = groups.get(key) ?? { key, source: row.kind === "einvoice" ? "IRP" : "ERP", prefix, width: serial.length, numbers: new Set<number>() }; group.numbers.add(Number(serial)); groups.set(key, group); return groups; }, new Map<string, { key: string; source: "IRP" | "ERP"; prefix: string; width: number; numbers: Set<number> }>()).values()).map((group) => { const numbers = [...group.numbers].sort((a, b) => a - b); const missing = numbers.length && numbers[numbers.length - 1] - numbers[0] < 500 ? Array.from({ length: numbers[numbers.length - 1] - numbers[0] + 1 }, (_, index) => numbers[0] + index).filter((number) => !group.numbers.has(number)) : []; const format = (number: number) => `${group.prefix}${String(number).padStart(group.width, "0")}`; return { ...group, start: format(numbers[0]), end: format(numbers[numbers.length - 1]), total: numbers.length, missing: missing.map(format) }; });
  const [reasons, setReasons] = useState<Record<string, { type: "CANCELLED" | "OTHER"; detail: string }>>({});
  const gaps = series.flatMap((group) => group.missing.map((number) => ({ number, source: group.source })));
  const seriesCards = (source: "IRP" | "ERP") => series.filter((group) => group.source === source).map((group) => <article key={group.key}><strong>{group.prefix || "Document"}</strong><dl><div><dt>Start number</dt><dd><input aria-label={`${group.source} start number`} value={group.start} disabled /></dd></div><div><dt>End number</dt><dd><input aria-label={`${group.source} end number`} value={group.end} disabled /></dd></div><div><dt>Total invoices</dt><dd><input aria-label={`${group.source} total invoices`} value={group.total} disabled /></dd></div></dl></article>);
  return <section className="gst-ims-review is-reference-layout gst-gstr1-filing-review"><nav className="gst-gstr1-progress" aria-label="GSTR-1 filing progress"><ol>{["GSTR1 Filing", "Review GSTR1", "Table 13", "Review HSN summary", "Finalize GSTR 1"].map((stage, index) => <li key={stage} className={index <= 2 ? "is-current" : undefined} aria-current={index === 2 ? "step" : undefined}><div className="gst-gstr1-progress-marker"><span aria-hidden="true">{index + 1}</span></div><p>{stage}</p></li>)}</ol></nav><header className="gst-ims-review-head"><div><h2>Table 13 · Documents Issued</h2><span>Document series are calculated from the final GSTR1 invoice data.</span></div><div className="gst-gstr1-header-actions"><Button type="button" variant="outline" size="sm" onClick={onBack}>Back</Button><Button type="button" size="sm" onClick={onNext}>Next</Button></div></header><section className="gst-table13-series"><h2>E-Invoice document series</h2><div>{seriesCards("IRP")}</div></section><section className="gst-table13-series"><h2>ERP Document Series</h2><div>{seriesCards("ERP")}</div></section>{gaps.length ? <section className="gst-table13-gaps"><h3>Missing document numbers</h3><p>Provide a reason for each gap before filing.</p><div className="gst-ims-table-wrap"><table className="gst-ims-table"><thead><tr><th>Document number</th><th>Source</th><th>Reason</th><th>Details</th></tr></thead><tbody>{gaps.map((gap) => { const reason = reasons[gap.number]; return <tr key={gap.number}><th>{gap.number}</th><td><StatusBadge tone={gap.source === "IRP" ? "success" : "neutral"} showIcon={false}>{gap.source}</StatusBadge></td><td><DropdownSelect ariaLabel={`Reason for ${gap.number}`} value={reason?.type ?? ""} onValueChange={(type) => setReasons((current) => ({ ...current, [gap.number]: { type: type as "CANCELLED" | "OTHER", detail: current[gap.number]?.detail ?? "" } }))} options={[{ value: "", label: "Select reason" }, { value: "CANCELLED", label: "Cancelled invoice" }, { value: "OTHER", label: "Other" }]} /></td><td>{reason?.type === "OTHER" ? <input aria-label={`Other reason for ${gap.number}`} value={reason.detail} onChange={(event) => setReasons((current) => ({ ...current, [gap.number]: { ...current[gap.number], type: "OTHER", detail: event.target.value } }))} placeholder="Enter reason" /> : "—"}</td></tr>; })}</tbody></table></div></section> : <p className="gst-table13-empty">No missing invoice numbers were found in the final IRP or ERP document series.</p>}</section>;
}

function Gstr1HsnSummary({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  const rows = [
    { hsn: "847130", quantity: 12, unit: "NOS", taxable: 729000, rate: "18%", igst: 131220, sgst: 0, cgst: 0 },
    { hsn: "998314", quantity: 3, unit: "OTH", taxable: 811000, rate: "18%", igst: 145980, sgst: 0, cgst: 0 },
    { hsn: "730890", quantity: 8, unit: "NOS", taxable: 120000, rate: "18%", igst: 0, sgst: 10800, cgst: 10800 },
    { hsn: "854411", quantity: 4, unit: "NOS", taxable: 75000, rate: "18%", igst: 13500, sgst: 0, cgst: 0 },
    { hsn: "850440", quantity: 6, unit: "NOS", taxable: 95000, rate: "18%", igst: 17100, sgst: 0, cgst: 0 },
  ];
  return <section className="gst-ims-review is-reference-layout gst-gstr1-filing-review"><nav className="gst-gstr1-progress" aria-label="GSTR-1 filing progress"><ol>{["GSTR1 Filing", "Review GSTR1", "Table 13", "Review HSN summary", "Finalize GSTR 1"].map((stage, index) => <li key={stage} className={index <= 3 ? "is-current" : undefined} aria-current={index === 3 ? "step" : undefined}><div className="gst-gstr1-progress-marker"><span aria-hidden="true">{index + 1}</span></div><p>{stage}</p></li>)}</ol></nav><header className="gst-ims-review-head"><div><h2>HSN Summary</h2><span>August invoice values grouped by HSN code.</span></div><div className="gst-gstr1-header-actions"><Button type="button" variant="outline" size="sm" onClick={onBack}>Back</Button><Button type="button" size="sm" onClick={onNext}>Next</Button></div></header><div className="gst-ims-stage gst-gstr1-stage"><div className="gst-ims-table-wrap"><table className="gst-ims-table gst-ims-reference-table gst-hsn-summary-table"><thead><tr><th>HSN code</th><th>Quantity</th><th>Unit</th><th>Total taxable value</th><th>Tax percentage</th><th>Integrated tax</th><th>State tax</th><th>Central tax</th></tr></thead><tbody>{rows.map((row) => <tr key={row.hsn}><th>{row.hsn}</th><td>{row.quantity}</td><td>{row.unit}</td><td className="gst-money-cell">{money(row.taxable)}</td><td>{row.rate}</td><td className="gst-money-cell">{money(row.igst)}</td><td className="gst-money-cell">{money(row.sgst)}</td><td className="gst-money-cell">{money(row.cgst)}</td></tr>)}</tbody></table></div></div></section>;
}

function Gstr1Finalize({ onBack }: { onBack: () => void }) {
  const sales = [
    ["Sales taxable 12%", 0, 0, 0, 0], ["Sales taxable 18%", 120000, 10800, 10800, 0], ["Sales taxable 28%", 0, 0, 0, 0],
    ["Sales taxable IGST 28%", 0, 0, 0, 0], ["Sales taxable IGST 18%", 1710000, 0, 0, 307800], ["Sale taxable 5%", 0, 0, 0, 0], ["Sale export", 0, 0, 0, 0],
  ] as const;
  const totals = sales.reduce((total, [, net, cgst, sgst, igst]) => ({ net: total.net + net, cgst: total.cgst + cgst, sgst: total.sgst + sgst, igst: total.igst + igst }), { net: 0, cgst: 0, sgst: 0, igst: 0 });
  const taxSummary = [["IGST", totals.igst], ["SGST", totals.sgst], ["CGST", totals.cgst], ["CESS", 0]] as const;
  return <section className="gst-ims-review is-reference-layout gst-gstr1-filing-review"><nav className="gst-gstr1-progress" aria-label="GSTR-1 filing progress"><ol>{["GSTR1 Filing", "Review GSTR1", "Table 13", "Review HSN summary", "Finalize GSTR 1"].map((stage, index) => <li key={stage} className="is-current" aria-current={index === 4 ? "step" : undefined}><div className="gst-gstr1-progress-marker"><span aria-hidden="true">{index + 1}</span></div><p>{stage}</p></li>)}</ol></nav><header className="gst-ims-review-head"><div><h2>Finalize GSTR1</h2><span>Review the August sales tax summary before final filing.</span></div><div className="gst-gstr1-header-actions"><Button type="button" variant="outline" size="sm" onClick={onBack}>Back</Button><Button type="button" size="sm">Submit GSTR1</Button></div></header><section className="gst-final-tax-summary"><h2>Table 1 · Tax Summary</h2><div>{taxSummary.map(([label, value]) => <article key={label}><span>{label}</span><strong>{money(value)}</strong></article>)}</div></section><section className="gst-final-sales-summary"><h2>Table 2 · Sales Summary</h2><div className="gst-ims-table-wrap"><table className="gst-ims-table gst-ims-reference-table"><thead><tr><th>Sales</th><th>Net</th><th>CGST</th><th>SGST</th><th>IGST</th><th>Total GST</th><th>Gross Total</th></tr></thead><tbody>{sales.map(([label, net, cgst, sgst, igst]) => <tr key={label}><th>{label}</th><td className="gst-money-cell">{money(net)}</td><td className="gst-money-cell">{money(cgst)}</td><td className="gst-money-cell">{money(sgst)}</td><td className="gst-money-cell">{money(igst)}</td><td className="gst-money-cell">{money(cgst + sgst + igst)}</td><td className="gst-money-cell">{money(net + cgst + sgst + igst)}</td></tr>)}<tr className="gst-final-total"><th>Total A</th><td className="gst-money-cell">{money(totals.net)}</td><td className="gst-money-cell">{money(totals.cgst)}</td><td className="gst-money-cell">{money(totals.sgst)}</td><td className="gst-money-cell">{money(totals.igst)}</td><td className="gst-money-cell">{money(totals.cgst + totals.sgst + totals.igst)}</td><td className="gst-money-cell">{money(totals.net + totals.cgst + totals.sgst + totals.igst)}</td></tr></tbody></table></div></section></section>;
}

function InvoiceEditModal({ row, busy, onClose, onSave }: { row: OutwardTableRow; busy: boolean; onClose: () => void; onSave: (values: { documentNumber: string; recipientName: string; category: string }) => Promise<void> }) {
  const [documentNumber, setDocumentNumber] = useState(row.invoice.document_number);
  const [recipientName, setRecipientName] = useState(row.invoice.recipient_name ?? "");
  const [category, setCategory] = useState(row.category);
  return <div className="gst-confirmation-backdrop" role="presentation"><section className="gst-confirmation-modal gst-upload-modal" role="dialog" aria-modal="true" aria-labelledby="edit-outward-heading"><p className="gst-returns-kicker">Edit invoice</p><h3 id="edit-outward-heading">Update {row.invoice.document_number}</h3><form className="gst-ims-upload-form" onSubmit={(event) => { event.preventDefault(); void onSave({ documentNumber, recipientName, category }); }}><label><span>Invoice number</span><input value={documentNumber} onChange={(event) => setDocumentNumber(event.target.value)} required /></label><label><span>Customer</span><input value={recipientName} onChange={(event) => setRecipientName(event.target.value)} /></label><label><span>Category</span><DropdownSelect ariaLabel="Invoice category" value={category} onValueChange={(value) => setCategory(value as OutwardCategory)} options={outwardCategories.map((item) => ({ value: item, label: item }))} /></label><div><button className="gst-confirmation-cancel" type="button" onClick={onClose}>Cancel</button><Button type="submit" size="sm" disabled={busy}>{busy ? "Saving" : "Save changes"}</Button></div></form></section></div>;
}

function ImsView({ data, busyAction, error, onUpload, onDecide, onCounterpartyCheck }: { data: ImsData; busyAction: string | null; error?: string; onUpload: (event: React.FormEvent<HTMLFormElement>) => Promise<boolean>; onDecide: (id: string, status: ImsDecision["status"]) => void; onCounterpartyCheck: (erpInvoiceRowId: string, followUpRemark: string) => void }) {
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
  const uploadBusy = busyAction === "upload-ims";
  const decisionBusy = Boolean(busyAction?.startsWith("decision-"));
  const counterpartyBusy = Boolean(busyAction?.startsWith("counterparty-"));
  return <section className="gst-ims-review is-reference-layout">
    <nav className="gst-ims-progress" aria-label="GSTR-2 filing progress"><ol>{["GSTR-2A", "GSTR-2B", "ERP Pending Invoice"].map((stage, index) => <li key={stage} className={index === 0 ? "is-current" : undefined} aria-current={index === 0 ? "step" : undefined}><div className="gst-ims-progress-marker"><span aria-hidden="true">{index + 1}</span></div><p>{stage}</p></li>)}</ol></nav>
    <header className="gst-ims-review-head"><div><p>Inward supplies</p><h2>Manage Inward Supplies</h2><span>See what GST has received, compare it with your purchase invoices, and resolve only the exceptions that need your attention.</span></div><div className="gst-ims-header-actions"><Button className="gst-upload-erp-button" type="button" variant="outline" size="sm" onClick={() => setUploadOpen(true)}><Upload />ERP Purchase Invoice</Button><Button className="gst-ims-submit-button" type="button" size="sm">Submit GSTR-2B</Button></div></header>
    <nav className="gst-ims-tabs gst-ims-workflow-tabs" role="tablist" aria-label="Inward supply workflow">{(["gstr2a", "review", "to-check", "finalised"] as const).map((item) => <button key={item} type="button" role="tab" aria-selected={tab === item} className={tab === item ? "is-active" : undefined} onClick={() => setTab(item)}>{item === "gstr2a" ? "GSTR-2A" : item === "to-check" ? "To Check" : item[0].toUpperCase() + item.slice(1)}<span>{groups[item].length}</span></button>)}</nav>
    {tab === "gstr2a" ? <InvoiceTable invoices={groups.gstr2a} title="Invoices received through GSTR-2A" /> : null}
    {tab === "review" ? <ReviewTable invoices={groups.review} results={results} erp={erp} decisions={decisions} busy={decisionBusy} onAccept={(invoice) => onDecide(invoice.id, "ACCEPTED")} onReject={setRejecting} /> : null}
    {tab === "to-check" ? <ToCheckTable invoices={groups["to-check"]} checks={checks} followUp={followUp} setFollowUp={setFollowUp} busy={counterpartyBusy} onCheck={onCounterpartyCheck} /> : null}
    {tab === "finalised" ? <ReviewTable invoices={groups.finalised} results={results} erp={erp} decisions={decisions} busy={decisionBusy} finalised onAccept={(invoice) => onDecide(invoice.id, "PENDING")} onReject={setRejecting} /> : null}
    {rejecting ? <div className="gst-confirmation-backdrop" role="presentation"><section className="gst-confirmation-modal" role="dialog" aria-modal="true" aria-labelledby="reject-heading"><p className="gst-returns-kicker">Confirm decision</p><h3 id="reject-heading">Reject this invoice?</h3><p>{rejecting.invoice_number} from {rejecting.supplier_name} ({rejecting.supplier_gstin}) will be moved to Finalised.</p><div><button className="gst-confirmation-cancel" type="button" onClick={() => setRejecting(undefined)}>Cancel</button><Button type="button" size="sm" onClick={() => { onDecide(rejecting.id, "REJECTED"); setRejecting(undefined); }}>Reject invoice</Button></div></section></div> : null}
    {uploadOpen ? <div className="gst-confirmation-backdrop" role="presentation"><section className="gst-confirmation-modal gst-upload-modal" role="dialog" aria-modal="true" aria-labelledby="erp-upload-heading"><p className="gst-returns-kicker">ERP data import</p><h3 id="erp-upload-heading">Upload purchase ERP CSV</h3><p>Use the sample format. Every row must include invoice value, taxable value, IGST, CGST, SGST/UTGST and cess.</p><a className="gst-ims-template-link" href="/templates/ims-erp-upload-sample.csv" download>Download sample CSV</a><form className="gst-ims-upload-form" onSubmit={async (event) => { if (await onUpload(event)) setUploadOpen(false); }}><label><span>ERP CSV file</span><input name="file" type="file" accept=".csv,text/csv" required disabled={uploadBusy} /></label>{error ? <p className="gst-ims-upload-error" role="alert">{error}</p> : null}<div><button className="gst-confirmation-cancel" type="button" onClick={() => setUploadOpen(false)}>Cancel</button><Button type="submit" size="sm" disabled={uploadBusy}>{uploadBusy ? "Uploading" : "Import & reconcile"}</Button></div></form></section></div> : null}
  </section>;
}

function InvoiceTable({ invoices, title }: { invoices: PortalInvoice[]; title: string }) { return <section className="gst-ims-stage"><p>{title}</p><div className="gst-ims-table-wrap"><table className="gst-ims-table gst-ims-reference-table"><thead><tr><th rowSpan={2}>Invoice</th><th rowSpan={2}>Date</th><th rowSpan={2}>Supplier / GSTIN</th><th rowSpan={2}>Taxable value</th><th colSpan={3}>Tax</th><th rowSpan={2}>Status</th></tr><tr><th>IGST</th><th>SGST/UTGST</th><th>CGST</th></tr></thead><tbody>{invoices.length ? invoices.map((invoice) => <tr key={invoice.id}><th>{invoice.invoice_number}</th><td>{prettyDate(invoice.invoice_date)}</td><td><span>{invoice.supplier_name}</span><small className="gst-invoice-gstin">{invoice.supplier_gstin}</small></td><td className="gst-money-cell">{money(invoice.taxable_value)}</td><td className="gst-money-cell">{money(invoice.igst)}</td><td className="gst-money-cell">{money(invoice.sgst_utgst)}</td><td className="gst-money-cell">{money(invoice.cgst)}</td><td><StatusBadge tone="warning">GSTR-2A</StatusBadge></td></tr>) : <tr><td colSpan={8} className="gst-invoice-empty">No GSTR-2A invoices are available for this period.</td></tr>}</tbody></table></div></section>; }
function ReviewTable({ invoices, results, erp, decisions, busy, onAccept, onReject, finalised = false }: { invoices: PortalInvoice[]; results: Map<string, MatchResult>; erp: Map<string, ErpInvoice>; decisions: Map<string, ImsDecision["status"]>; busy: boolean; onAccept: (invoice: PortalInvoice) => void; onReject: (invoice: PortalInvoice) => void; finalised?: boolean }) { return <section className="gst-ims-stage"><p>{finalised ? "Invoices with a recorded decision" : "Invoices needing a decision after automatic reconciliation"}</p><div className="gst-ims-table-wrap"><table className="gst-ims-table gst-ims-reference-table"><thead><tr><th rowSpan={2}>Invoice</th><th rowSpan={2}>Supplier / GSTIN</th><th rowSpan={2}>ERP comparison</th><th colSpan={3}>GST tax</th><th rowSpan={2}>Status</th><th rowSpan={2}>Action</th></tr><tr><th>IGST</th><th>SGST/UTGST</th><th>CGST</th></tr></thead><tbody>{invoices.length ? invoices.map((invoice) => { const result = results.get(invoice.id); const erpRow = result?.erp_invoice_row_id ? erp.get(result.erp_invoice_row_id) : undefined; const decision = decisions.get(invoice.id) ?? "PENDING"; const label = decision === "PENDING" ? "Pending" : decision === "ACCEPTED" ? "Accepted" : "Rejected"; return <tr key={invoice.id}><th>{invoice.invoice_number}<small>{prettyDate(invoice.invoice_date)}</small></th><td><span>{invoice.supplier_name}</span><small className="gst-invoice-gstin">{invoice.supplier_gstin}</small></td><td>{erpRow ? <span>Invoice {erpRow.invoice_number}<small>Taxable {money(erpRow.taxable_value)} · Tax {money(erpRow.tax_value)}</small></span> : "No matching ERP invoice"}</td><td className="gst-money-cell">{money(invoice.igst)}</td><td className="gst-money-cell">{money(invoice.sgst_utgst)}</td><td className="gst-money-cell">{money(invoice.cgst)}</td><td><StatusBadge tone={decision === "ACCEPTED" ? "success" : "warning"}>{label}</StatusBadge></td><td><div className="gst-ims-row-actions">{finalised ? <button disabled={busy} onClick={() => onAccept(invoice)}>Remove decision</button> : <><button disabled={busy} onClick={() => onAccept(invoice)}>Accept</button><button disabled={busy} onClick={() => onReject(invoice)}>Reject</button></>}</div></td></tr>; }) : <tr><td colSpan={8} className="gst-invoice-empty">{finalised ? "No invoices have been finalised yet." : "Upload ERP purchase invoices to begin reconciliation, or no invoices require review."}</td></tr>}</tbody></table></div></section>; }
function ToCheckTable({ invoices, checks, followUp, setFollowUp, busy, onCheck }: { invoices: ErpInvoice[]; checks: Map<string, RecentCheck>; followUp: Record<string, string>; setFollowUp: React.Dispatch<React.SetStateAction<Record<string, string>>>; busy: boolean; onCheck: (id: string, remark: string) => void }) { return <section className="gst-ims-stage"><p>Purchase invoices in your ERP that are not yet available in GSTR-2A. Follow up with the supplier before deciding what to do next.</p><div className="gst-ims-table-wrap"><table className="gst-ims-table gst-ims-reference-table"><thead><tr><th rowSpan={2}>ERP invoice</th><th rowSpan={2}>Supplier / GSTIN</th><th colSpan={3}>Tax</th><th rowSpan={2}>Follow-up note</th><th rowSpan={2}>Counterparty Check</th></tr><tr><th>IGST</th><th>SGST/UTGST</th><th>CGST</th></tr></thead><tbody>{invoices.length ? invoices.map((invoice) => { const check = checks.get(invoice.id); return <tr key={invoice.id}><th>{invoice.invoice_number}<small>{prettyDate(invoice.invoice_date)}</small></th><td><span>{invoice.supplier_name}</span><small className="gst-invoice-gstin">{invoice.supplier_gstin}</small></td><td className="gst-money-cell">{money(invoice.igst)}</td><td className="gst-money-cell">{money(invoice.sgst_utgst)}</td><td className="gst-money-cell">{money(invoice.cgst)}</td><td><textarea aria-label={`Follow-up note for ${invoice.invoice_number}`} value={followUp[invoice.id] ?? ""} onChange={(event) => setFollowUp((value) => ({ ...value, [invoice.id]: event.target.value }))} placeholder={check?.remarks ?? "Add a supplier follow-up note"} /></td><td><Button size="sm" disabled={busy} onClick={() => onCheck(invoice.id, followUp[invoice.id] ?? "")}>Counterparty Check</Button></td></tr>; }) : <tr><td colSpan={7} className="gst-invoice-empty">Every uploaded ERP purchase invoice has a corresponding GSTR-2A invoice.</td></tr>}</tbody></table></div></section>; }
