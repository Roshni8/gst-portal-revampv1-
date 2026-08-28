import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

async function ownedWorkspace(userId: string, workspaceId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("ims_workspaces").select("*").eq("id", workspaceId).eq("user_id", userId).maybeSingle();
  if (error) throw new Error("Unable to load the IMS workspace.");
  return data;
}

export async function GET(request: Request) {
  const user = await requireAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const taxPeriod = new URL(request.url).searchParams.get("taxPeriod");
  if (!taxPeriod || !/^\d{6}$/.test(taxPeriod)) return NextResponse.json({ error: "taxPeriod must use MMYYYY." }, { status: 400 });
  const supabase = getSupabaseAdmin();
  const { data: workspace, error: workspaceError } = await supabase.from("ims_workspaces").select("*").eq("user_id", user.id).eq("tax_period", taxPeriod).maybeSingle();
  if (workspaceError) return NextResponse.json({ error: "Unable to load IMS data." }, { status: 500 });
  if (!workspace) return NextResponse.json({ workspace: null, portal_invoices: [], erp_review: [], approved: [] });

  const [{ data: portalInvoices, error: portalError }, { data: decisions, error: decisionsError }, { data: runs, error: runsError }, { data: checks, error: checksError }] = await Promise.all([
    supabase.from("ims_portal_invoices").select("*").eq("workspace_id", workspace.id).order("invoice_date"),
    supabase.from("ims_invoice_decisions").select("*").eq("workspace_id", workspace.id),
    supabase.from("ims_reconciliation_runs").select("*").eq("workspace_id", workspace.id).order("created_at", { ascending: false }).limit(1),
    supabase.from("ims_counterparty_checks").select("*").eq("workspace_id", workspace.id).eq("checked_by_user_id", user.id).order("checked_at", { ascending: false }),
  ]);
  if (portalError || decisionsError || runsError || checksError) return NextResponse.json({ error: "Unable to load IMS invoices." }, { status: 500 });
  const latestRun = runs?.[0];
  const { data: results, error: resultsError } = latestRun ? await supabase.from("ims_reconciliation_results").select("*").eq("run_id", latestRun.id) : { data: [], error: null };
  if (resultsError) return NextResponse.json({ error: "Unable to load IMS reconciliation results." }, { status: 500 });
  let erpRows: unknown[] = [];
  if (latestRun?.erp_upload_id) {
    const { data, error } = await supabase.from("ims_erp_invoice_rows").select("*").eq("upload_id", latestRun.erp_upload_id).order("source_row_number");
    if (error) return NextResponse.json({ error: "Unable to load ERP invoice rows." }, { status: 500 });
    erpRows = data ?? [];
  }
  return NextResponse.json({ workspace, portal_invoices: portalInvoices ?? [], decisions: decisions ?? [], latest_run: latestRun ?? null, reconciliation_results: results ?? [], erp_rows: erpRows, recent_counterparty_checks: checks ?? [] });
}

export async function POST(request: Request) {
  const user = await requireAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json() as { action?: string; workspaceId?: string; portalInvoiceId?: string; status?: "PENDING" | "ACCEPTED" | "REJECTED"; remark?: string };
  if (!body.workspaceId || !body.action) return NextResponse.json({ error: "A workspace and action are required." }, { status: 400 });
  try {
    const workspace = await ownedWorkspace(user.id, body.workspaceId);
    if (!workspace) return NextResponse.json({ error: "IMS workspace not found." }, { status: 404 });
    const supabase = getSupabaseAdmin();
    if (body.action === "submit") {
      const { error } = await supabase.from("ims_workspaces").update({ submitted_at: new Date().toISOString() }).eq("id", workspace.id).eq("user_id", user.id);
      if (error) return NextResponse.json({ error: "Unable to submit IMS." }, { status: 500 });
      return NextResponse.json({ submitted: true });
    }
    if (body.action !== "decision" || !body.portalInvoiceId || !body.status) return NextResponse.json({ error: "A portal invoice and valid decision are required." }, { status: 400 });
    const { data: invoice, error: invoiceError } = await supabase.from("ims_portal_invoices").select("id").eq("id", body.portalInvoiceId).eq("workspace_id", workspace.id).maybeSingle();
    if (invoiceError || !invoice) return NextResponse.json({ error: "Portal invoice not found." }, { status: 404 });
    const { error } = await supabase.from("ims_invoice_decisions").upsert({ workspace_id: workspace.id, portal_invoice_id: invoice.id, status: body.status, decided_by_user_id: user.id, remark: body.remark ?? null, decided_at: new Date().toISOString() }, { onConflict: "workspace_id,portal_invoice_id" });
    if (error) return NextResponse.json({ error: "Unable to save IMS decision." }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Unable to save IMS decision." }, { status: 500 }); }
}
