"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock3,
  CircleAlert,
  Loader2,
  Mail,
  PencilLine,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Unplug,
  X,
} from "lucide-react";
import { AppHeader } from "../components/app-header";
import { GoogleGIcon } from "../components/google-g-icon";
import { friendlyErrorMessage } from "../lib/friendly-error";
import { getSupabaseBrowser } from "../lib/supabase-browser";

type GmailMessage = {
  id: string;
  threadId: string;
  from: string;
  subject: string;
  date: string;
  snippet: string;
  summary?: string;
  triage?: MessageTriage;
  isJunk?: boolean;
};

type GmailMessageDetail = GmailMessage & {
  body: string;
};

type GmailThreadMessage = GmailMessageDetail & {
  labelIds: string[];
};

type GmailThreadDetail = {
  id: string;
  messages: GmailThreadMessage[];
};

type SelectedMessage = GmailMessageDetail & {
  threadMessages: GmailThreadMessage[];
};

type TriageCategory =
  | "booking"
  | "pricing"
  | "complaint"
  | "follow_up"
  | "general"
  | "low_priority";

type MessageTriage = {
  category: TriageCategory;
  urgency: "high" | "medium" | "low";
  needsReply: boolean;
  reason: string;
};

type MessagesPayload = {
  connected: boolean;
  gmailEmail?: string;
  messages: GmailMessage[];
  nextPageToken?: string | null;
  resultSizeEstimate?: number;
  error?: string;
};

type BusinessProfile = {
  businessName: string;
  businessType: string;
  replyTone: string;
  services: string;
  bookingLink: string;
  phone: string;
  hours: string;
  neverPromise: string;
  voiceProfile: string;
  voiceSampleCount?: number;
  voiceLearnedAt?: string | null;
};

type DraftPayload = {
  ok?: boolean;
  draftId?: string;
  reply?: string;
  sent?: boolean;
  error?: string;
};

type ReplyPayload = {
  ok?: boolean;
  reply?: string;
  sources?: ReplySources;
  confidence?: ReplyConfidence;
  riskFlags?: string[];
  recommendedAction?: string;
  missingContext?: string[];
  playbook?: ReplyPlaybookSummary | null;
  playbookReason?: string;
  error?: string;
};

type ReplySources = {
  businessContext: boolean;
  voiceProfile: boolean;
  threadMessages: number;
  playbook?: boolean;
};

type ReplyConfidence = "high" | "medium" | "low";

type ReplyGuidance = {
  confidence: ReplyConfidence;
  riskFlags: string[];
  recommendedAction: string;
  missingContext: string[];
  playbook: ReplyPlaybookSummary | null;
  playbookReason: string;
};

type ReplyPlaybook = {
  id: string;
  title: string;
  category: PlaybookCategory;
  guidance: string;
  default_cta: string | null;
  enabled: boolean;
};

type ReplyPlaybookSummary = {
  id: string;
  title: string;
  category: string;
};

type PlaybookCategory =
  | "pricing"
  | "booking"
  | "cancellation"
  | "complaint"
  | "follow_up"
  | "general";

type SearchChip = {
  label: string;
  query: string;
};

type InboxLane = "needs_reply" | "urgent" | "booking" | "complaint" | "low_priority" | "junk";

const inboxLanes: Array<{ label: string; value: InboxLane }> = [
  { label: "Needs reply", value: "needs_reply" },
  { label: "Urgent", value: "urgent" },
  { label: "Bookings", value: "booking" },
  { label: "Issues", value: "complaint" },
  { label: "Low priority", value: "low_priority" },
  { label: "Junk removed", value: "junk" },
];

const searchChips: SearchChip[] = [
  { label: "Unread", query: "is:unread" },
  { label: "This week", query: "newer_than:7d" },
  { label: "Starred", query: "is:starred" },
  { label: "Sent", query: "in:sent newer_than:30d" },
  { label: "Has attachment", query: "has:attachment" },
  { label: "Needs reply", query: "-from:me newer_than:30d" },
];

const noPlaybookValue = "__none";

const emptyProfile: BusinessProfile = {
  businessName: "",
  businessType: "",
  replyTone: "Friendly",
  services: "",
  bookingLink: "",
  phone: "",
  hours: "",
  neverPromise: "",
  voiceProfile: "",
  voiceSampleCount: 0,
  voiceLearnedAt: null,
};

