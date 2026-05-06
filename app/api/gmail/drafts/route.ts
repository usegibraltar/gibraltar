import { NextResponse } from "next/server";
import { logAuditEvent } from "../../../lib/audit";
import { getBearerToken, jsonError } from "../../../lib/api";
import {
  createReplyDraft,
  getFreshAccessToken,
  getMessageDetail,
  sendDraft,
} from "../../../lib/gmail";
import { generateGmailReply } from "../../../lib/reply-generator";
import { getSupabaseAdmin, GmailConnection, requireApprovedUser } from "../../../lib/supabase";

type CreateDraftBody = {
  messageId?: unknown;
  reply?: unknown;
  variantLabel?: unknown;
  variantInstruction?: unknown;
  sendNow?: unknown;
};

function extractEmailAddress(value: string) {
  const match = value.match(/<([^>]+)>/);
  return (match?.[1] ?? value).trim();
}

export async function POST(request: Request) {
  const auth = await requireApprovedUser(getBearerToken(request));

  if (!auth.user) {
    return jsonError(auth.error, auth.status);
  }

  let body: CreateDraftBody;

  try {
    body = (await request.json()) as CreateDraftBody;
  } catch {
    return jsonError("Please choose a Gmail message first.");
  }

  const messageId = typeof body.messageId === "string" ? body.messageId : "";
  const variantLabel =
    typeof body.variantLabel === "string" ? body.variantLabel.trim().slice(0, 60) : "";
  const variantInstruction =
    typeof body.variantInstruction === "string" ? body.variantInstruction.trim().slice(0, 240) : "";
  const sendNow = body.sendNow === true;

  if (!messageId) {
    return jsonError("Please choose a Gmail message first.");
  }

  const supabase = getSupabaseAdmin();
  const { data: connection, error } = await supabase
    .from("gmail_connections")
    .select("*")
    .eq("user_id", auth.user.id)
    .maybeSingle<GmailConnection>();

  if (error || !connection) {
    return jsonError("Connect Gmail before creating a draft.", 400);
  }

  let sourceThreadId = "";

  try {
    const accessToken = await getFreshAccessToken(connection);
    const reviewedReply = typeof body.reply === "string" ? body.reply.trim() : "";
    const generated = reviewedReply
      ? {
          message: await getMessageDetail(accessToken, messageId),
          reply: reviewedReply,
        }
      : await generateGmailReply({
          accessToken,
          userId: auth.user.id,
          messageId,
        });
    const { message } = generated;
    sourceThreadId = message.threadId;

    const draft = await createReplyDraft({
      accessToken,
      threadId: message.threadId,
      to: extractEmailAddress(message.from),
      subject: message.subject,
      body: generated.reply,
    });
    const draftId = draft.id;

    if (!draftId) {
      throw new Error("Gmail created a draft without returning an ID.");
    }

    const sentMessage = sendNow ? await sendDraft({ accessToken, draftId }) : null;

    const createdEvent = {
      user_id: auth.user.id,
      user_email: auth.user.email,
      gmail_email: connection.gmail_email,
      source_message_id: message.id,
      source_thread_id: message.threadId,
      source_subject: message.subject,
      draft_id: draftId,
      draft_message_id: draft.message?.id,
      reply_snapshot: generated.reply.slice(0, 12000),
      status: "created",
      variant_label: variantLabel || "Original",
      variant_instruction: variantInstruction || null,
      sent_at: sentMessage ? new Date().toISOString() : null,
      sent_message_id: sentMessage?.id ?? null,
    };
    const { error: insertError } = await supabase.from("gmail_draft_events").insert(createdEvent);

    if (insertError) {
      const { reply_snapshot, sent_at, sent_message_id, variant_label, variant_instruction, ...legacyEvent } = createdEvent;
      await supabase.from("gmail_draft_events").insert(legacyEvent);
      console.warn("Draft event analytics fields are not available yet.", insertError.message, reply_snapshot, variant_label, variant_instruction, sent_at, sent_message_id);
    }

    await logAuditEvent({
      actorUserId: auth.user.id,
      actorEmail: auth.user.email,
      eventType: sentMessage ? "email_sent" : "draft_created",
      metadata: {
        messageId: message.id,
        threadId: message.threadId,
        draftId,
        variantLabel: variantLabel || "Original",
      },
    });

    return NextResponse.json({
      ok: true,
      draftId,
      draftMessageId: draft.message?.id,
      sent: Boolean(sentMessage),
      sentMessageId: sentMessage?.id,
      reply: generated.reply,
    });
  } catch (draftError) {
    console.error("Gmail draft creation failed", draftError);
    const failedEvent = {
      user_id: auth.user.id,
      user_email: auth.user.email,
      gmail_email: connection.gmail_email,
      source_message_id: messageId,
      source_thread_id: sourceThreadId || null,
      source_subject: null,
      status: "failed",
      error_message:
        draftError instanceof Error ? draftError.message : "Could not create Gmail draft.",
      variant_label: variantLabel || "Original",
      variant_instruction: variantInstruction || null,
    };
    const { error: insertError } = await supabase.from("gmail_draft_events").insert(failedEvent);

    if (insertError) {
      const { variant_label, variant_instruction, ...legacyEvent } = failedEvent;
      await supabase.from("gmail_draft_events").insert(legacyEvent);
      console.warn("Failed draft event variant fields are not available yet.", insertError.message, variant_label, variant_instruction);
    }

    return jsonError(
      draftError instanceof Error ? draftError.message : "Could not create Gmail draft.",
      500,
    );
  }
}
