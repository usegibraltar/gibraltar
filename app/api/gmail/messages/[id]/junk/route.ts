import { NextResponse } from "next/server";
import { getBearerToken, jsonError } from "../../../../../lib/api";
import { getFreshAccessToken, getMessageDetail } from "../../../../../lib/gmail";
import { markMessageAsJunk } from "../../../../../lib/gmail-message-store";
import { getSupabaseAdmin, GmailConnection, requireApprovedUser } from "../../../../../lib/supabase";

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

  if (!id) {
    return jsonError("Choose a Gmail message first.");
  }

  const { data: connection, error } = await getSupabaseAdmin()
    .from("gmail_connections")
    .select("*")
    .eq("user_id", auth.user.id)
    .maybeSingle<GmailConnection>();

  if (error || !connection) {
    return jsonError("Connect Gmail before removing messages from review.", 400);
  }

  try {
    const accessToken = await getFreshAccessToken(connection);
    const message = await getMessageDetail(accessToken, id);

    await markMessageAsJunk({
      user: auth.user,
      gmailEmail: connection.gmail_email,
      message,
    });

    return NextResponse.json({ ok: true });
  } catch (junkError) {
    console.error("Gmail junk removal failed", junkError);
    return jsonError(
      junkError instanceof Error ? junkError.message : "Could not remove that message from review.",
      500,
    );
  }
}
