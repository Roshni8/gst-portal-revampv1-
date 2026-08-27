"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type Tab = "profile" | "signatories" | "products";
type Row = Record<string, unknown>;
type Data = { profile: Row; places_of_business: Row[]; authorised_signatories: Row[]; bank_accounts: Row[]; hsn_sac_codes: Row[] };
const tabs: { id: Tab; label: string }[] = [{ id: "profile", label: "My profile" }, { id: "signatories", label: "Authorised signatory and bank accounts" }, { id: "products", label: "Goods and services" }];
const text = (value: unknown) => typeof value === "string" || typeof value === "number" ? String(value) : "—";
const date = (value: unknown) => typeof value === "string" ? value.split("-").reverse().join("-") : "—";
const address = (place: Row) => [[place.floor_no, place.building_no, place.building_name].filter(Boolean).join(", "), [place.street, place.locality].filter(Boolean).join(", "), `${text(place.city)}, ${text(place.state)} ${text(place.pincode)}`].filter(Boolean);

export default function ProfilePage() {
  const router = useRouter();
  const [data, setData] = useState<Data>();
  const [error, setError] = useState<string>();
  const [tab, setTab] = useState<Tab>("profile");
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const client = getSupabaseBrowserClient();
      const { data: userData } = await client.auth.getUser();
      const { data: sessionData } = await client.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!userData.user || !token) { router.replace("/login"); return; }
      const headers = { Authorization: `Bearer ${token}` };
      let response = await fetch("/api/profile", { headers });
      if (response.status === 404) {
        const provision = await fetch("/api/profile/demo", { method: "POST", headers });
        if (!provision.ok) throw new Error();
        response = await fetch("/api/profile", { headers });
      }
      if (!response.ok) throw new Error();
      const result = await response.json() as Data;
      if (mounted) setData(result);
    }
    void load().catch(() => { if (mounted) setError("We could not load your taxpayer profile. Please try again."); });
    return () => { mounted = false; };
  }, [router]);

  async function logout() { setSigningOut(true); try { await getSupabaseBrowserClient().auth.signOut(); } finally { router.replace("/login"); router.refresh(); } }
  if (!data) return <main id="main-content" className="mx-auto grid min-h-[50vh] max-w-3xl content-center px-6 py-16 text-center"><p className="text-lg text-text-muted">{error ?? "Loading your taxpayer profile..."}</p></main>;

  const profile = data.profile;
  const gstin = text(profile.gstin);
  const company = text(profile.trade_name ?? profile.legal_name);
  const facts: [string, unknown][] = [["Legal name", profile.legal_name], ["Trade name", profile.trade_name], ["Constitution of business", profile.constitution], ["Registration date", date(profile.date_of_registration)], ["Primary email", profile.primary_email], ["Registered mobile", profile.registered_mobile]];

  return <main id="main-content" className="gst-profile-page">
    <nav className="gst-service-nav" aria-label="Main navigation"><div className="gst-auth-masthead"><div className="gst-auth-masthead-inner"><div className="gst-auth-brand"><Image className="gst-auth-emblem" src="/brand/india-emblem.png" alt="State emblem of India" width={42} height={40} /><div><strong>Goods and Services Tax</strong><span>Government of India, States and Union Territories</span></div></div><div className="gst-auth-account"><a className="gst-nav-user gst-profile-trigger" href="/profile"><span><strong>{company}</strong><small>GSTIN: {gstin}</small></span></a><Button className="gst-auth-logout" type="button" onClick={logout} disabled={signingOut} variant="outline">{signingOut ? "Signing out..." : "Logout"}</Button></div></div></div></nav>
    <div className="gst-profile-container"><div className="gst-profile-breadcrumb"><a href="/dashboard">Dashboard</a><span>/</span><span>Profile</span></div><header className="gst-profile-heading"><div><h1>My profile</h1><p>Your taxpayer identity, authorised representatives and GST master data.</p></div></header><nav className="gst-profile-tabs" role="tablist">{tabs.map((item) => <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} className={tab === item.id ? "is-active" : undefined} onClick={() => setTab(item.id)}>{item.label}</button>)}</nav>
      {tab === "profile" ? <div className="gst-profile-content"><section className="gst-profile-section"><div className="gst-section-heading"><div><h2>Taxpayer details</h2><p>Your registered business information and primary GST registration.</p></div></div><div className="gst-identity-summary"><div><p className="gst-identity-name">{text(profile.legal_name)} <span className="gst-company-verified">✓</span></p><p className="gstin-line">GSTIN <span>{gstin}</span></p><p>{text(profile.taxpayer_type)} taxpayer · {text(profile.state_name)} · Principal place of business</p></div></div><dl className="gst-details-grid">{facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{text(value)}</dd></div>)}</dl></section><section className="gst-profile-section"><div className="gst-section-heading"><div><h2>GST registration and places of business</h2><p>Places of business mapped to this GST registration.</p></div></div><div className="gst-addresses-grid">{data.places_of_business.map((place) => { const lines = address(place); return <article className="gst-full-address-card" key={text(place.id)}><div><p className="gst-address-type">{text(place.address_type)} place of business</p><span>{place.address_type === "Principal" ? "Primary" : "Branch"}</span></div><h3>{lines[0]}</h3>{lines.slice(1).map((line) => <p key={line}>{line}</p>)}<p>State code: {text(profile.state_code)}</p></article>; })}</div></section></div> : null}
      {tab === "signatories" ? <section className="gst-tab-page"><header className="gst-tab-page-header"><div><h2>Authorised signatories and bank accounts</h2><p>Persons authorised to represent the taxpayer and verified bank accounts.</p></div></header><section className="gst-tab-group"><div className="gst-tab-group-heading"><h3>Authorised signatories</h3></div><div className="gst-record-list">{data.authorised_signatories.map((item) => <article key={text(item.id)}><span className="gst-initial-avatar">{text(item.name).split(" ").map((part) => part[0]).join("")}</span><div><div className="gst-record-title"><h4>{text(item.name)}</h4>{item.is_primary ? <span className="gst-record-primary">Primary</span> : null}<span className="gst-record-status">Verified</span></div><p>{text(item.designation)} · Mobile {text(item.mobile)} · {text(item.email)}</p></div></article>)}</div></section><section className="gst-tab-group"><div className="gst-tab-group-heading"><h3>Bank accounts</h3></div><div className="gst-record-list">{data.bank_accounts.map((item) => <article key={text(item.id)}><span className="gst-bank-icon">▦</span><div><div className="gst-record-title"><h4>{text(item.bank_name)} · {text(item.account_number)}</h4>{item.is_primary ? <span className="gst-record-primary">Primary</span> : null}<span className="gst-record-status">{text(item.validation_status)}</span></div><p>{text(item.branch)} · {text(item.account_type)} account · IFSC {text(item.ifsc_code)}</p></div></article>)}</div></section></section> : null}
      {tab === "products" ? <section className="gst-tab-page"><header className="gst-tab-page-header"><div><h2>HSN and SAC codes</h2><p>HSN and SAC codes used on invoices for this GST registration.</p></div></header><p className="gst-info-notice"><strong>Read-only master data.</strong> These codes are loaded from your registered taxpayer profile.</p><div className="gst-code-controls"><span>{data.hsn_sac_codes.length} codes</span></div><div className="gst-code-table-wrap"><table className="gst-code-table"><thead><tr><th>HSN / SAC code</th><th>Description</th><th>Rate</th><th>Category</th><th>Status</th></tr></thead><tbody>{data.hsn_sac_codes.map((item) => <tr key={text(item.id)}><th>{text(item.code)}</th><td>{text(item.description)}</td><td><span className="gst-rate">{text(item.tax_rate)}%</span></td><td>{text(item.category)}</td><td><span className="gst-record-status">{item.is_active ? "Active" : "Inactive"}</span></td></tr>)}</tbody></table></div></section> : null}
    </div>
  </main>;
}
