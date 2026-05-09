import { NextResponse } from "next/server";
import { getBearerToken, jsonError } from "../../../lib/api";
import { generateGmailReply } from "../../../lib/reply-generator";
import { getFreshAccessToken } from "../../../lib/gmail";
import { getSupabaseAdmin, GmailConnection, requireApprovedUser } from "../../../lib/supabase";

type GenerateReplyBody = {
  messageId?: unknown;
  instruction?: unknown;
  triage?: unknown;
  playbookId?: unknown;
};

export async function POST(request: Request) {
  const auth = await requireApprovedUser(getBearerToken(request));

  if (!auth.user) {
    return jsonError(auth.error, auth.status);
  }

  let body: GenerateReplyBody;

  try {
    body = (await request.json()) as GenerateReplyBody;
  } catch {
    return jsonError("Please choose a Gmail message first.");
  }

  const messageId = typeof body.messageId === "string" ? body.messageId : "";
  const instruction =
    typeof body.instruction === "string" ? body.instruction.trim().slice(0, 200) : "";
  const triage =
    body.triage && typeof body.triage === "object"
      ? JSON.stringify(body.triage).slice(0, 500)
      : "";
  const triageCategory =
    body.triage &&
    typeof body.triage === "object" &&
    "category" in body.triage &&
    typeof body.triage.category === "string"
      ? body.triage.category
      : "";
  const playbookId = typeof body.playbookId === "string" ? body.playbookId : "";

  if (!messageId) {
    return jsonError("Please choose a Gmail message first.");
  }

  const { data: connection, error } = await getSupabaseAdmin()
    .from("gmail_connections")
    .select("*")
    .eq("user_id", auth.user.id)
    .maybeSingle<GmailConnection>();

  if (error || !connection) {
    return jsonError("Connect Gmail before generating a reply.", 400);
  }

  try {
    const accessToken = await getFreshAccessToken(connection);
    const generated = await generateGmailReply({
      accessToken,
      userId: auth.user.id,
      messageId,
      triageCategory,
      playbookId,
      instruction: [instruction, triage ? `Message triage: ${triage}` : ""]
        .filter(Boolean)
        .join("\n"),
    });

    return NextResponse.json({
      ok: true,
      reply: generated.reply,
      message: {
        id: generated.message.id,
        threadId: generated.message.threadId,
        from: generated.message.from,
        subject: generated.message.subject,
        snippet: generated.message.snippet,
      },
      sources: generated.sources,
      confidence: generated.confidence,
      riskFlags: generated.riskFlags,
      recommendedAction: generated.recommendedAction,
      missingContext: generated.missingContext,
      playbook: generated.playbook,
      playbookReason: generated.playbookReason,
    });
  } catch (replyError) {
    console.error("Gmail reply generation failed", replyError);
    return jsonError(
      replyError instanceof Error ? replyError.message : "Could not generate a reply.",
      500,
    );
  }
}
