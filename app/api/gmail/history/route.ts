import { NextResponse } from "next/server";
import { getBearerToken, jsonError } from "../../../lib/api";
import { getSupabaseAdmin, requireApprovedUser } from "../../../lib/supabase";

export async function GET(request: Request) {
  const auth = await requireApprovedUser(getBearerToken(request));

  if (!auth.user) {
    return jsonError(auth.error, auth.status);
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("gmail_draft_events")
    .select("id,source_subject,draft_id,draft_message_id,reply_snapshot,status,error_message,variant_label,variant_instruction,playbook_id,playbook_title,playbook_category,sent_at,sent_message_id,created_at")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    if (
      error.message.toLowerCase().includes("variant_label") ||
      error.message.toLowerCase().includes("reply_snapshot") ||
      error.message.toLowerCase().includes("playbook_id") ||
      error.message.toLowerCase().includes("sent_at")
    ) {
      const { data: legacyData, error: legacyError } = await supabase
        .from("gmail_draft_events")
        .select("id,source_subject,draft_id,status,error_message,created_at")
        .eq("user_id", auth.user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (!legacyError) {
        return NextResponse.json({ events: legacyData ?? [] });
      }
    }

    console.error("Draft history lookup failed", error);
    return jsonError("Could not load draft history.", 500);
  }

  return NextResponse.json({ events: data ?? [] });
}
