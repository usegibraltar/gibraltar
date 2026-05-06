import { NextResponse } from "next/server";
import { getBearerToken, jsonError } from "../../../lib/api";
import { getFreshAccessToken, getThreadDetail } from "../../../lib/gmail";
import { getSupabaseAdmin, GmailConnection, requireApprovedUser } from "../../../lib/supabase";

type DraftAnalyticsRow = {
  status: "created" | "failed";
  created_at: string;
  variant_label: string | null;
  sent_at: string | null;
  source_thread_id: string | null;
  source_subject: string | null;
};

export async function GET(request: Request) {
  const auth = await requireApprovedUser(getBearerToken(request));

  if (!auth.user) {
    return jsonError(auth.error, auth.status);
  }

  const since = new Date();
  since.setDate(since.getDate() - 30);

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("gmail_draft_events")
    .select("status,created_at,variant_label,sent_at,source_thread_id,source_subject")
    .eq("user_id", auth.user.id)
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false })
    .limit(250);

  if (error) {
    if (
      error.message.toLowerCase().includes("variant_label") ||
      error.message.toLowerCase().includes("sent_at") ||
      error.message.toLowerCase().includes("source_thread_id")
    ) {
      return NextResponse.json({
        enabled: false,
        message: "Run the latest Supabase SQL to enable variant analytics.",
        summary: emptySummary(),
      });
    }

    console.error("Draft analytics lookup failed", error);
    return jsonError("Could not load draft analytics.", 500);
  }

  const rows = (data ?? []) as DraftAnalyticsRow[];
  const sentRows = rows.filter((row) => row.sent_at && row.source_thread_id);
  const respondedEventKeys = await findRespondedEvents({
    rows: sentRows,
    userId: auth.user.id,
  });
  const created = rows.filter((row) => row.status === "created").length;
  const failed = rows.filter((row) => row.status === "failed").length;
  const sent = rows.filter((row) => row.sent_at).length;
  const responded = respondedEventKeys.size;
  const variants = new Map<string, { label: string; created: number; sent: number; responded: number; conversionRate: number; failed: number; total: number }>();
  const daily = new Map<string, number>();

  for (const row of rows) {
    const label = row.variant_label || "Original";
    const current = variants.get(label) ?? {
      label,
      created: 0,
      sent: 0,
      responded: 0,
      conversionRate: 0,
      failed: 0,
      total: 0,
    };
    current.total += 1;

    if (row.status === "created") {
      current.created += 1;
    } else {
      current.failed += 1;
    }
    if (row.sent_at) {
      current.sent += 1;
    }
    if (row.sent_at && row.source_thread_id && respondedEventKeys.has(eventKey(row))) {
      current.responded += 1;
    }

    variants.set(label, current);

    if (row.status === "created") {
      const day = row.created_at.slice(0, 10);
      daily.set(day, (daily.get(day) ?? 0) + 1);
    }
  }

  return NextResponse.json({
    enabled: true,
    summary: {
      windowDays: 30,
      total: rows.length,
      created,
      sent,
      responded,
      failed,
      successRate: rows.length ? Math.round((created / rows.length) * 100) : 0,
      sendRate: created ? Math.round((sent / created) * 100) : 0,
      conversionRate: sent ? Math.round((responded / sent) * 100) : 0,
      variants: Array.from(variants.values())
        .map((variant) => ({
          ...variant,
          conversionRate: variant.sent ? Math.round((variant.responded / variant.sent) * 100) : 0,
        }))
        .sort((a, b) => b.sent - a.sent),
      daily: Array.from(daily.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      recentSubjects: rows
        .filter((row) => row.status === "created" && row.source_subject)
        .slice(0, 5)
        .map((row) => row.source_subject),
    },
  });
}

async function findRespondedEvents({
  rows,
  userId,
}: {
  rows: DraftAnalyticsRow[];
  userId: string;
}) {
  const responded = new Set<string>();

  if (!rows.length) {
    return responded;
  }

  const { data: connection } = await getSupabaseAdmin()
    .from("gmail_connections")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle<GmailConnection>();

  if (!connection) {
    return responded;
  }

  const accessToken = await getFreshAccessToken(connection);
  const uniqueThreadIds = Array.from(
    new Set(rows.map((row) => row.source_thread_id).filter((threadId): threadId is string => Boolean(threadId))),
  );
  const threadResults = await Promise.allSettled(
    uniqueThreadIds.map(async (threadId) => [threadId, await getThreadDetail(accessToken, threadId)] as const),
  );
  const threads = new Map(
    threadResults.flatMap((result) => (result.status === "fulfilled" ? [result.value] : [])),
  );

  for (const row of rows) {
    if (!row.sent_at || !row.source_thread_id) {
      continue;
    }

    const sentAt = Date.parse(row.sent_at);
    const thread = threads.get(row.source_thread_id);

    if (!Number.isFinite(sentAt) || !thread) {
      continue;
    }

    const hasResponse = thread.messages.some((message) => {
      const messageDate = message.internalDate
        ? Number(message.internalDate)
        : Date.parse(message.date);

      return (
        !message.labelIds.includes("SENT") &&
        Number.isFinite(messageDate) &&
        messageDate > sentAt + 60_000
      );
    });

    if (hasResponse) {
      responded.add(eventKey(row));
    }
  }

  return responded;
}

function eventKey(row: DraftAnalyticsRow) {
  return `${row.source_thread_id ?? ""}:${row.sent_at ?? ""}:${row.variant_label ?? "Original"}`;
}

function emptySummary() {
  return {
    windowDays: 30,
    total: 0,
    created: 0,
    failed: 0,
    sent: 0,
    responded: 0,
    successRate: 0,
    sendRate: 0,
    conversionRate: 0,
    variants: [],
    daily: [],
    recentSubjects: [],
  };
}
