import { NextResponse } from "next/server";
import { getBearerToken, jsonError } from "../../../lib/api";
import { getFreshAccessToken, listRecentMessages } from "../../../lib/gmail";
import { loadJunkMessageIds, triageAndStoreMessages } from "../../../lib/gmail-message-store";
import { getSupabaseAdmin, GmailConnection, requireApprovedUser } from "../../../lib/supabase";
import { defaultTriage } from "../../../lib/triage";

export async function GET(request: Request) {
  const auth = await requireApprovedUser(getBearerToken(request));
  const url = new URL(request.url);
  const rawQuery = (url.searchParams.get("q") ?? "").trim().slice(0, 300);
  const query = rawQuery ? `in:anywhere ${rawQuery}` : "";
  const pageToken = (url.searchParams.get("pageToken") ?? "").trim();

  if (!auth.user) {
    return jsonError(auth.error, auth.status);
  }

  const { data: connection, error } = await getSupabaseAdmin()
    .from("gmail_connections")
    .select("*")
    .eq("user_id", auth.user.id)
    .maybeSingle<GmailConnection>();

  if (error) {
    console.error("Gmail connection lookup failed", error);
    return jsonError("Could not load Gmail connection.", 500);
  }

  if (!connection) {
    return NextResponse.json({ connected: false, messages: [], nextPageToken: null, resultSizeEstimate: 0 });
  }

  try {
    const accessToken = await getFreshAccessToken(connection);
    const result = await listRecentMessages(accessToken, { query, pageToken });
    const junkMessageIds = await loadJunkMessageIds(
      auth.user.id,
      result.messages.map((message) => message.id),
    );
    const reviewMessages = result.messages.filter((message) => !junkMessageIds.has(message.id));
    const triage = await triageAndStoreMessages({
      user: auth.user,
      gmailEmail: connection.gmail_email,
      messages: reviewMessages,
    });

    return NextResponse.json({
      connected: true,
      gmailEmail: connection.gmail_email,
      nextPageToken: result.nextPageToken,
      resultSizeEstimate: result.resultSizeEstimate,
      messages: reviewMessages.map((message) => ({
        ...message,
        triage: triage.get(message.id) ?? defaultTriage,
      })),
    });
  } catch (gmailError) {
    console.error("Gmail message list failed", gmailError);
    return jsonError(
      gmailError instanceof Error ? gmailError.message : "Could not load Gmail messages.",
      500,
    );
  }
}
