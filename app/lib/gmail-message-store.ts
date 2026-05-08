import { GmailMessageSummary } from "./gmail";
import { AuthenticatedUser, getSupabaseAdmin } from "./supabase";
import {
  defaultTriage,
  MessageTriage,
  normalizeTriage,
  triageMessagesWithMetadata,
} from "./triage";

type StoredGmailMessage = {
  gmail_message_id: string;
  triage_category: string;
  triage_urgency: string;
  triage_needs_reply: boolean;
  triage_reason: string;
  is_junk: boolean | null;
};

type TriageAndStoreMessagesParams = {
  user: AuthenticatedUser;
  gmailEmail: string;
  messages: GmailMessageSummary[];
};

export async function loadStoredTriage(userId: string, gmailMessageIds: string[]) {
  const ids = [...new Set(gmailMessageIds.filter(Boolean))];

  if (!ids.length) {
    return new Map<string, MessageTriage>();
  }

  const { data, error } = await getSupabaseAdmin()
    .from("gmail_messages")
    .select(
      "gmail_message_id,triage_category,triage_urgency,triage_needs_reply,triage_reason,is_junk",
    )
    .eq("user_id", userId)
    .in("gmail_message_id", ids)
    .returns<StoredGmailMessage[]>();

  if (error) {
    console.error("Stored Gmail triage lookup failed", error);
    return new Map<string, MessageTriage>();
  }

  return new Map(
    (data ?? []).map((row) => [
      row.gmail_message_id,
      normalizeTriage({
        category: row.triage_category,
        urgency: row.triage_urgency,
        needsReply: row.triage_needs_reply,
        reason: row.triage_reason,
      }),
    ]),
  );
}

export async function loadJunkMessageIds(userId: string, gmailMessageIds: string[]) {
  const ids = [...new Set(gmailMessageIds.filter(Boolean))];

  if (!ids.length) {
    return new Set<string>();
  }

  const { data, error } = await getSupabaseAdmin()
    .from("gmail_messages")
    .select("gmail_message_id")
    .eq("user_id", userId)
    .eq("is_junk", true)
    .in("gmail_message_id", ids)
    .returns<Array<{ gmail_message_id: string }>>();

  if (error) {
    console.error("Stored Gmail junk lookup failed", error);
    return new Set<string>();
  }

  return new Set((data ?? []).map((row) => row.gmail_message_id));
}

export async function upsertStoredMessages({
  user,
  gmailEmail,
  messages,
  triageById,
  model,
}: TriageAndStoreMessagesParams & {
  triageById: Map<string, MessageTriage>;
  model: string | null;
}) {
  const rows = messages.flatMap((message) => {
    const triage = triageById.get(message.id);

    if (!triage) {
      return [];
    }

    return [
      {
        user_id: user.id,
        user_email: user.email,
        gmail_email: gmailEmail,
        gmail_message_id: message.id,
        gmail_thread_id: message.threadId,
        internal_date: message.internalDate || null,
        from_email: message.from || null,
        subject: message.subject || null,
        date_header: message.date || null,
        snippet: message.snippet || null,
        triage_category: triage.category,
        triage_urgency: triage.urgency,
        triage_needs_reply: triage.needsReply,
        triage_reason: triage.reason,
        triage_model: model,
        triaged_at: new Date().toISOString(),
        is_junk: false,
      },
    ];
  });

  if (!rows.length) {
    return;
  }

  const { error } = await getSupabaseAdmin()
    .from("gmail_messages")
    .upsert(rows, { onConflict: "user_id,gmail_message_id" });

  if (error) {
    console.error("Stored Gmail triage upsert failed", error);
  }
}

export async function triageAndStoreMessages({
  user,
  gmailEmail,
  messages,
}: TriageAndStoreMessagesParams) {
  const stored = await loadStoredTriage(
    user.id,
    messages.map((message) => message.id),
  );
  const missing = messages.filter((message) => !stored.has(message.id));

  if (!missing.length) {
    return new Map(messages.map((message) => [message.id, stored.get(message.id) ?? defaultTriage]));
  }

  const scanned = await triageMessagesWithMetadata(missing);
  const persistable = new Map(
    missing.flatMap((message) => {
      const source = scanned.sources.get(message.id);
      const triage = scanned.triage.get(message.id);

      return triage && (source === "ai" || source === "cache") ? [[message.id, triage] as const] : [];
    }),
  );

  await upsertStoredMessages({
    user,
    gmailEmail,
    messages: missing,
    triageById: persistable,
    model: scanned.model,
  });

  return new Map(
    messages.map((message) => [
      message.id,
      stored.get(message.id) ?? scanned.triage.get(message.id) ?? defaultTriage,
    ]),
  );
}

export async function markMessageAsJunk({
  user,
  gmailEmail,
  message,
}: {
  user: AuthenticatedUser;
  gmailEmail: string;
  message: GmailMessageSummary;
}) {
  const triage = normalizeTriage({
    category: "low_priority",
    urgency: "low",
    needsReply: false,
    reason: "Marked as junk by user.",
  });

  const { error } = await getSupabaseAdmin()
    .from("gmail_messages")
    .upsert(
      {
        user_id: user.id,
        user_email: user.email,
        gmail_email: gmailEmail,
        gmail_message_id: message.id,
        gmail_thread_id: message.threadId,
        internal_date: message.internalDate || null,
        from_email: message.from || null,
        subject: message.subject || null,
        date_header: message.date || null,
        snippet: message.snippet || null,
        triage_category: triage.category,
        triage_urgency: triage.urgency,
        triage_needs_reply: triage.needsReply,
        triage_reason: triage.reason,
        triage_model: null,
        triaged_at: new Date().toISOString(),
        is_junk: true,
        junked_at: new Date().toISOString(),
      },
      { onConflict: "user_id,gmail_message_id" },
    );

  if (error) {
    console.error("Stored Gmail junk update failed", error);
    throw new Error("Could not remove that message from review.");
  }
}
