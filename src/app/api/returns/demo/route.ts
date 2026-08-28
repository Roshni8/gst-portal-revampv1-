import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { provisionTestAdminReturns } from "@/lib/returns-demo";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await requireAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const result = await provisionTestAdminReturns(getSupabaseAdmin(), user.id, user.email);
    return NextResponse.json(result, { status: result.provisioned ? 201 : 200 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to provision return data." }, { status: 500 });
  }
}

