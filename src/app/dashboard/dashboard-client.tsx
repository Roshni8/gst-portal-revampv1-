"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GstServiceNavigation } from "@/components/gst-service-navigation";
import { PageLoadingSkeleton } from "@/components/page-loading-skeleton";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type Summary = { tax_period: string; taxable_value: number; igst: number; cgst: number; sgst: number; total_tax: number; status: string; filing_date: string | null; due_date: string | null };
type Filing = { return_type: string; tax_period: string; filing_date: string | null; status: string; due_date: string };
type DashboardData = { profile: { gstin: string; legal_name: string; trade_name: string | null }; monthly_summary: Summary[]; filing_history: Filing[] };

const money = (value: number) => `₹${Math.round(value).toLocaleString("en-IN")}`;
const periodLabel = (period: string) => new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric" }).format(new Date(Number(period.slice(2)), Number(period.slice(0, 2)) - 1, 1));
const dateLabel = (date: string) => new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(`${date}T00:00:00`));

function StatusPill({ children, tone = "success" }: { children: React.ReactNode; tone?: "success" | "warning" | "neutral" }) { return <span className={`gst-dashboard-pill is-${tone}`}>{children}</span>; }

export default function DashboardClient() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const client = getSupabaseBrowserClient();
      const { data: sessionData } = await client.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) { router.replace("/login"); return; }
      const headers = { Authorization: `Bearer ${token}` };
      let response = await fetch("/api/dashboard", { headers });
      if (response.status === 404) {
        const provision = await fetch("/api/profile/demo", { method: "POST", headers });
        if (provision.ok) response = await fetch("/api/dashboard", { headers });
      }
      if (!response.ok) throw new Error((await response.json().catch(() => ({})) as { error?: string }).error ?? "Unable to load the dashboard.");
      if (mounted) setData(await response.json() as DashboardData);
    })().catch((cause) => { if (mounted) setError(cause instanceof Error ? cause.message : "Unable to load the dashboard."); });
    return () => { mounted = false; };
  }, [router]);

  if (!data && !error) return <PageLoadingSkeleton />;
  if (!data) return <main className="gst-dashboard-page"><div className="gst-dashboard-error">{error}</div></main>;
  const openFilings = data.filing_history.filter((filing) => filing.status !== "Filed").slice(0, 4);

  return <main className="gst-dashboard-page">
    <GstServiceNavigation active="dashboard" company={data.profile.trade_name ?? data.profile.legal_name} gstin={data.profile.gstin} />
    <div className="gst-dashboard-container">
      <header className="gst-dashboard-heading"><div><p className="gst-dashboard-kicker">Taxpayer dashboard</p><h1>Monthly tax summary</h1><p>Taxable turnover and tax paid, month over month.</p></div></header>
      <section className="gst-dashboard-table-card" aria-labelledby="monthly-summary-title"><h2 id="monthly-summary-title" className="sr-only">Monthly tax summary</h2><div className="gst-dashboard-table-wrap"><table className="gst-dashboard-table"><thead><tr><th>Period</th><th>Taxable value</th><th>Integrated tax</th><th>Central tax</th><th>State/UT tax</th><th>Total tax paid</th><th>Status</th></tr></thead><tbody>{data.monthly_summary.map((item) => { const filed = item.status === "Filed"; return <tr key={item.tax_period} className={!filed ? "is-current" : ""}><th>{periodLabel(item.tax_period)}</th><td>{money(item.taxable_value)}</td><td>{money(item.igst)}</td><td>{money(item.cgst)}</td><td>{money(item.sgst)}</td><td className="gst-dashboard-total">{money(item.total_tax)}</td><td>{filed ? <StatusPill>Filed · {item.filing_date ? dateLabel(item.filing_date) : "Complete"}</StatusPill> : <StatusPill tone="warning">Due {item.due_date ? dateLabel(item.due_date) : "soon"}</StatusPill>}</td></tr>; })}</tbody></table></div></section>
      <section className="gst-dashboard-section" aria-labelledby="ledger-title"><h2 id="ledger-title">Your money with the government</h2><div className="gst-ledger-grid"><article className="gst-ledger-card"><h3>Cash ledger</h3><strong>₹3,10,000</strong><p>Money deposited by challan. Used for reverse charge and the 1% cash rule. Enough for about 2 months.</p></article><article className="gst-ledger-card"><h3>Credit ledger (ITC)</h3><strong>₹50,000</strong><p>Tax already paid on purchases. Grows when eligible purchase credits are available.</p></article><article className="gst-ledger-card is-refund"><h3>Refund you can claim now</h3><strong>₹17,211</strong><p>Part of your credit that the law allows back as cash. Last date to claim: 20-08-2028.</p><button type="button" onClick={() => router.push("/refunds")}>Start refund claim</button></article></div><p className="gst-ledger-disclaimer">Electronic ledger balances are illustrative prototype data.</p></section>
      <section className="gst-dashboard-section" aria-labelledby="due-dates-title"><h2 id="due-dates-title">Coming due dates</h2><div className="gst-dashboard-table-card"><div className="gst-dashboard-table-wrap"><table className="gst-dashboard-table gst-due-table"><thead><tr><th>Return / action</th><th>Period</th><th>Due date</th><th>Status</th></tr></thead><tbody>{openFilings.length ? openFilings.map((item) => <tr key={`${item.return_type}-${item.tax_period}`}><th><span>{item.return_type}</span><small>{item.return_type === "GSTR-3B" ? "Monthly summary and payment" : "Return filing"}</small></th><td>{periodLabel(item.tax_period)}</td><td>{dateLabel(item.due_date)}</td><td><StatusPill tone="warning">Not filed yet</StatusPill></td></tr>) : <tr><td colSpan={4} className="gst-dashboard-empty">No returns are currently awaiting filing.</td></tr>}</tbody></table></div></div></section>
    </div>
  </main>;
}
