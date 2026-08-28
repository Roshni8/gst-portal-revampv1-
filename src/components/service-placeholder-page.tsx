"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GstServiceNavigation, type ServiceScreen } from "@/components/gst-service-navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type Profile = { gstin?: string; legal_name?: string; trade_name?: string | null };

export function ServicePlaceholderPage({ screen, title }: { screen: ServiceScreen; title: string }) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile>();
  useEffect(() => {
    let mounted = true;
    void (async () => {
      const client = getSupabaseBrowserClient();
      const { data: sessionData } = await client.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) { router.replace("/login"); return; }
      const headers = { Authorization: `Bearer ${token}` };
      let response = await fetch("/api/profile?summary=1", { headers });
      if (response.status === 404) {
        const provision = await fetch("/api/profile/demo", { method: "POST", headers });
        if (!provision.ok) { router.replace("/login"); return; }
        response = await fetch("/api/profile?summary=1", { headers });
      }
      if (!response.ok) { router.replace("/login"); return; }
      const data = await response.json() as { profile: Profile };
      if (mounted) setProfile(data.profile);
    })().catch(() => router.replace("/login"));
    return () => { mounted = false; };
  }, [router]);
  if (!profile) return <main className="gst-profile-page" aria-busy="true" />;
  return <main className="gst-profile-page"><GstServiceNavigation active={screen} company={profile.trade_name ?? profile.legal_name ?? "Taxpayer"} gstin={profile.gstin ?? "—"} /><div className="gst-profile-container"><div className="gst-profile-breadcrumb"><span>{title}</span></div><header className="gst-profile-heading"><div><h1>{title}</h1><p>This screen is ready for the next phase of the prototype.</p></div></header></div></main>;
}
