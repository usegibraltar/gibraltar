import { NextResponse } from "next/server";
import { getBearerToken, jsonError } from "../../../lib/api";
import { getFreshAccessToken, listSentMessages } from "../../../lib/gmail";
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

  if (error || !connection) {
    return jsonError("Connect Gmail before learning your voice.", 400);
  }

  try {
    const accessToken = await getFreshAccessToken(connection);
    const samples = await listSentMessages(accessToken);

    return NextResponse.json({
      samples: samples.map((sample) => ({
        id: sample.id,
        subject: sample.subject,
        snippet: sample.snippet,
        body: sample.body,
      })),
    });
  } catch (sampleError) {
    console.error("Voice sample load failed", sampleError);
    return jsonError(
      sampleError instanceof Error
        ? sampleError.message
        : "Could not load sent email samples.",
      500,
    );
  }
}
