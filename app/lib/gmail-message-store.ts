import OpenAI from "openai";
import { getMessageDetail, GmailMessageDetail, GmailMessageSummary } from "./gmail";
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

const summarySchema = {
  type: "object",
  properties: {
    messages: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          summary: {
            type: "string",
            description: "One plain-English sentence summarizing what the email says.",
          },
        },
        required: ["id", "summary"],
        additionalProperties: false,
      },
    },
  },
  required: ["messages"],
  additionalProperties: false,
} as const;

type SummaryResponse = {
  messages: Array<{
    id: string;
    summary: string;
  }>;
};

function getSummaryModel() {
  return process.env.OPENAI_SUMMARY_MODEL ?? process.env.OPENAI_TRIAGE_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-5.4-mini";
}

function fallbackSummary(message: GmailMessageSummary) {
  const text = (message.snippet || message.subject || "No preview available.")
    .replace(/\s+/g, " ")
    .trim();

  return text.length > 220 ? `${text.slice(0, 217).trim()}...` : text;
}

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

function isSummarySchemaMissing(error: { message?: string }) {
  const message = error.message?.toLowerCase() ?? "";

  return message.includes("ai_summary") || message.includes("summary_model") || message.includes("summarized_at");
}

async function loadStoredSummaries(userId: string, gmailMessageIds: string[]) {
  const ids = [...new Set(gmailMessageIds.filter(Boolean))];

  if (!ids.length) {
    return { summaries: new Map<string, string>(), available: true };
  }

  const { data, error } = await getSupabaseAdmin()
    .from("gmail_messages")
    .select("gmail_message_id,ai_summary")
    .eq("user_id", userId)
    .in("gmail_message_id", ids)
    .returns<Array<{ gmail_message_id: string; ai_summary: string | null }>>();

  if (error) {
    console.error("Stored Gmail summary lookup failed", error);
    return { summaries: new Map<string, string>(), available: !isSummarySchemaMissing(error) };
  }

  return {
    summaries: new Map(
      (data ?? []).flatMap((row) => {
        const summary = row.ai_summary?.trim();

        return summary ? [[row.gmail_message_id, summary] as const] : [];
      }),
    ),
    available: true,
  };
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

async function generateMessageSummaries(messages: GmailMessageDetail[]) {
  const fallback = new Map(messages.map((message) => [message.id, fallbackSummary(message)]));

  if (!messages.length) {
    return { summaries: fallback, persistable: new Map<string, string>(), model: null };
  }

  if (!process.env.OPENAI_API_KEY) {
    return { summaries: fallback, persistable: new Map<string, string>(), model: null };
  }

  const model = getSummaryModel();
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const response = await client.responses.create({
      model,
      input: [
        {
          role: "system",
          content:
            "You summarize Gmail messages for a small business inbox. Write one short sentence that tells the owner what the email actually says. Be concrete, neutral, and do not suggest a reply.",
        },
        {
          role: "user",
          content: JSON.stringify({
            instructions:
              "Summarize each message in one sentence under 28 words. Include the customer's main request, issue, or update when present.",
            messages: messages.map((message) => ({
              id: message.id,
              from: message.from.slice(0, 160),
              subject: message.subject.slice(0, 180),
              snippet: message.snippet.replace(/\s+/g, " ").trim().slice(0, 500),
              body: message.body.replace(/\s+/g, " ").trim().slice(0, 4000),
            })),
          }),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "gibraltar_email_summaries",
          strict: true,
          schema: summarySchema,
        },
      },
    });

    const parsed = JSON.parse(response.output_text) as SummaryResponse;
    const persistable = new Map(
      parsed.messages.flatMap((message) => {
        const summary = message.summary.trim().replace(/\s+/g, " ").slice(0, 280);

        return summary ? [[message.id, summary] as const] : [];
      }),
    );

    return {
      summaries: new Map(
        messages.map((message) => [
          message.id,
          persistable.get(message.id) ?? fallback.get(message.id) ?? fallbackSummary(message),
        ]),
      ),
      persistable,
      model,
    };
  } catch (error) {
    console.error("AI email summary failed", error);
    return { summaries: fallback, persistable: new Map<string, string>(), model: null };
  }
}

async function persistSummaries({
  userId,
  summaryById,
  model,
}: {
  userId: string;
  summaryById: Map<string, string>;
  model: string | null;
}) {
  if (!summaryById.size) {
    return;
  }

  const summarizedAt = new Date().toISOString();

  await Promise.all(
    [...summaryById.entries()].map(async ([messageId, summary]) => {
      const { error } = await getSupabaseAdmin()
        .from("gmail_messages")
        .update({
          ai_summary: summary,
          summary_model: model,
          summarized_at: summarizedAt,
        })
        .eq("user_id", userId)
        .eq("gmail_message_id", messageId);

      if (error) {
        console.error("Stored Gmail summary update failed", error);
      }
    }),
  );
}

export async function summarizeAndStoreMessages({
  user,
  accessToken,
  messages,
  details = [],
}: {
  user: AuthenticatedUser;
  accessToken: string;
  messages: GmailMessageSummary[];
  details?: GmailMessageDetail[];
}) {
  const stored = await loadStoredSummaries(
    user.id,
    messages.map((message) => message.id),
  );
  const missing = messages.filter((message) => !stored.summaries.has(message.id));

  if (!stored.available) {
    return new Map(messages.map((message) => [message.id, fallbackSummary(message)]));
  }

  if (!missing.length) {
    return new Map(messages.map((message) => [message.id, stored.summaries.get(message.id) ?? fallbackSummary(message)]));
  }

  const detailsById = new Map(details.map((message) => [message.id, message]));
  const existingDetails = missing.flatMap((message) => {
    const detail = detailsById.get(message.id);

    return detail ? [detail] : [];
  });
  const missingDetails = missing.filter((message) => !detailsById.has(message.id));
  const detailResults = await Promise.allSettled(
    missingDetails.map((message) => getMessageDetail(accessToken, message.id)),
  );
  const fetchedDetails = detailResults.flatMap((result) =>
    result.status === "fulfilled" ? [result.value] : [],
  );

  const skippedCount = detailResults.filter((result) => result.status === "rejected").length;

  if (skippedCount > 0) {
    console.warn(`Skipped ${skippedCount} Gmail message summary detail read(s).`);
  }

  const generated = await generateMessageSummaries([...existingDetails, ...fetchedDetails]);
  await persistSummaries({
    userId: user.id,
    summaryById: generated.persistable,
    model: generated.model,
  });

  return new Map(
    messages.map((message) => [
      message.id,
      stored.summaries.get(message.id) ?? generated.summaries.get(message.id) ?? fallbackSummary(message),
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

export async function restoreMessageFromJunk({
  userId,
  messageId,
}: {
  userId: string;
  messageId: string;
}) {
  const { error } = await getSupabaseAdmin()
    .from("gmail_messages")
    .update({
      is_junk: false,
      junked_at: null,
    })
    .eq("user_id", userId)
    .eq("gmail_message_id", messageId);

  if (error) {
    console.error("Stored Gmail junk restore failed", error);
    throw new Error("Could not restore that message.");
  }
}
