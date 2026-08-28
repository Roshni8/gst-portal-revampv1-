import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

function maskPhone(value: string) {
  const visible = value.replace(/\D/g, "").slice(-4);
  return visible ? `••••••${visible}` : "";
}

function maskEmail(value: string) {
  const [local, domain] = value.split("@");
  return !domain ? "••••" : `${local.slice(0, 1)}•••@${domain}`;
}

function maskAccount(value: string) {
  return `•••• ${value.slice(-4)}`;
}

export async function GET(request: Request) {
  const user = await requireAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabaseAdmin = getSupabaseAdmin();

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("taxpayer_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError) return NextResponse.json({ error: "Unable to load the taxpayer profile." }, { status: 500 });
  if (!profile) return NextResponse.json({ error: "No taxpayer profile is configured for this user." }, { status: 404 });
  if (new URL(request.url).searchParams.get("summary") === "1") return NextResponse.json({ profile });

  const [places, signatories, bankAccounts, derivedAttributes, filingHistory, hsnSacCodes] = await Promise.all([
    supabaseAdmin.from("taxpayer_places_of_business").select("*").eq("gstin", profile.gstin).order("address_type"),
    supabaseAdmin.from("taxpayer_authorised_signatories").select("id, gstin, name, designation, mobile, email, is_primary, place_of_signing").eq("gstin", profile.gstin).order("is_primary", { ascending: false }),
    supabaseAdmin.from("taxpayer_bank_accounts").select("id, gstin, account_number, ifsc_code, bank_name, branch, account_type, validation_status, is_primary").eq("gstin", profile.gstin).order("is_primary", { ascending: false }),
    supabaseAdmin.from("taxpayer_derived_attributes").select("*").eq("gstin", profile.gstin).maybeSingle(),
    supabaseAdmin.from("taxpayer_filing_history").select("*").eq("gstin", profile.gstin).order("due_date", { ascending: false }),
    supabaseAdmin.from("taxpayer_hsn_sac_codes").select("*").eq("gstin", profile.gstin).order("code"),
  ]);

  const results = [places, signatories, bankAccounts, derivedAttributes, filingHistory, hsnSacCodes];
  if (results.some((result) => result.error)) return NextResponse.json({ error: "Unable to load taxpayer master data." }, { status: 500 });

  return NextResponse.json({
    profile,
    places_of_business: places.data ?? [],
    authorised_signatories: (signatories.data ?? []).map((signatory) => ({ ...signatory, mobile: maskPhone(signatory.mobile), email: maskEmail(signatory.email) })),
    bank_accounts: (bankAccounts.data ?? []).map((account) => ({ ...account, account_number: maskAccount(account.account_number) })),
    derived_attributes: derivedAttributes.data,
    filing_history: filingHistory.data ?? [],
    hsn_sac_codes: hsnSacCodes.data ?? [],
  });
}
