import { NextResponse } from "next/server";
import { getBearerToken, jsonError } from "../../../../lib/api";
import { getFreshAccessToken, getMessageDetail, getThreadDetail } from "../../../../lib/gmail";
import { getSupabaseAdmin, GmailConnection, requireApprovedUser } from "../../../../lib/supabase";
import { triageMessage } from "../../../../lib/triage";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: Request, { params }: Params) {
  const auth = await requireApprovedUser(getBearerToken(request));

  if (!auth.user) {
    return jsonError(auth.error, auth.status);
  }

  const { id } = await params;

  if (!id) {
    return jsonError("Choose a Gmail message first.");
  }

  const { data: connection, error } = await getSupabaseAdmin()
    .from("gmail_connections")
    .select("*")
    .eq("user_id", auth.user.id)
    .maybeSingle<GmailConnection>();

  if (error || !connection) {
    return jsonError("Connect Gmail before reading messages.", 400);
  }

  try {
    const accessToken = await getFreshAccessToken(connection);
    const message = await getMessageDetail(accessToken, id);
    const thread = await getThreadDetail(accessToken, message.threadId);

    return NextResponse.json({
      message: {
        ...message,
        triage: triageMessage(message),
      },
      thread,
    });
  } catch (messageError) {
    console.error("Gmail message detail failed", messageError);
    return jsonError(
      messageError instanceof Error ? messageError.message : "Could not read that Gmail message.",
      500,
    );
  }
}
