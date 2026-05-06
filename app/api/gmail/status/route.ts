import { NextResponse } from "next/server";
import { getBearerToken, jsonError } from "../../../lib/api";
import { getSupabaseAdmin, GmailConnection, requireApprovedUser } from "../../../lib/supabase";

export async function GET(request: Request) {
  const auth = await requireApprovedUser(getBearerToken(request));

  if (!auth.user) {
    return jsonError(auth.error, auth.status);
  }

  const { data: connection, error } = await getSupabaseAdmin()
    .from("gmail_connections")
    .select("*")
    .eq("user_id", auth.user.id)
    .maybeSingle<GmailConnection>();

  if (error) {
    console.error("Gmail status lookup failed", error);
    return jsonError("Could not load Gmail connection.", 500);
  }

  return NextResponse.json({
    connected: Boolean(connection),
    gmailEmail: connection?.gmail_email ?? null,
  });
}
