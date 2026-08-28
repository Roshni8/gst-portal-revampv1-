"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export type ServiceScreen = "dashboard" | "returns" | "purchases-ims" | "ledgers" | "refunds" | "profile";

const navigation: { href: string; label: string; screen: ServiceScreen; tooltip?: string; disabled?: boolean }[] = [
  { href: "/dashboard", label: "Dashboard", screen: "dashboard" },
  { href: "/returns", label: "Returns", screen: "returns" },
  { href: "/refunds", label: "Refunds", screen: "refunds", tooltip: "TBAL", disabled: true },
];

function UserIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5" /><path d="M5.5 20c.8-3.2 3-4.8 6.5-4.8s5.7 1.6 6.5 4.8" /></svg>;
}

export function GstServiceNavigation({ active, company, gstin }: { active?: ServiceScreen; company: string; gstin: string }) {
  const router = useRouter();
  async function logout() { await getSupabaseBrowserClient().auth.signOut(); router.replace("/login"); router.refresh(); }

  return <nav className="gst-service-nav" aria-label="Main navigation">
    <div className="gst-auth-masthead"><div className="gst-auth-masthead-inner">
      <div className="gst-auth-brand"><Image className="gst-auth-emblem" src="/brand/india-emblem.png" alt="State emblem of India" width={42} height={40} /><div><strong>Goods and Services Tax</strong><span>Government of India, States and Union Territories</span></div></div>
      <div className="gst-auth-account"><a className="gst-nav-user gst-profile-trigger" href="/profile" aria-label="Open my profile"><UserIcon /><span><strong>{company}</strong><small>GSTIN: {gstin}</small></span></a><Button className="gst-auth-logout" type="button" onClick={logout} variant="outline">Logout</Button></div>
    </div></div>
    <div className="gst-service-nav-inner"><div className="gst-service-links">{navigation.map((item) => <button key={item.href} type="button" className={`${active === item.screen ? "is-active" : ""} ${item.tooltip ? "has-tooltip" : ""} ${item.disabled ? "is-disabled" : ""}`.trim()} aria-current={active === item.screen ? "page" : undefined} aria-disabled={item.disabled || undefined} data-tooltip={item.tooltip} onClick={() => { if (!item.disabled) router.push(item.href); }}>{item.label}</button>)}</div></div>
  </nav>;
}
