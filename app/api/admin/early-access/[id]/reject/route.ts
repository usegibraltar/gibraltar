import { NextResponse } from "next/server";
import { getBearerToken, jsonError } from "../../../../../lib/api";
import { getSupabaseAdmin, requireAdminUser } from "../../../../../lib/supabase";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, { params }: Params) {
  const auth = await requireAdminUser(getBearerToken(request));

  if (!auth.user) {
    return jsonError(auth.error, auth.status);
  }

  const { id } = await params;
  const { error } = await getSupabaseAdmin()
    .from("early_access_signups")
    .update({
      status: "rejected",
      rejected_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("Reject signup failed", error);
    return jsonError("Could not reject that signup.", 500);
  }

  return NextResponse.json({ ok: true });
}
