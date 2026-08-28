import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/api-auth";
import { csvCell } from "@/lib/ims-csv";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await requireAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const workspaceId = new URL(request.url).searchParams.get("workspaceId");
  if (!workspaceId) return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });
  const supabase = getSupabaseAdmin();
  const { data: workspace, error: workspaceError } = await supabase.from("ims_workspaces").select("id, tax_period").eq("id", workspaceId).eq("user_id", user.id).maybeSingle();
  if (workspaceError || !workspace) return NextResponse.json({ error: "IMS workspace not found." }, { status: 404 });
  const { data: run } = await supabase.from("ims_reconciliation_runs").select("id").eq("workspace_id", workspace.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!run) return NextResponse.json({ error: "No ERP review sheet is available yet." }, { status: 404 });
  const { data: results, error } = await supabase.from("ims_reconciliation_results").select("status, portal_invoice_id, erp_invoice_row_id, difference_summary").eq("run_id", run.id).neq("status", "AUTO_MATCHED");
  if (error) return NextResponse.json({ error: "Unable to prepare review sheet." }, { status: 500 });
  const header = ["status", "portal_invoice_id", "erp_invoice_row_id", "difference_summary"];
  const csv = [header.join(","), ...(results ?? []).map((result) => [result.status, result.portal_invoice_id, result.erp_invoice_row_id, JSON.stringify(result.difference_summary)].map(csvCell).join(","))].join("\n");
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="ims-review-${workspace.tax_period}.csv"` } });
}
