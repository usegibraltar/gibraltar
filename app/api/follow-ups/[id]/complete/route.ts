import { NextResponse } from "next/server";
import { getBearerToken, jsonError } from "../../../../lib/api";
import { getSupabaseAdmin, requireApprovedUser } from "../../../../lib/supabase";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, { params }: Params) {
  const auth = await requireApprovedUser(getBearerToken(request));

  if (!auth.user) {
    return jsonError(auth.error, auth.status);
  }

  const { id } = await params;
  const { error } = await getSupabaseAdmin()
    .from("follow_up_reminders")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", auth.user.id);

  if (error) {
    console.error("Follow-up reminder complete failed", error);
    return jsonError("Could not complete follow-up reminder.", 500);
  }

  return NextResponse.json({ ok: true });
}
