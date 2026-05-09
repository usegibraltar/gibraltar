"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  History,
  Loader2,
  X,
} from "lucide-react";
import { AppHeader } from "../components/app-header";
import { getSupabaseBrowser } from "../lib/supabase-browser";

type DraftEvent = {
  id: string;
  source_subject: string | null;
  draft_id: string | null;
  draft_message_id?: string | null;
  reply_snapshot?: string | null;
  variant_label?: string | null;
  variant_instruction?: string | null;
  sent_at?: string | null;
  sent_message_id?: string | null;
  status: "created" | "failed";
  error_message: string | null;
  created_at: string;
};

type FollowUpReminder = {
  id: string;
  source_subject: string | null;
  source_message_id: string;
  source_thread_id: string | null;
  due_at: string;
  status: "pending" | "completed";
  created_at: string;
  completed_at: string | null;
};

export default function ActivityPage() {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [accessToken, setAccessToken] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [history, setHistory] = useState<DraftEvent[]>([]);
  const [reminders, setReminders] = useState<FollowUpReminder[]>([]);
  const [selectedDraftEvent, setSelectedDraftEvent] = useState<DraftEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompletingReminder, setIsCompletingReminder] = useState("");
  const [error, setError] = useState("");

  const authedFetch = useCallback(
    async (url: string, init: RequestInit = {}) =>
      fetch(url, {
        ...init,
        headers: {
          ...(init.headers ?? {}),
          Authorization: `Bearer ${accessToken}`,
        },
      }),
    [accessToken],
  );

  const loadActivity = useCallback(async () => {
    if (!accessToken) {
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const [historyResponse, remindersResponse] = await Promise.all([
        authedFetch("/api/gmail/history"),
        authedFetch("/api/follow-ups"),
      ]);
      const historyBody = (await historyResponse.json()) as { events?: DraftEvent[]; error?: string };
      const remindersBody = (await remindersResponse.json()) as { reminders?: FollowUpReminder[]; error?: string };

      if (!historyResponse.ok) {
        throw new Error(historyBody.error ?? "Could not load draft history.");
      }

      if (!remindersResponse.ok) {
        throw new Error(remindersBody.error ?? "Could not load follow-ups.");
      }

      setHistory(historyBody.events ?? []);
      setReminders(remindersBody.reminders ?? []);
    } catch (activityError) {
      setError(activityError instanceof Error ? activityError.message : "Could not load activity.");
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, authedFetch]);

  useEffect(() => {
    async function boot() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        window.location.replace("/login");
        return;
      }

      setAccessToken(session.access_token);
      setUserEmail(session.user.email ?? "");
    }

    void boot();
  }, [supabase]);

  useEffect(() => {
    void loadActivity();
  }, [loadActivity]);

  async function completeReminder(id: string) {
    setIsCompletingReminder(id);
    setError("");

    try {
      const response = await authedFetch(`/api/follow-ups/${id}/complete`, {
        method: "POST",
      });
      const body = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(body.error ?? "Could not complete follow-up reminder.");
      }

      await loadActivity();
    } catch (completeError) {
      setError(completeError instanceof Error ? completeError.message : "Could not complete follow-up reminder.");
    } finally {
      setIsCompletingReminder("");
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.replace("/login");
  }

  const pendingReminders = reminders.filter((reminder) => reminder.status === "pending");

  return (
    <main className="min-h-screen bg-[#f8fbff] text-[#0b132b]">
      <AppHeader active="activity" userEmail={userEmail} onSignOut={signOut} />

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/60">
          <p className="text-sm font-black uppercase text-teal-600">Activity</p>
          <h1 className="mt-1 text-3xl font-black">Follow-ups and draft history</h1>
          <p className="mt-2 max-w-3xl leading-7 text-slate-600">
            Keep the reply workspace focused while reminders and generated draft records live here.
          </p>
        </section>

        {error ? <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div> : null}

        <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/60">
            <div className="flex items-center gap-2">
              <Clock3 className="h-5 w-5 text-teal-700" aria-hidden="true" />
              <h2 className="text-2xl font-black">Follow-ups</h2>
            </div>
            <div className="mt-4 grid gap-3">
              {isLoading ? (
                <LoadingState />
              ) : pendingReminders.length ? (
                pendingReminders.map((reminder) => (
                  <ReminderItem
                    key={reminder.id}
                    reminder={reminder}
                    busy={isCompletingReminder === reminder.id}
                    onComplete={() => completeReminder(reminder.id)}
                  />
                ))
              ) : (
                <EmptyState title="No pending follow-ups" body="Follow-up reminders created while reviewing replies will appear here." />
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/60">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-teal-700" aria-hidden="true" />
              <h2 className="text-2xl font-black">Draft history</h2>
            </div>
            <div className="mt-4 grid gap-3">
              {isLoading ? (
                <LoadingState />
              ) : history.length ? (
                history.map((event) => (
                  <HistoryItem key={event.id} event={event} onOpen={() => setSelectedDraftEvent(event)} />
                ))
              ) : (
                <EmptyState title="No drafts yet" body="Draft events will appear here after you create replies from Gibraltar." />
              )}
            </div>
          </section>
        </div>
      </section>

      {selectedDraftEvent ? (
        <Modal title="Draft details" onClose={() => setSelectedDraftEvent(null)} wide>
          <DraftEventDetail event={selectedDraftEvent} />
        </Modal>
      ) : null}
    </main>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-40 items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-teal-600" aria-hidden="true" />
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">
      <h3 className="text-xl font-black">{title}</h3>
      <p className="mx-auto mt-2 max-w-md leading-7 text-slate-600">{body}</p>
    </div>
  );
}

function ReminderItem({ reminder, busy, onComplete }: { reminder: FollowUpReminder; busy: boolean; onComplete: () => void }) {
  const dueDate = new Date(reminder.due_at);
  const overdue = dueDate.getTime() < Date.now();

  return (
    <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-black">{reminder.source_subject || "(No subject)"}</p>
          <p className={`mt-2 text-sm font-bold ${overdue ? "text-red-700" : "text-slate-500"}`}>
            Due {dueDate.toLocaleString()}
          </p>
        </div>
        <button
          type="button"
          onClick={onComplete}
          disabled={busy}
          className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 transition hover:border-teal-200 hover:text-teal-700 disabled:cursor-not-allowed disabled:text-slate-300"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
          Done
        </button>
      </div>
    </article>
  );
}

function HistoryItem({ event, onOpen }: { event: DraftEvent; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="block w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-teal-200 hover:bg-white hover:shadow-sm"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="truncate font-black">{event.source_subject || "(No subject)"}</p>
        <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-black uppercase ${event.sent_at ? "bg-blue-100 text-blue-800" : event.status === "created" ? "bg-teal-100 text-teal-800" : "bg-red-100 text-red-800"}`}>
          {event.sent_at ? "sent" : event.status}
        </span>
      </div>
      <p className="mt-2 text-sm text-slate-500">
        {new Date(event.created_at).toLocaleString()}
        {event.variant_label ? ` · ${event.variant_label}` : ""}
      </p>
      {event.error_message ? <p className="mt-2 text-sm font-semibold text-red-700">{event.error_message}</p> : null}
    </button>
  );
}

function DraftEventDetail({ event }: { event: DraftEvent }) {
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <SourceBadge label={event.sent_at ? "Sent" : event.status} active={event.status === "created"} />
        <SourceBadge label={event.variant_label || "Original"} active />
      </div>
      <h2 className="mt-5 text-2xl font-black">{event.source_subject || "(No subject)"}</h2>
      <dl className="mt-5 grid gap-3 sm:grid-cols-2">
        <DraftDetailItem label="Created" value={new Date(event.created_at).toLocaleString()} />
        <DraftDetailItem label="Sent" value={event.sent_at ? new Date(event.sent_at).toLocaleString() : "Not sent from Gibraltar"} />
        <DraftDetailItem label="Draft ID" value={event.draft_id || "Not available"} />
        <DraftDetailItem label="Sent message ID" value={event.sent_message_id || "Not available"} />
      </dl>
      {event.variant_instruction ? (
        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-black uppercase text-slate-500">Variant instruction</p>
          <p className="mt-2 leading-7 text-slate-700">{event.variant_instruction}</p>
        </div>
      ) : null}
      {event.error_message ? (
        <div className="mt-5 rounded-xl border border-red-100 bg-red-50 p-4 text-sm font-semibold leading-6 text-red-700">
          {event.error_message}
        </div>
      ) : null}
      <div className="brand-scrollbar mt-5 max-h-[45vh] overflow-y-auto whitespace-pre-line rounded-xl border border-slate-200 bg-slate-50 p-5 leading-7 text-slate-700">
        {event.reply_snapshot || "Older draft events do not have a saved reply snapshot. New drafts will show their reviewed reply here."}
      </div>
      {event.draft_id && !event.sent_at ? (
        <a href="https://mail.google.com/mail/u/0/#drafts" target="_blank" rel="noreferrer" className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-teal-200 bg-white px-4 text-sm font-black text-teal-800 transition hover:-translate-y-0.5">
          Open Gmail drafts
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </a>
      ) : null}
    </div>
  );
}

function SourceBadge({ label, active }: { label: string; active: boolean }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${active ? "bg-teal-100 text-teal-800" : "bg-slate-100 text-slate-500"}`}>
      {label}
    </span>
  );
}

function DraftDetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-black uppercase text-slate-500">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function Modal({ title, children, onClose, wide = false }: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-8 backdrop-blur-sm">
      <section className={`max-h-[90vh] w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/20 ${wide ? "max-w-4xl" : "max-w-2xl"}`}>
        <header className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <h2 className="text-2xl font-black">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close modal" className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:border-red-200 hover:text-red-700">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>
        <div className="brand-scrollbar max-h-[calc(90vh-4.5rem)] overflow-y-auto p-5">{children}</div>
      </section>
    </div>
  );
}
