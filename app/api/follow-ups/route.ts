import { NextResponse } from "next/server";
import { getBearerToken, jsonError } from "../../lib/api";
import { getSupabaseAdmin, requireApprovedUser } from "../../lib/supabase";

type CreateReminderBody = {
  sourceMessageId?: unknown;
  sourceThreadId?: unknown;
  sourceSubject?: unknown;
  dueAt?: unknown;
};

function cleanText(value: unknown, maxLength = 500) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function GET(request: Request) {
  const auth = await requireApprovedUser(getBearerToken(request));

  if (!auth.user) {
    return jsonError(auth.error, auth.status);
  }

  const { data, error } = await getSupabaseAdmin()
    .from("follow_up_reminders")
    .select("id,source_subject,source_message_id,source_thread_id,due_at,status,created_at,completed_at")
    .eq("user_id", auth.user.id)
    .order("due_at", { ascending: true })
    .limit(20);

  if (error) {
    console.error("Follow-up reminder lookup failed", error);
    return jsonError("Could not load follow-up reminders.", 500);
  }

  return NextResponse.json({ reminders: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await requireApprovedUser(getBearerToken(request));

  if (!auth.user) {
    return jsonError(auth.error, auth.status);
  }

  let body: CreateReminderBody;

  try {
    body = (await request.json()) as CreateReminderBody;
  } catch {
    return jsonError("Please send a valid follow-up reminder.");
  }

  const sourceMessageId = cleanText(body.sourceMessageId, 200);
  const sourceThreadId = cleanText(body.sourceThreadId, 200);
  const sourceSubject = cleanText(body.sourceSubject, 500);
  const dueAt = typeof body.dueAt === "string" ? body.dueAt : "";
  const dueTime = Date.parse(dueAt);

  if (!sourceMessageId || !Number.isFinite(dueTime)) {
    return jsonError("Choose a message and a valid follow-up date.");
  }

  const { data: connection } = await getSupabaseAdmin()
    .from("gmail_connections")
    .select("gmail_email")
    .eq("user_id", auth.user.id)
    .maybeSingle<{ gmail_email: string }>();

  const { error } = await getSupabaseAdmin().from("follow_up_reminders").insert({
    user_id: auth.user.id,
    user_email: auth.user.email,
    gmail_email: connection?.gmail_email ?? null,
    source_message_id: sourceMessageId,
    source_thread_id: sourceThreadId || null,
    source_subject: sourceSubject || null,
    due_at: new Date(dueTime).toISOString(),
    status: "pending",
  });

  if (error) {
    console.error("Follow-up reminder create failed", error);
    return jsonError("Could not save follow-up reminder.", 500);
  }

  return NextResponse.json({ ok: true });
}
