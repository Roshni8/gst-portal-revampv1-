import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const gstin = "29AAHCA3412R1Z5";

export async function POST(request: Request) {
  const user = await requireAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabaseAdmin = getSupabaseAdmin();
  const { data: existingProfile, error: lookupError } = await supabaseAdmin
    .from("taxpayer_profiles")
    .select("gstin")
    .eq("user_id", user.id)
    .maybeSingle();

  if (lookupError) return NextResponse.json({ error: "Unable to provision the profile." }, { status: 500 });
  if (existingProfile) return NextResponse.json({ gstin: existingProfile.gstin, provisioned: false });

  const { error: profileError } = await supabaseAdmin.from("taxpayer_profiles").insert({
    gstin,
    user_id: user.id,
    pan: "AAHCA3412R",
    legal_name: "Aarohan Systems Private Limited",
    trade_name: "Aarohan Systems",
    additional_trade_names: ["Aarohan Digital"],
    constitution: "Private Limited Company",
    taxpayer_type: "Regular",
    date_of_registration: "2019-07-18",
    date_of_liability: "2019-07-18",
    status: "Active",
    state_code: "29",
    state_name: "Karnataka",
    state_jurisdiction_code: "KA-042",
    state_jurisdiction_name: "Bengaluru East",
    central_jurisdiction_code: "BLR-C-077",
    central_jurisdiction_name: "Bengaluru East Commissionerate",
    nature_of_business: ["Services", "Trading"],
    filing_frequency: "Monthly",
    opted_qrmp: false,
    opted_composition: false,
    opted_evc: true,
    primary_email: "finance@aarohansystems.in",
    registered_mobile: "+919845076192",
  });

  if (profileError) {
    const status = profileError.code === "23505" ? 409 : 500;
    return NextResponse.json({ error: status === 409 ? "The demo GSTIN is already assigned to another user." : "Unable to provision the profile." }, { status });
  }

  const results = await Promise.all([
    supabaseAdmin.from("taxpayer_places_of_business").insert([
      { gstin, address_type: "Principal", floor_no: "5th Floor", building_name: "Meridian Tower", street: "Mahatma Gandhi Road", locality: "Ashok Nagar", city: "Bengaluru", district: "Bengaluru Urban", state: "Karnataka", pincode: "560001", contact_phone: "+919845076192", contact_email: "finance@aarohansystems.in", nature_of_possession: "Leased" },
      { gstin, address_type: "Additional", building_no: "Unit 204", building_name: "Tech Park One", street: "Whitefield Main Road", locality: "Whitefield", city: "Bengaluru", district: "Bengaluru Urban", state: "Karnataka", pincode: "560066", nature_of_possession: "Leased" },
    ]),
    supabaseAdmin.from("taxpayer_authorised_signatories").insert([
      { gstin, name: "Kavya Iyer", designation: "Director", mobile: "+919845076192", email: "kavya.iyer@aarohansystems.in", is_primary: true, place_of_signing: "Bengaluru" },
      { gstin, name: "Arjun Nair", designation: "Finance Controller", mobile: "+919811227436", email: "arjun.nair@aarohansystems.in", is_primary: false, place_of_signing: "Bengaluru" },
    ]),
    supabaseAdmin.from("taxpayer_bank_accounts").insert([
      { gstin, account_number: "5020004821", ifsc_code: "HDFC0000123", bank_name: "HDFC Bank", branch: "MG Road Branch", account_type: "Current", validation_status: "Success", is_primary: true },
      { gstin, account_number: "0317059176", ifsc_code: "ICIC0000456", bank_name: "ICICI Bank", branch: "Whitefield Branch", account_type: "Current", validation_status: "Success", is_primary: false },
    ]),
    supabaseAdmin.from("taxpayer_derived_attributes").insert({ gstin, aato: 78400000, einvoicing_applicable: true, hsn_digit_depth: 6, gstr9c_applicable: true, computed_from_periods: ["042025", "052025", "062025", "072025", "082025", "092025", "102025", "112025", "122025", "012026", "022026", "032026"] }),
    supabaseAdmin.from("taxpayer_filing_history").insert([
      { gstin, return_type: "GSTR-1", tax_period: "042026", filing_date: "2026-05-10", arn: "AA2905260001234", status: "Filed", due_date: "2026-05-11" },
      { gstin, return_type: "GSTR-3B", tax_period: "042026", filing_date: "2026-05-18", arn: "AA2905260001235", status: "Filed", due_date: "2026-05-20" },
      { gstin, return_type: "GSTR-1", tax_period: "052026", filing_date: "2026-06-09", arn: "AA2906260001236", status: "Filed", due_date: "2026-06-11" },
      { gstin, return_type: "GSTR-3B", tax_period: "052026", filing_date: "2026-06-19", arn: "AA2906260001237", status: "Filed", due_date: "2026-06-20" },
      { gstin, return_type: "GSTR-1", tax_period: "062026", filing_date: "2026-07-10", arn: "AA2907260001238", status: "Filed", due_date: "2026-07-11" },
      { gstin, return_type: "GSTR-3B", tax_period: "062026", filing_date: "2026-07-18", arn: "AA2907260001239", status: "Filed", due_date: "2026-07-20" },
      { gstin, return_type: "GSTR-1", tax_period: "072026", filing_date: "2026-08-10", arn: "AA2908260001240", status: "Filed", due_date: "2026-08-11" },
      { gstin, return_type: "GSTR-3B", tax_period: "072026", filing_date: "2026-08-19", arn: "AA2908260001241", status: "Filed", due_date: "2026-08-20" },
    ]),
    supabaseAdmin.from("taxpayer_hsn_sac_codes").insert([
      { gstin, code: "847130", description: "Automatic data processing machines", tax_rate: 18, category: "Goods" },
      { gstin, code: "851713", description: "Telephones and communication equipment", tax_rate: 18, category: "Goods" },
      { gstin, code: "852872", description: "Monitors and projectors", tax_rate: 28, category: "Goods" },
      { gstin, code: "998314", description: "Other professional, technical services", tax_rate: 18, category: "Services" },
      { gstin, code: "998599", description: "Support services", tax_rate: 18, category: "Services" },
    ]),
  ]);

  if (results.some(({ error }) => error)) return NextResponse.json({ error: "Profile created, but some supporting data could not be provisioned." }, { status: 500 });
  return NextResponse.json({ gstin, provisioned: true }, { status: 201 });
}