export default function AppPage() {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [accessToken, setAccessToken] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [payload, setPayload] = useState<MessagesPayload>({ connected: false, messages: [] });
  const [profile, setProfile] = useState<BusinessProfile>(emptyProfile);
  const [playbooks, setPlaybooks] = useState<ReplyPlaybook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isGeneratingReply, setIsGeneratingReply] = useState("");
  const [isDrafting, setIsDrafting] = useState("");
  const [isLoadingMessageDetail, setIsLoadingMessageDetail] = useState("");
  const [isRemovingJunk, setIsRemovingJunk] = useState("");
  const [isCreatingReminder, setIsCreatingReminder] = useState("");
  const [reviewMessageId, setReviewMessageId] = useState("");
  const [reviewThreadId, setReviewThreadId] = useState("");
  const [reviewMessageSubject, setReviewMessageSubject] = useState("");
  const [reviewSummary, setReviewSummary] = useState("");
  const [reviewRecipient, setReviewRecipient] = useState("");
  const [reviewReply, setReviewReply] = useState("");
  const [reviewVariantLabel, setReviewVariantLabel] = useState("Original");
  const [reviewVariantInstruction, setReviewVariantInstruction] = useState("");
  const [reviewSources, setReviewSources] = useState<ReplySources | null>(null);
  const [reviewTriage, setReviewTriage] = useState<MessageTriage | null>(null);
  const [reviewGuidance, setReviewGuidance] = useState<ReplyGuidance | null>(null);
  const [selectedPlaybookId, setSelectedPlaybookId] = useState("");
  const [activeLane, setActiveLane] = useState<InboxLane>("needs_reply");
  const [searchQuery, setSearchQuery] = useState("");
  const [senderFilter, setSenderFilter] = useState("");
  const [searchShortcutOpen, setSearchShortcutOpen] = useState(false);
  const [latestReply, setLatestReply] = useState("");
  const [selectedMessage, setSelectedMessage] = useState<SelectedMessage | null>(null);
  const [confirmSendOpen, setConfirmSendOpen] = useState(false);
  const [onboardingEvents, setOnboardingEvents] = useState<string[]>([]);
  const [showTour, setShowTour] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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

  const loadMessages = useCallback(async (
    token: string,
    query = "",
    options: { pageToken?: string; append?: boolean } = {},
  ) => {
    if (!token) {
      return;
    }

    if (options.append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }
    setError("");

    try {
      const params = new URLSearchParams();
      if (query.trim()) {
        params.set("q", query.trim());
      }
      if (options.pageToken) {
        params.set("pageToken", options.pageToken);
      }
      params.set("includeJunk", "true");
      const response = await fetch(`/api/gmail/messages${params.size ? `?${params.toString()}` : ""}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = (await response.json()) as MessagesPayload;

      if (!response.ok) {
        throw new Error(body.error ?? "Could not load Gmail messages.");
      }

      setPayload((current) => {
        if (!options.append) {
          return body;
        }

        const seen = new Set(current.messages.map((message) => message.id));
        const newMessages = body.messages.filter((message) => !seen.has(message.id));

        return {
          ...body,
          gmailEmail: body.gmailEmail ?? current.gmailEmail,
          messages: [...current.messages, ...newMessages],
        };
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load Gmail messages.");
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  const loadProfile = useCallback(async () => {
    if (!accessToken) {
      return;
    }

    const response = await authedFetch("/api/profile");
    const body = (await response.json()) as { profile?: BusinessProfile };

    if (response.ok && body.profile) {
      setProfile(body.profile);
    }
  }, [accessToken, authedFetch]);

  const loadPlaybooks = useCallback(async () => {
    if (!accessToken) {
      return;
    }

    const response = await authedFetch("/api/playbooks");
    const body = (await response.json()) as { playbooks?: ReplyPlaybook[] };

    if (response.ok) {
      setPlaybooks(body.playbooks ?? []);
    }
  }, [accessToken, authedFetch]);

  const loadOnboarding = useCallback(async () => {
    if (!accessToken) {
      return;
    }

    const response = await authedFetch("/api/onboarding");
    const body = (await response.json()) as { events?: Array<{ event_key: string }> };

    if (response.ok) {
      setOnboardingEvents((body.events ?? []).map((event) => event.event_key));
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
      await loadMessages(session.access_token);
    }

    void boot();
  }, [loadMessages, supabase]);

  useEffect(() => {
    void loadProfile();
    void loadPlaybooks();
    void loadOnboarding();
  }, [loadOnboarding, loadPlaybooks, loadProfile]);

  useEffect(() => {
    setShowTour(window.localStorage.getItem("gibraltar_onboarding_dismissed") !== "true");
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get("gmail") === "connected") {
      setSuccess("Gmail is connected.");
      window.history.replaceState({}, "", "/app");
      if (accessToken) {
        void loadMessages(accessToken);
      }
    }

    if (params.get("gmail") === "error") {
      setError(params.get("message") ?? "Could not connect Gmail.");
      window.history.replaceState({}, "", "/app");
    }
  }, [accessToken, loadMessages]);

  async function connectGmail() {
    setIsConnecting(true);
    setError("");

    try {
      const response = await authedFetch("/api/gmail/connect");
      const body = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !body.url) {
        throw new Error(body.error ?? "Could not start Gmail connection.");
      }

      window.location.href = body.url;
    } catch (connectError) {
      setError(connectError instanceof Error ? connectError.message : "Could not start Gmail connection.");
      setIsConnecting(false);
    }
  }

  async function disconnectGmail() {
    setIsDisconnecting(true);
    setError("");
    setSuccess("");

    try {
      const response = await authedFetch("/api/gmail/disconnect", { method: "POST" });
      const body = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(body.error ?? "Could not disconnect Gmail.");
      }

      setPayload({ connected: false, messages: [] });
      setSuccess("Gmail disconnected.");
    } catch (disconnectError) {
      setError(disconnectError instanceof Error ? disconnectError.message : "Could not disconnect Gmail.");
    } finally {
      setIsDisconnecting(false);
    }
  }

  const laneMessages = payload.messages.filter((message) => {
    if (activeLane === "junk") {
      return Boolean(message.isJunk);
    }

    if (message.isJunk) {
      return false;
    }

    if (activeLane === "needs_reply") {
      return message.triage?.needsReply ?? true;
    }

    if (activeLane === "urgent") {
      return message.triage?.urgency === "high";
    }

    return message.triage?.category === activeLane;
  });

  const filteredMessages = laneMessages.filter((message) => {
    const sender = senderFilter.trim().toLowerCase();

    if (sender && !message.from.toLowerCase().includes(sender)) {
      return false;
    }

    return true;
  });

  const laneCounts = inboxLanes.reduce<Record<InboxLane, number>>(
    (counts, lane) => ({
      ...counts,
      [lane.value]: payload.messages.filter((message) => {
        if (lane.value === "junk") {
          return Boolean(message.isJunk);
        }

        if (message.isJunk) {
          return false;
        }

        if (lane.value === "needs_reply") {
          return message.triage?.needsReply ?? true;
        }

        if (lane.value === "urgent") {
          return message.triage?.urgency === "high";
        }

        return message.triage?.category === lane.value;
      }).length,
    }),
    {
      needs_reply: 0,
      urgent: 0,
      booking: 0,
      complaint: 0,
      low_priority: 0,
      junk: 0,
    },
  );

  async function generateReply(message: GmailMessage, instruction = "", variantLabel = instruction ? "Custom" : "Original") {
    setIsGeneratingReply(message.id);
    setError("");
    setSuccess("");
    setLatestReply("");
    setReviewMessageId(message.id);
    setReviewThreadId(message.threadId);
    setReviewMessageSubject(message.subject);
    setReviewSummary(message.summary || "");
    setReviewRecipient(message.from);
    setReviewTriage(message.triage ?? null);
    setReviewVariantLabel(variantLabel);
    setReviewVariantInstruction(instruction);
    setReviewGuidance(null);

    try {
      const response = await authedFetch("/api/gmail/replies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId: message.id,
          instruction,
          triage: message.triage,
          playbookId: selectedPlaybookId || undefined,
        }),
      });
      const body = (await response.json()) as ReplyPayload;

      if (!response.ok || !body.reply) {
        throw new Error(body.error ?? "Could not generate reply.");
      }

      setReviewReply(body.reply);
      setReviewSources(body.sources ?? null);
      setReviewGuidance({
        confidence: body.confidence ?? "medium",
        riskFlags: body.riskFlags ?? [],
        recommendedAction: body.recommendedAction ?? "Review reply",
        missingContext: body.missingContext ?? [],
        playbook: body.playbook ?? null,
        playbookReason: body.playbookReason ?? "Gibraltar selected reply guidance for this draft.",
      });
      if (body.playbook?.id) {
        setSelectedPlaybookId(body.playbook.id);
      }
      await saveOnboardingEvent("first_reply_generated");
      setSuccess("Reply ready to review.");
    } catch (replyError) {
      setError(friendlyErrorMessage(replyError, "Could not generate reply."));
    } finally {
      setIsGeneratingReply("");
    }
  }

  async function openMessage(message: GmailMessage) {
    setIsLoadingMessageDetail(message.id);
    setError("");

    try {
      const response = await authedFetch(`/api/gmail/messages/${encodeURIComponent(message.id)}`);
      const body = (await response.json()) as {
        message?: GmailMessageDetail;
        thread?: GmailThreadDetail;
        error?: string;
      };

      if (!response.ok || !body.message) {
        throw new Error(body.error ?? "Could not read that Gmail message.");
      }

      setSelectedMessage({
        ...body.message,
        threadMessages: body.thread?.messages ?? [{ ...body.message, labelIds: [] }],
      });
    } catch (messageError) {
      setError(messageError instanceof Error ? messageError.message : "Could not read that Gmail message.");
    } finally {
      setIsLoadingMessageDetail("");
    }
  }

  async function removeJunk(message: GmailMessage) {
    setIsRemovingJunk(message.id);
    setError("");
    setSuccess("");

    try {
      const response = await authedFetch(`/api/gmail/messages/${encodeURIComponent(message.id)}/junk`, {
        method: "POST",
      });
      const body = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(body.error ?? "Could not remove that message from review.");
      }

      setPayload((current) => ({
        ...current,
        messages: current.messages.map((currentMessage) =>
          currentMessage.id === message.id ? { ...currentMessage, isJunk: true } : currentMessage,
        ),
      }));
      if (selectedMessage?.id === message.id) {
        setSelectedMessage(null);
      }
      setSuccess("Message removed from Gibraltar review.");
    } catch (junkError) {
      setError(junkError instanceof Error ? junkError.message : "Could not remove that message from review.");
    } finally {
      setIsRemovingJunk("");
    }
  }

  async function restoreJunk(message: GmailMessage) {
    setIsRemovingJunk(message.id);
    setError("");
    setSuccess("");

    try {
      const response = await authedFetch(`/api/gmail/messages/${encodeURIComponent(message.id)}/junk`, {
        method: "DELETE",
      });
      const body = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(body.error ?? "Could not restore that message.");
      }

      setPayload((current) => ({
        ...current,
        messages: current.messages.map((currentMessage) =>
          currentMessage.id === message.id ? { ...currentMessage, isJunk: false } : currentMessage,
        ),
      }));
      setSuccess("Message restored to Gibraltar review.");
    } catch (junkError) {
      setError(junkError instanceof Error ? junkError.message : "Could not restore that message.");
    } finally {
      setIsRemovingJunk("");
    }
  }

  async function createDraft(messageId: string, reply: string, sendNow = false) {
    setIsDrafting(messageId);
    setError("");
    setSuccess("");

    try {
      const response = await authedFetch("/api/gmail/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId,
          reply,
          sendNow,
          variantLabel: reviewVariantLabel,
          variantInstruction: reviewVariantInstruction,
          playbookId: reviewGuidance?.playbook?.id,
          playbookTitle: reviewGuidance?.playbook?.title,
          playbookCategory: reviewGuidance?.playbook?.category,
        }),
      });
      const body = (await response.json()) as DraftPayload;

      if (!response.ok) {
        throw new Error(body.error ?? "Could not create Gmail draft.");
      }

      setSuccess(body.sent ? "Email sent from Gmail." : "Draft created in Gmail.");
      setLatestReply(body.reply ?? "");
      setPayload((current) => ({
        ...current,
        messages: current.messages.map((message) =>
          message.id === messageId
            ? {
                ...message,
                triage: message.triage
                  ? {
                      ...message.triage,
                      needsReply: false,
                      reason: body.sent ? "Handled by sending a Gibraltar reply." : "Handled by creating a Gibraltar draft.",
                    }
                  : message.triage,
              }
            : message,
        ),
      }));
      setReviewMessageId("");
      setReviewThreadId("");
      setReviewMessageSubject("");
      setReviewSummary("");
      setReviewRecipient("");
      setReviewReply("");
      setReviewSources(null);
      setReviewTriage(null);
      setReviewGuidance(null);
      setSelectedPlaybookId("");
      setReviewVariantLabel("Original");
      setReviewVariantInstruction("");
      await saveOnboardingEvent("first_email_created");
    } catch (draftError) {
      setError(friendlyErrorMessage(draftError, "Could not create Gmail draft."));
    } finally {
      setIsDrafting("");
    }
  }

  async function saveOnboardingEvent(eventKey: string) {
    if (!accessToken || onboardingEvents.includes(eventKey)) {
      return;
    }

    const response = await authedFetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventKey }),
    });

    if (response.ok) {
      setOnboardingEvents((current) => Array.from(new Set([...current, eventKey])));
    }
  }

  function dueDateForOffset(days: number) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    date.setHours(9, 0, 0, 0);
    return date.toISOString();
  }

  async function createReminder(days: number) {
    setIsCreatingReminder(String(days));
    setError("");
    setSuccess("");

    try {
      const response = await authedFetch("/api/follow-ups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceMessageId: reviewMessageId,
          sourceThreadId: reviewThreadId,
          sourceSubject: reviewMessageSubject,
          dueAt: dueDateForOffset(days),
        }),
      });
      const body = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(body.error ?? "Could not save follow-up reminder.");
      }

      setSuccess("Follow-up reminder saved. You can manage it from Activity.");
    } catch (reminderError) {
      setError(reminderError instanceof Error ? reminderError.message : "Could not save follow-up reminder.");
    } finally {
      setIsCreatingReminder("");
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.replace("/login");
  }

  function searchGmail(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    void loadMessages(accessToken, searchQuery);
  }

  function applySearchChip(query: string) {
    setSearchQuery(query);
    setSenderFilter("");
    setSearchShortcutOpen(false);
    void loadMessages(accessToken, query);
  }

  function loadMoreMessages() {
    if (!payload.nextPageToken) {
      return;
    }

    void loadMessages(accessToken, searchQuery, {
      append: true,
      pageToken: payload.nextPageToken,
    });
  }

  function dismissTour() {
    window.localStorage.setItem("gibraltar_onboarding_dismissed", "true");
    setShowTour(false);
  }

  const draftWarnings = getDraftWarnings({
    profile,
    reply: reviewReply,
    subject: reviewMessageSubject,
    triage: reviewTriage,
  });
  const setupItems = [
    { label: "Connect Gmail", done: payload.connected, action: "Connect", href: null },
    { label: "Add business context", done: Boolean(profile.businessName || profile.services), action: "Open settings", href: "/settings" },
    { label: "Learn owner voice", done: Boolean(profile.voiceProfile), action: "Open settings", href: "/settings" },
    { label: "Generate a first reply", done: onboardingEvents.includes("first_reply_generated") || Boolean(reviewReply || latestReply), action: "Choose email", href: null },
    { label: "Create or send first email", done: onboardingEvents.includes("first_email_created") || Boolean(latestReply), action: "Review draft", href: null },
  ];
  const setupComplete = setupItems.every((item) => item.done);
  const showSetupChecklist = !setupComplete;

  return (
    <main className="min-h-screen bg-[#f8fbff] text-[#0b132b]">
      <AppHeader active="replies" userEmail={userEmail} onSignOut={signOut} />

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/60">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-black uppercase text-teal-600">Reply engine</p>
              <h1 className="mt-1 text-3xl font-black">Customer replies, ready for review</h1>
              <p className="mt-2 max-w-3xl leading-7 text-slate-600">
                Gibraltar turns triaged Gmail messages into clear drafts with confidence, risk, and context guidance before anything leaves your desk.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={connectGmail} disabled={isConnecting || !accessToken} className="google-auth-button group inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-black shadow-sm shadow-slate-200/70 transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:hover:translate-y-0">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200 transition group-hover:ring-slate-300">
                  {isConnecting ? <Loader2 className="h-4 w-4 animate-spin text-slate-500" aria-hidden="true" /> : <GoogleGIcon className="h-4 w-4" />}
                </span>
                {payload.connected ? "Reconnect Gmail" : "Connect Gmail"}
              </button>
              <button type="button" onClick={disconnectGmail} disabled={isDisconnecting || !payload.connected} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:border-red-200 hover:text-red-700 disabled:cursor-not-allowed disabled:text-slate-300">
                {isDisconnecting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Unplug className="h-4 w-4" aria-hidden="true" />}
                Disconnect
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <StatusPill label="Gmail" value={payload.connected ? payload.gmailEmail ?? "Connected" : "Not connected"} done={payload.connected} />
            <StatusPill label="Context" value={profile.businessName || profile.services ? "Ready" : "Not added"} done={Boolean(profile.businessName || profile.services)} />
            <StatusPill label="Voice" value={profile.voiceProfile ? `Learned from ${profile.voiceSampleCount ?? 0}` : "Optional"} done={Boolean(profile.voiceProfile)} />
          </div>
        </section>

        {error ? <PageNotice tone="error" text={error} /> : null}
        {success ? <PageNotice tone="success" text={success} /> : null}

        {showSetupChecklist ? (
          <SetupChecklist
            items={setupItems}
            onConnect={connectGmail}
          />
        ) : null}
        {showTour ? <FirstRunTour onDismiss={dismissTour} /> : null}

        <div className="mt-6 grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
          <section className="flex max-h-[90vh] min-h-[44rem] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60 lg:max-h-[calc(100vh-3rem)]">
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 p-5">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-black uppercase text-teal-600">Inbox</p>
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-xs font-black uppercase text-blue-700">
                    <Sparkles className="h-3 w-3" aria-hidden="true" />
                    AI triage
                  </span>
                </div>
                <h2 className="text-2xl font-black">Choose a message</h2>
                {payload.connected ? (
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    Showing {payload.messages.length}
                    {payload.resultSizeEstimate ? ` of about ${payload.resultSizeEstimate}` : ""} Gmail results
                  </p>
                ) : null}
              </div>
              <button type="button" onClick={() => loadMessages(accessToken)} disabled={isLoading || !payload.connected} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 transition hover:border-teal-200 hover:text-teal-700 disabled:cursor-not-allowed disabled:text-slate-300">
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Refresh
              </button>
            </div>
            <form onSubmit={searchGmail} className="border-b border-slate-100 px-5 py-4">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                <label className="relative block flex-1">
                  <span className="sr-only">Search inbox</span>
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search all Gmail: sender, subject, words, from:person@example.com"
                    className="min-h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-teal-300 focus:ring-4 focus:ring-teal-100"
                  />
                </label>
                <button
                  type="submit"
                  disabled={isLoading || !payload.connected}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#0b132b] px-4 text-sm font-black text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:hover:translate-y-0"
                >
                  <Search className="h-4 w-4" aria-hidden="true" />
                  Search Gmail
                </button>
                {senderFilter ? (
                  <button
                    type="button"
                    onClick={() => setSenderFilter("")}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-3 text-sm font-black text-teal-800"
                  >
                    Sender: {senderFilter}
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                ) : null}
                {searchQuery || senderFilter ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setSenderFilter("");
                      void loadMessages(accessToken);
                    }}
                    className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 transition hover:border-teal-200 hover:text-teal-700"
                  >
                    Clear
                  </button>
                ) : null}
                <FilterMenu
                  label="Gmail shortcuts"
                  open={searchShortcutOpen}
                  onToggle={() => setSearchShortcutOpen((current) => !current)}
                >
                  {searchChips.map((chip) => (
                    <FilterMenuItem
                      key={chip.label}
                      label={chip.label}
                      active={searchQuery === chip.query}
                      disabled={isLoading || !payload.connected}
                      onClick={() => applySearchChip(chip.query)}
                    />
                  ))}
                </FilterMenu>
              </div>
            </form>
            <div className="border-b border-slate-100 px-5 py-3">
              <div className="flex flex-wrap gap-2">
                {inboxLanes.map((lane) => (
                  <button
                    key={lane.value}
                    type="button"
                    onClick={() => setActiveLane(lane.value)}
                    className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-3 text-sm font-black transition ${
                      activeLane === lane.value
                        ? "bg-[#0b132b] text-white"
                        : "border border-slate-200 bg-white text-slate-600 hover:border-teal-200 hover:text-teal-700"
                    }`}
                  >
                    {lane.label}
                    <span className={`rounded-full px-2 py-0.5 text-xs ${activeLane === lane.value ? "bg-white/15 text-white" : "bg-slate-100 text-slate-500"}`}>
                      {laneCounts[lane.value]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div className="brand-scrollbar min-h-0 flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex min-h-96 items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-teal-600" aria-hidden="true" />
                </div>
              ) : payload.connected ? (
                <div>
                  <div className="divide-y divide-slate-100">
                    {filteredMessages.length ? filteredMessages.map((message) => (
                      <MessageRow
                        key={message.id}
                        message={message}
                        busy={isGeneratingReply === message.id}
                        isOpening={isLoadingMessageDetail === message.id}
                        isRemovingJunk={isRemovingJunk === message.id}
                        disabled={Boolean(isDrafting || isGeneratingReply || isRemovingJunk)}
                        onOpen={() => openMessage(message)}
                        onGenerate={() => generateReply(message)}
                        onRemoveJunk={() => removeJunk(message)}
                        onRestoreJunk={() => restoreJunk(message)}
                      />
                    )) : <EmptyState title="No messages in this lane" body="Try another lane, search Gmail, or load more results." />}
                  </div>
                  {payload.nextPageToken ? (
                    <div className="border-t border-slate-100 p-5">
                      <button
                        type="button"
                        onClick={loadMoreMessages}
                        disabled={isLoadingMore}
                        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:border-teal-200 hover:text-teal-700 disabled:cursor-not-allowed disabled:text-slate-300"
                      >
                        {isLoadingMore ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-4 w-4" aria-hidden="true" />}
                        Load more Gmail results
                      </button>
                    </div>
                  ) : null}
                </div>
            ) : (
              <div className="p-10 text-center">
                <Mail className="mx-auto h-10 w-10 text-teal-600" aria-hidden="true" />
                <h3 className="mt-4 text-2xl font-black">Connect Gmail first</h3>
                <p className="mx-auto mt-2 max-w-md text-slate-600">After Gmail is connected, customer emails will appear here.</p>
                <button type="button" onClick={connectGmail} disabled={isConnecting || !accessToken} className="google-auth-button group mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-black shadow-sm shadow-slate-200/70 transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:hover:translate-y-0">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200 transition group-hover:ring-slate-300">
                    {isConnecting ? <Loader2 className="h-4 w-4 animate-spin text-slate-500" aria-hidden="true" /> : <GoogleGIcon className="h-4 w-4" />}
                  </span>
                  Connect Gmail
                </button>
              </div>
            )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/60">
            {reviewReply ? (
              <ReviewPanel
                subject={reviewMessageSubject}
                summary={reviewSummary}
                recipient={reviewRecipient}
                triage={reviewTriage}
                reply={reviewReply}
                isGenerating={Boolean(isGeneratingReply)}
                isDrafting={Boolean(isDrafting)}
                isCreatingReminder={isCreatingReminder}
                sources={reviewSources}
                guidance={reviewGuidance}
                warnings={draftWarnings}
                variantLabel={reviewVariantLabel}
                playbooks={playbooks}
                selectedPlaybookId={selectedPlaybookId}
                onPlaybookChange={setSelectedPlaybookId}
                onReplyChange={setReviewReply}
                onCreateDraft={(sendNow) => {
                  if (sendNow) {
                    setConfirmSendOpen(true);
                  } else {
                    void createDraft(reviewMessageId, reviewReply, false);
                  }
                }}
                onCreateReminder={createReminder}
                onRevise={(instruction, label) =>
                  generateReply(
                    { id: reviewMessageId, threadId: reviewThreadId, from: reviewRecipient, subject: reviewMessageSubject, date: "", snippet: "", summary: reviewSummary, triage: reviewTriage ?? undefined },
                    instruction,
                    label,
                  )
                }
              />
            ) : latestReply ? (
              <section>
                <div className="flex items-center gap-2 text-teal-700">
                  <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                  <p className="font-black">Draft created</p>
                </div>
                <p className="mt-4 whitespace-pre-line leading-8 text-slate-700">{latestReply}</p>
                <a href="https://mail.google.com/mail/u/0/#drafts" target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 text-sm font-black text-teal-700 transition hover:text-teal-900">
                  Open Gmail drafts
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </a>
              </section>
            ) : (
              <div className="flex min-h-96 items-center justify-center text-center">
                <div>
                  <PencilLine className="mx-auto h-10 w-10 text-teal-600" aria-hidden="true" />
                  <h2 className="mt-4 text-2xl font-black">Ready for review</h2>
                  <p className="mx-auto mt-2 max-w-md leading-7 text-slate-600">
                    Generate a reply from the inbox, edit it here, then create the Gmail draft when it looks right.
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>

      </section>
      {selectedMessage ? (
        <Modal title="Message details" onClose={() => setSelectedMessage(null)} wide>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-black uppercase text-teal-600">From</p>
              <p className="mt-1 truncate font-black">{selectedMessage.from}</p>
              <h2 className="mt-5 text-2xl font-black">{selectedMessage.subject}</h2>
              <p className="mt-2 text-sm text-slate-500">{selectedMessage.date}</p>
              {selectedMessage.triage ? (
                <div className="mt-4 flex flex-wrap items-center gap-2 text-sm font-bold text-slate-600">
                  <span>{categoryLabel(selectedMessage.triage.category)}</span>
                  <span className="text-slate-300">/</span>
                  <span>{selectedMessage.triage.urgency} urgency</span>
                  <span className="text-slate-300">/</span>
                  <span>{selectedMessage.triage.needsReply ? "needs reply" : "handled"}</span>
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => {
                void generateReply(selectedMessage);
                setSelectedMessage(null);
              }}
              disabled={Boolean(isGeneratingReply)}
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#0b132b] px-4 text-sm font-black text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:hover:translate-y-0"
            >
              {isGeneratingReply ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <PencilLine className="h-4 w-4" aria-hidden="true" />}
              Generate reply
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              setSenderFilter(selectedMessage.from);
              setSelectedMessage(null);
            }}
            className="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 transition hover:border-teal-200 hover:text-teal-700"
          >
            Show emails from this sender
          </button>
          <div className="brand-scrollbar mt-6 max-h-[50vh] space-y-4 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-4">
            {selectedMessage.threadMessages.length ? (
              selectedMessage.threadMessages.map((threadMessage) => (
                <ThreadMessage
                  key={threadMessage.id}
                  message={threadMessage}
                  selected={threadMessage.id === selectedMessage.id}
                />
              ))
            ) : (
              <p className="whitespace-pre-line leading-7 text-slate-700">
                {selectedMessage.body || selectedMessage.snippet || "No readable plain-text body found for this message."}
              </p>
            )}
          </div>
        </Modal>
      ) : null}
      {confirmSendOpen ? (
        <Modal title="Confirm send" onClose={() => setConfirmSendOpen(false)} wide>
          <SendConfirmPanel
            recipient={reviewRecipient}
            subject={reviewMessageSubject}
            variantLabel={reviewVariantLabel}
            reply={reviewReply}
            isSending={Boolean(isDrafting)}
            onCancel={() => setConfirmSendOpen(false)}
            onConfirm={() => {
              setConfirmSendOpen(false);
              void createDraft(reviewMessageId, reviewReply, true);
            }}
          />
        </Modal>
      ) : null}
    </main>
  );
}

function SetupChecklist({
  items,
  onConnect,
}: {
  items: Array<{ label: string; done: boolean; action: string; href: string | null }>;
  onConnect: () => void;
}) {
  const complete = items.filter((item) => item.done).length;

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/60">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black uppercase text-teal-600">Setup checklist</p>
          <h2 className="text-2xl font-black">{complete}/{items.length} complete</h2>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 sm:w-48">
            <div className="h-full rounded-full bg-teal-500" style={{ width: `${(complete / items.length) * 100}%` }} />
          </div>
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-5">
        {items.map((item) => (
          <div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className={`h-4 w-4 ${item.done ? "text-teal-600" : "text-slate-300"}`} aria-hidden="true" />
              <p className="text-sm font-black">{item.label}</p>
            </div>
            {!item.done ? (
              item.href ? (
                <Link href={item.href} className="mt-3 inline-flex text-sm font-black text-teal-700">{item.action}</Link>
              ) : item.label === "Connect Gmail" ? (
                <button type="button" onClick={onConnect} className="mt-3 text-sm font-black text-teal-700">{item.action}</button>
              ) : (
                <p className="mt-3 text-sm font-semibold text-slate-500">{item.action}</p>
              )
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function FirstRunTour({ onDismiss }: { onDismiss: () => void }) {
  return (
    <section className="mt-6 rounded-2xl border border-teal-100 bg-teal-50 p-5 text-teal-950">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-black uppercase">First run</p>
          <h2 className="mt-1 text-2xl font-black">Three steps to your first tracked reply</h2>
        </div>
        <button type="button" onClick={onDismiss} className="inline-flex min-h-10 items-center justify-center rounded-xl bg-white px-3 text-sm font-black text-teal-800">
          Dismiss
        </button>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <TourStep title="Connect Gmail" body="Use the connect button once so Gibraltar can read threads and create drafts." />
        <TourStep title="Add context" body="Save services, hours, booking links, and guardrails in Settings." />
        <TourStep title="Review before sending" body="Generate a variant, edit it, then create a draft or send now." />
      </div>
    </section>
  );
}

function TourStep({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-teal-100 bg-white/70 p-4">
      <p className="font-black">{title}</p>
      <p className="mt-2 text-sm font-semibold leading-6 text-teal-900">{body}</p>
    </div>
  );
}

function ThreadMessage({ message, selected }: { message: GmailThreadMessage; selected: boolean }) {
  const sent = message.labelIds.includes("SENT");

  return (
    <article className={`rounded-xl border p-4 ${selected ? "border-teal-200 bg-white shadow-sm" : "border-slate-200 bg-white/70"}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase text-teal-700">
            {sent ? "Business reply" : "Customer message"}{selected ? " - selected" : ""}
          </p>
          <p className="mt-1 truncate text-sm font-black text-slate-950">{message.from}</p>
        </div>
        <p className="shrink-0 text-xs font-semibold text-slate-500">{message.date || "No date"}</p>
      </div>
      <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">
        {message.body || message.snippet || "No readable plain-text body found for this message."}
      </p>
    </article>
  );
}

function getDraftWarnings({
  profile,
  reply,
  subject,
  triage,
}: {
  profile: BusinessProfile;
  reply: string;
  subject: string;
  triage: MessageTriage | null;
}) {
  const warnings: string[] = [];
  const text = `${subject} ${reply}`.toLowerCase();
  const category = triage?.category;

  if ((category === "booking" || text.includes("book") || text.includes("schedule")) && !profile.bookingLink.trim() && !profile.phone.trim()) {
    warnings.push("This looks booking-related, but no booking link or phone number is saved.");
  }

  if ((category === "pricing" || text.includes("price") || text.includes("cost") || text.includes("quote")) && !profile.services.trim()) {
    warnings.push("This looks pricing-related, but services or pricing guidance is missing.");
  }

  if ((text.includes("hour") || text.includes("open") || text.includes("available")) && !profile.hours.trim()) {
    warnings.push("The draft may discuss availability, but business hours are missing.");
  }

  if (
    !profile.neverPromise.trim() &&
    /\b(guarantee|promise|definitely|always|available|availability|refund|discount|free)\b/.test(text)
  ) {
    warnings.push("The draft may make a promise, but no Never promise guardrails are saved.");
  }

  return warnings.slice(0, 4);
}

function StatusPill({ label, value, done }: { label: string; value: string; done: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-black uppercase text-slate-500">{label}</p>
      <div className="mt-2 flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${done ? "bg-teal-500" : "bg-slate-300"}`} />
        <p className="truncate font-black">{value}</p>
      </div>
    </div>
  );
}

function FilterMenu({
  label,
  open,
  onToggle,
  children,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        aria-label={label}
        aria-expanded={open}
        className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border transition ${
          open
            ? "border-teal-200 bg-teal-50 text-teal-800"
            : "border-slate-200 bg-white text-slate-600 hover:border-teal-200 hover:text-teal-700"
        }`}
      >
        <ChevronRight className={`h-5 w-5 transition-transform duration-200 ${open ? "rotate-90" : ""}`} aria-hidden="true" />
      </button>
      {open ? (
        <div className="absolute right-0 top-11 z-20 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-950/10">
          {children}
        </div>
      ) : null}
    </div>
  );
}

function FilterMenuItem({
  label,
  active,
  disabled = false,
  onClick,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`block min-h-10 w-full px-3 text-left text-sm font-black transition disabled:cursor-not-allowed disabled:text-slate-300 ${
        active ? "bg-teal-50 text-teal-800" : "bg-white text-slate-600 hover:bg-slate-50 hover:text-teal-700"
      }`}
    >
      {label}
    </button>
  );
}

function MessageRow({
  message,
  busy,
  isOpening,
  isRemovingJunk,
  disabled,
  onOpen,
  onGenerate,
  onRemoveJunk,
  onRestoreJunk,
}: {
  message: GmailMessage;
  busy: boolean;
  isOpening: boolean;
  isRemovingJunk: boolean;
  disabled: boolean;
  onOpen: () => void;
  onGenerate: () => void;
  onRemoveJunk: () => void;
  onRestoreJunk: () => void;
}) {
  const needsReply = message.triage?.needsReply ?? true;
  const brief = message.summary || "Summary unavailable.";

  return (
    <article className={`border-l-4 transition hover:bg-slate-50 ${needsReply ? "border-l-orange-400 bg-orange-50/60" : "border-l-transparent bg-white"}`}>
      <div className="grid grid-cols-[minmax(0,1fr)_2.75rem] gap-4 px-5 py-5">
        <button type="button" onClick={onOpen} className="grid min-w-0 gap-3 text-left">
          <div className="grid min-w-0 gap-3">
            <p className="text-base font-black leading-7 text-slate-950 sm:text-lg sm:leading-8">{brief}</p>
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-slate-500">
              <span className="min-w-0 max-w-full truncate font-bold text-slate-600">{message.from}</span>
              <span className="min-w-0 max-w-full truncate">{message.subject}</span>
              {message.date ? <span className="text-slate-400">{message.date}</span> : null}
              <span className="inline-flex shrink-0 items-center gap-1 font-black uppercase text-teal-700">
                Open
                <ArrowRight className="h-3 w-3" aria-hidden="true" />
              </span>
              {isOpening ? (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-teal-100 px-2 py-1 text-xs font-black uppercase text-teal-800">
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                  Opening
                </span>
              ) : null}
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              {message.triage ? <TriageBadges triage={message.triage} compact /> : null}
            </div>
          </div>
        </button>
        <div className="flex flex-col items-end gap-2">
          <button
            type="button"
            onClick={onGenerate}
            disabled={disabled}
            aria-label={`Generate reply for ${message.subject}`}
            title="Generate reply"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0b132b] text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:hover:translate-y-0"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <PencilLine className="h-4 w-4" aria-hidden="true" />}
          </button>
          {message.isJunk ? (
            <button
              type="button"
              onClick={onRestoreJunk}
              disabled={disabled}
              aria-label={`Restore ${message.subject} to review`}
              title="Restore"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-teal-200 bg-teal-50 text-teal-700 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:translate-y-0"
            >
              {isRemovingJunk ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RotateCcw className="h-4 w-4" aria-hidden="true" />}
            </button>
          ) : (
            <button
              type="button"
              onClick={onRemoveJunk}
              disabled={disabled}
              aria-label={`Remove ${message.subject} from review`}
              title="Remove junk"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-red-200 hover:text-red-700 disabled:cursor-not-allowed disabled:text-slate-300"
            >
              {isRemovingJunk ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Trash2 className="h-4 w-4" aria-hidden="true" />}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function TriageBadges({ triage, compact = false }: { triage: MessageTriage; compact?: boolean }) {
  const urgencyClasses = {
    high: "bg-red-100 text-red-800",
    medium: "bg-amber-100 text-amber-800",
    low: "bg-slate-100 text-slate-700",
  };

  return (
    <>
      {triage.needsReply ? (
        <span className="shrink-0 rounded-full bg-orange-100 px-2 py-1 text-xs font-black uppercase text-orange-800">
          Needs Reply
        </span>
      ) : null}
      <span className="shrink-0 rounded-full bg-teal-100 px-2 py-1 text-xs font-black uppercase text-teal-800">
        {categoryLabel(triage.category)}
      </span>
      {!compact ? (
        <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-black uppercase ${urgencyClasses[triage.urgency]}`}>
          {triage.urgency}
        </span>
      ) : null}
      {!triage.needsReply ? (
        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-xs font-black uppercase text-slate-600">
          No reply
        </span>
      ) : null}
    </>
  );
}

function categoryLabel(category: TriageCategory) {
  const labels: Record<TriageCategory, string> = {
    booking: "Booking",
    pricing: "Pricing",
    complaint: "Issue",
    follow_up: "Follow-up",
    general: "General",
    low_priority: "Low priority",
  };

  return labels[category];
}
function ReviewPanel({
  subject,
  summary,
  recipient,
  triage,
  reply,
  isGenerating,
  isDrafting,
  isCreatingReminder,
  sources,
  guidance,
  warnings,
  variantLabel,
  playbooks,
  selectedPlaybookId,
  onPlaybookChange,
  onReplyChange,
  onCreateDraft,
  onCreateReminder,
  onRevise,
}: {
  subject: string;
  summary: string;
  recipient: string;
  triage: MessageTriage | null;
  reply: string;
  isGenerating: boolean;
  isDrafting: boolean;
  isCreatingReminder: string;
  sources: ReplySources | null;
  guidance: ReplyGuidance | null;
  warnings: string[];
  variantLabel: string;
  playbooks: ReplyPlaybook[];
  selectedPlaybookId: string;
  onPlaybookChange: (value: string) => void;
  onReplyChange: (value: string) => void;
  onCreateDraft: (sendNow: boolean) => void;
  onCreateReminder: (days: number) => void;
  onRevise: (instruction: string, label: string) => void;
}) {
  const combinedWarnings = Array.from(new Set([...(guidance?.riskFlags ?? []), ...warnings]));
  const missingContext = guidance?.missingContext ?? [];
  const confidence = guidance?.confidence ?? "medium";
  const confidenceMeta = confidenceCopy(confidence);
  const action = guidance?.recommendedAction ?? "Review reply";
  const riskSummary = combinedWarnings.length ? `${combinedWarnings.length} item${combinedWarnings.length === 1 ? "" : "s"} to verify` : "No major flags";
  const contextSummary = missingContext.length ? `${missingContext.length} gap${missingContext.length === 1 ? "" : "s"}` : "Context looks ready";
  const sourceLine = [
    sources?.businessContext ? "Business context" : "No business context",
    sources?.voiceProfile ? "Voice learned" : "Voice not learned",
    sources?.playbook ? "Playbook applied" : "No playbook",
    `${sources?.threadMessages ?? 1} thread message${(sources?.threadMessages ?? 1) === 1 ? "" : "s"}`,
    variantLabel,
  ].join(" / ");

  return (
    <section className="grid gap-5">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-[#f8fbff]">
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-teal-700">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            <p className="font-black">Reply command center</p>
          </div>
          <span className="inline-flex min-h-9 items-center justify-center rounded-xl bg-[#173c27] px-3 text-sm font-black text-[#f7fbf1]">
            {action}
          </span>
        </div>
        <div className="grid gap-4 p-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="text-xs font-black uppercase text-slate-500">Selected email</p>
            <h2 className="mt-2 text-2xl font-black leading-9 text-slate-950">{summary || subject || "No summary available"}</h2>
            <div className="mt-4 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold text-slate-500">
              <span className="max-w-full truncate font-black text-slate-700">{recipient || "Unknown sender"}</span>
              {subject ? <span className="max-w-full truncate">{subject}</span> : null}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-black uppercase text-slate-500">Customer intent</p>
            <p className="mt-2 text-xl font-black">{triage ? categoryLabel(triage.category) : "General"}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {triage ? <TriageBadges triage={triage} compact /> : <SourceBadge label="Review" active />}
            </div>
            {triage?.reason ? <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{triage.reason}</p> : null}
          </div>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <GuidanceCard
          title="Confidence"
          value={confidenceMeta.label}
          body={confidenceMeta.body}
          tone={confidence}
        />
        <GuidanceCard
          title="Risk"
          value={riskSummary}
          body={combinedWarnings[0] ?? "The draft has no obvious advisory flags."}
          tone={combinedWarnings.length ? "medium" : "high"}
        />
        <GuidanceCard
          title="Context"
          value={contextSummary}
          body={missingContext[0] ?? "Business context is sufficient for this draft."}
          tone={missingContext.length ? "medium" : "high"}
        />
      </div>

      {(combinedWarnings.length || missingContext.length) ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {combinedWarnings.length ? (
            <GuidanceList title="Review before sending" items={combinedWarnings} tone="warning" />
          ) : null}
          {missingContext.length ? (
            <GuidanceList title="Missing context" items={missingContext} tone="neutral" prefix="Add" />
          ) : null}
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-xl border border-teal-100 bg-teal-50 px-4 py-3 text-teal-900">
          <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
          <p className="text-sm font-black">No major advisory flags detected.</p>
        </div>
      )}

      <PlaybookControl
        playbooks={playbooks}
        selectedPlaybookId={selectedPlaybookId}
        activePlaybook={guidance?.playbook ?? null}
        matchReason={guidance?.playbookReason ?? "Gibraltar can auto-select reusable guidance when it drafts."}
        isGenerating={isGenerating}
        onPlaybookChange={onPlaybookChange}
        onRegenerate={() => onRevise("", "Original")}
      />

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase text-slate-500">Draft editor</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">{sourceLine}</p>
          </div>
          {isGenerating ? (
            <span className="inline-flex items-center gap-2 text-sm font-black text-teal-700">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Regenerating
            </span>
          ) : null}
        </div>
        <textarea
          value={reply}
          onChange={(event) => onReplyChange(event.target.value)}
          rows={16}
          className="w-full resize-y border-0 bg-white px-4 py-4 text-base leading-8 text-slate-800 outline-none transition focus:ring-4 focus:ring-inset focus:ring-teal-100"
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-black uppercase text-slate-500">Quick rewrites</p>
          <button type="button" onClick={() => onRevise("", "Original")} disabled={isGenerating} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:border-teal-200 hover:text-teal-700 disabled:cursor-not-allowed disabled:text-slate-300">
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Regenerate
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <ReviewButton label="Shorter" disabled={isGenerating} onClick={() => onRevise("Make this draft shorter while preserving the key next step.", "Shorter")} />
          <ReviewButton label="Warmer" disabled={isGenerating} onClick={() => onRevise("Make this draft warmer and more personable without adding fluff.", "Warmer")} />
          <ReviewButton label="More direct" disabled={isGenerating} onClick={() => onRevise("Make this draft more direct and action-oriented while staying polite.", "More direct")} />
          <ReviewButton label="Add booking link" disabled={isGenerating} onClick={() => onRevise("Include the booking link if one is available in the business context.", "Booking link")} />
          <ReviewButton label="Remove promise" disabled={isGenerating} onClick={() => onRevise("Remove or soften any promises, availability claims, pricing certainty, or guarantees that the business context does not prove.", "Remove promise")} />
          <ReviewButton label="Custom instruction" disabled={isGenerating} onClick={() => {
            const instruction = window.prompt("How should Gibraltar revise this draft?");
            if (instruction?.trim()) {
              onRevise(instruction.trim(), "Custom");
            }
          }} />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase text-slate-500">Final actions</p>
            <p className="mt-1 text-sm font-semibold text-slate-500">{action}</p>
          </div>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button type="button" onClick={() => onCreateDraft(false)} disabled={isDrafting || !reply.trim()} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-teal-200 bg-white px-5 text-sm font-black text-teal-800 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300 disabled:hover:translate-y-0">
            {isDrafting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Mail className="h-4 w-4" aria-hidden="true" />}
            Create Gmail draft
          </button>
          <button type="button" onClick={() => onCreateDraft(true)} disabled={isDrafting || !reply.trim()} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#173c27] px-5 text-sm font-black text-[#f7fbf1] shadow-lg shadow-slate-300/60 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:hover:translate-y-0">
            {isDrafting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ArrowRight className="h-4 w-4" aria-hidden="true" />}
            Send now
          </button>
        </div>
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-black uppercase text-slate-500">Follow up later</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <ReminderButton label="Tomorrow" days={1} busy={isCreatingReminder} onClick={onCreateReminder} />
            <ReminderButton label="2 days" days={2} busy={isCreatingReminder} onClick={onCreateReminder} />
            <ReminderButton label="1 week" days={7} busy={isCreatingReminder} onClick={onCreateReminder} />
          </div>
        </div>
      </div>
    </section>
  );
}

function confidenceCopy(confidence: ReplyConfidence) {
  const copy: Record<ReplyConfidence, { label: string; body: string }> = {
    high: {
      label: "High",
      body: "Straightforward reply with enough saved context.",
    },
    medium: {
      label: "Medium",
      body: "Review quickly before turning this into a Gmail draft.",
    },
    low: {
      label: "Low",
      body: "Important context or sensitivity needs owner judgment.",
    },
  };

  return copy[confidence];
}

function GuidanceCard({ title, value, body, tone }: { title: string; value: string; body: string; tone: ReplyConfidence }) {
  const classes = {
    high: "border-teal-100 bg-teal-50 text-teal-950",
    medium: "border-amber-100 bg-amber-50 text-amber-950",
    low: "border-red-100 bg-red-50 text-red-950",
  };

  return (
    <div className={`rounded-xl border p-4 ${classes[tone]}`}>
      <p className="text-xs font-black uppercase opacity-70">{title}</p>
      <p className="mt-2 text-xl font-black">{value}</p>
      <p className="mt-2 text-sm font-semibold leading-6 opacity-80">{body}</p>
    </div>
  );
}

function GuidanceList({ title, items, tone, prefix }: { title: string; items: string[]; tone: "warning" | "neutral"; prefix?: string }) {
  const classes = tone === "warning" ? "border-amber-200 bg-amber-50 text-amber-950" : "border-slate-200 bg-slate-50 text-slate-800";

  return (
    <div className={`rounded-xl border p-4 ${classes}`}>
      <div className="flex items-center gap-2">
        <CircleAlert className="h-4 w-4" aria-hidden="true" />
        <p className="text-sm font-black uppercase">{title}</p>
      </div>
      <ul className="mt-3 space-y-2 text-sm font-semibold leading-6">
        {items.map((item) => (
          <li key={item}>{prefix ? `${prefix}: ${item}` : item}</li>
        ))}
      </ul>
    </div>
  );
}

function PlaybookControl({
  playbooks,
  selectedPlaybookId,
  activePlaybook,
  matchReason,
  isGenerating,
  onPlaybookChange,
  onRegenerate,
}: {
  playbooks: ReplyPlaybook[];
  selectedPlaybookId: string;
  activePlaybook: ReplyPlaybookSummary | null;
  matchReason: string;
  isGenerating: boolean;
  onPlaybookChange: (value: string) => void;
  onRegenerate: () => void;
}) {
  const enabledPlaybooks = playbooks.filter((playbook) => playbook.enabled);
  const selectionLabel =
    selectedPlaybookId === noPlaybookValue
      ? "No playbook"
      : selectedPlaybookId
        ? enabledPlaybooks.find((playbook) => playbook.id === selectedPlaybookId)?.title ?? "Selected playbook"
        : "Auto-select";

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#173c27] text-[#f7fbf1]">
            <BookOpen className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-black uppercase text-slate-500">Reply playbook</p>
            <h3 className="mt-1 text-xl font-black">{activePlaybook?.title ?? selectionLabel}</h3>
            <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">{matchReason}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onRegenerate}
          disabled={isGenerating}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-teal-200 bg-white px-4 text-sm font-black text-teal-800 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:translate-y-0"
        >
          {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RotateCcw className="h-4 w-4" aria-hidden="true" />}
          Regenerate with playbook
        </button>
      </div>
      <div className="grid gap-3 p-4">
        <div className="flex flex-wrap gap-2">
          <PlaybookChoice
            label="Auto"
            detail="Best match"
            active={!selectedPlaybookId}
            onClick={() => onPlaybookChange("")}
          />
          <PlaybookChoice
            label="None"
            detail="Draft without reusable guidance"
            active={selectedPlaybookId === noPlaybookValue}
            onClick={() => onPlaybookChange(noPlaybookValue)}
          />
          {enabledPlaybooks.map((playbook) => (
            <PlaybookChoice
              key={playbook.id}
              label={playbook.title}
              detail={playbookCategoryLabel(playbook.category)}
              active={selectedPlaybookId === playbook.id}
              onClick={() => onPlaybookChange(playbook.id)}
            />
          ))}
        </div>
        {!enabledPlaybooks.length ? (
          <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-600">
            No enabled playbooks yet. Add reusable guidance in Settings when you are ready.
          </p>
        ) : null}
      </div>
    </section>
  );
}

function PlaybookChoice({
  label,
  detail,
  active,
  onClick,
}: {
  label: string;
  detail: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-14 rounded-xl border px-3 py-2 text-left transition ${
        active
          ? "border-green-900/20 bg-[#173c27] text-[#f7fbf1] shadow-sm shadow-slate-200/60"
          : "border-slate-200 bg-white text-slate-700 hover:border-green-900/30 hover:text-slate-950"
      }`}
    >
      <span className="block text-sm font-black">{label}</span>
      <span className={`mt-1 block text-xs font-semibold ${active ? "text-[#dfead5]" : "text-slate-500"}`}>{detail}</span>
    </button>
  );
}

function playbookCategoryLabel(category: string) {
  const labels: Record<string, string> = {
    pricing: "Pricing inquiry",
    booking: "Booking request",
    cancellation: "Cancellation/reschedule",
    complaint: "Complaint",
    follow_up: "Follow-up",
    general: "General question",
  };

  return labels[category] ?? "General question";
}

function SourceBadge({ label, active }: { label: string; active: boolean }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${active ? "bg-teal-100 text-teal-800" : "bg-slate-100 text-slate-500"}`}>
      {label}
    </span>
  );
}

function ReminderButton({ label, days, busy, onClick }: { label: string; days: number; busy: string; onClick: (days: number) => void }) {
  const isBusy = busy === String(days);

  return (
    <button
      type="button"
      onClick={() => onClick(days)}
      disabled={Boolean(busy)}
      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:border-teal-200 hover:text-teal-700 disabled:cursor-not-allowed disabled:text-slate-300"
    >
      {isBusy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Clock3 className="h-4 w-4" aria-hidden="true" />}
      {label}
    </button>
  );
}

function SendConfirmPanel({
  recipient,
  subject,
  variantLabel,
  reply,
  isSending,
  onCancel,
  onConfirm,
}: {
  recipient: string;
  subject: string;
  variantLabel: string;
  reply: string;
  isSending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div>
      <p className="leading-7 text-slate-600">
        Review the recipient, subject, variant, and reply before sending from Gmail.
      </p>
      <dl className="mt-5 grid gap-3 sm:grid-cols-3">
        <DraftDetailItem label="Recipient" value={recipient || "Unknown"} />
        <DraftDetailItem label="Subject" value={subject || "(No subject)"} />
        <DraftDetailItem label="Variant" value={variantLabel || "Original"} />
      </dl>
      <div className="brand-scrollbar mt-5 max-h-[42vh] overflow-y-auto whitespace-pre-line rounded-xl border border-slate-200 bg-slate-50 p-5 leading-7 text-slate-700">
        {reply}
      </div>
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} disabled={isSending} className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 disabled:cursor-not-allowed disabled:text-slate-300">
          Keep editing
        </button>
        <button type="button" onClick={onConfirm} disabled={isSending || !reply.trim()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#0b132b] px-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300">
          {isSending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ArrowRight className="h-4 w-4" aria-hidden="true" />}
          Send from Gmail
        </button>
      </div>
    </div>
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

function ReviewButton({ label, disabled, onClick }: { label: string; disabled: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="min-h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:border-teal-200 hover:text-teal-700 disabled:cursor-not-allowed disabled:text-slate-300">
      {label}
    </button>
  );
}

function PageNotice({ tone, text }: { tone: "success" | "error"; text: string }) {
  const classes = tone === "success" ? "border-teal-100 bg-teal-50 text-teal-700" : "border-red-100 bg-red-50 text-red-700";
  return <div className={`mt-4 rounded-xl border px-4 py-3 text-sm font-bold ${classes}`}>{text}</div>;
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="p-10 text-center">
      <Mail className="mx-auto h-10 w-10 text-teal-600" aria-hidden="true" />
      <h3 className="mt-4 text-2xl font-black">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-slate-600">{body}</p>
    </div>
  );
}
