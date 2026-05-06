import { NextResponse } from "next/server";
import { logAuditEvent } from "../../../lib/audit";
import { getBearerToken, jsonError } from "../../../lib/api";
import { getSupabaseAdmin, requireApprovedUser } from "../../../lib/supabase";

export async function POST(request: Request) {
  const auth = await requireApprovedUser(getBearerToken(request));

  if (!auth.user) {
    return jsonError(auth.error, auth.status);
  }

  const { error } = await getSupabaseAdmin()
    .from("gmail_connections")
    .delete()
    .eq("user_id", auth.user.id);

  if (error) {
    console.error("Gmail disconnect failed", error);
    return jsonError("Could not disconnect Gmail.", 500);
  }

  await logAuditEvent({
    actorUserId: auth.user.id,
    actorEmail: auth.user.email,
    eventType: "gmail_disconnected",
  });

  return NextResponse.json({ ok: true });
}
