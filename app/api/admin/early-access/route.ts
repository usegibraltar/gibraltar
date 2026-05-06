import { NextResponse } from "next/server";
import { getBearerToken, jsonError } from "../../../lib/api";
import { getSupabaseAdmin, requireAdminUser } from "../../../lib/supabase";

export async function GET(request: Request) {
  const auth = await requireAdminUser(getBearerToken(request));

  if (!auth.user) {
    return jsonError(auth.error, auth.status);
  }

  const { data, error } = await getSupabaseAdmin()
    .from("early_access_signups")
    .select("id,email,source,status,created_at,updated_at,approved_at,approved_by,rejected_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Admin signup list failed", error);
    return jsonError("Could not load early access signups.", 500);
  }

  return NextResponse.json({ signups: data ?? [] });
}
