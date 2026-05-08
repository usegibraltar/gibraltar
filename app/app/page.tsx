"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clock3,
  CircleAlert,
  History,
  Loader2,
  LogOut,
  Mail,
  PencilLine,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Settings,
  Sparkles,
  Trash2,
  Unplug,
  X,
} from "lucide-react";
import { friendlyErrorMessage } from "../lib/friendly-error";
import { getSupabaseBrowser } from "../lib/supabase-browser";

type GmailMessage = {
  id: string;
  threadId: string;
  from: string;
  subject: string;
  date: string;
  snippet: string;
  triage?: MessageTriage;
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

type VoiceSample = {
  id: string;
  subject: string;
  snippet: string;
  body: string;
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
  error?: string;
};

type ReplySources = {
  businessContext: boolean;
  voiceProfile: boolean;
  threadMessages: number;
};

type SearchChip = {
  label: string;
  query: string;
};

type InboxFilter = "all" | "needs_reply" | TriageCategory;

type InboxFilterOption = {
  label: string;
  value: InboxFilter;
};

const primaryInboxFilters: InboxFilterOption[] = [
  { label: "All", value: "all" },
  { label: "Needs reply", value: "needs_reply" },
  { label: "Booking", value: "booking" },
  { label: "Pricing", value: "pricing" },
];

const moreInboxFilters: InboxFilterOption[] = [
  { label: "Issues", value: "complaint" },
  { label: "Follow-up", value: "follow_up" },
  { label: "General", value: "general" },
  { label: "Low priority", value: "low_priority" },
];

const searchChips: SearchChip[] = [
  { label: "Unread", query: "is:unread" },
  { label: "This week", query: "newer_than:7d" },
  { label: "Starred", query: "is:starred" },
  { label: "Sent", query: "in:sent newer_than:30d" },
  { label: "Has attachment", query: "has:attachment" },
  { label: "Needs reply", query: "-from:me newer_than:30d" },
];

const primarySearchChips = searchChips.slice(0, 3);
const moreSearchChips = searchChips.slice(3);

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
  const [history, setHistory] = useState<DraftEvent[]>([]);
  const [reminders, setReminders] = useState<FollowUpReminder[]>([]);
  const [voiceSamples, setVoiceSamples] = useState<VoiceSample[]>([]);
  const [selectedVoiceSampleIds, setSelectedVoiceSampleIds] = useState<string[]>([]);
  const [activeModal, setActiveModal] = useState<"context" | "voice" | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isLoadingSamples, setIsLoadingSamples] = useState(false);
  const [isLearningVoice, setIsLearningVoice] = useState(false);
  const [isGeneratingReply, setIsGeneratingReply] = useState("");
  const [isDrafting, setIsDrafting] = useState("");
  const [isLoadingMessageDetail, setIsLoadingMessageDetail] = useState("");
  const [isRemovingJunk, setIsRemovingJunk] = useState("");
  const [isCreatingReminder, setIsCreatingReminder] = useState("");
  const [isCompletingReminder, setIsCompletingReminder] = useState("");
  const [reviewMessageId, setReviewMessageId] = useState("");
  const [reviewThreadId, setReviewThreadId] = useState("");
  const [reviewMessageSubject, setReviewMessageSubject] = useState("");
  const [reviewRecipient, setReviewRecipient] = useState("");
  const [reviewReply, setReviewReply] = useState("");
  const [reviewVariantLabel, setReviewVariantLabel] = useState("Original");
  const [reviewVariantInstruction, setReviewVariantInstruction] = useState("");
  const [reviewSources, setReviewSources] = useState<ReplySources | null>(null);
  const [reviewTriage, setReviewTriage] = useState<MessageTriage | null>(null);
  const [activeFilter, setActiveFilter] = useState<InboxFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [senderFilter, setSenderFilter] = useState("");
  const [openFilterMenu, setOpenFilterMenu] = useState<"inbox" | "search" | null>(null);
  const [latestReply, setLatestReply] = useState("");
  const [selectedMessage, setSelectedMessage] = useState<SelectedMessage | null>(null);
  const [selectedDraftEvent, setSelectedDraftEvent] = useState<DraftEvent | null>(null);
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

  const loadHistory = useCallback(async () => {
    if (!accessToken) {
      return;
    }

    const response = await authedFetch("/api/gmail/history");
    const body = (await response.json()) as { events?: DraftEvent[] };

    if (response.ok) {
      setHistory(body.events ?? []);
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

  const loadReminders = useCallback(async () => {
    if (!accessToken) {
      return;
    }

    const response = await authedFetch("/api/follow-ups");
    const body = (await response.json()) as { reminders?: FollowUpReminder[] };

    if (response.ok) {
      setReminders(body.reminders ?? []);
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
    void loadHistory();
    void loadOnboarding();
    void loadReminders();
  }, [loadHistory, loadOnboarding, loadProfile, loadReminders]);

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

  async function saveProfile(closeAfterSave = false) {
    setIsSavingProfile(true);
    setError("");
    setSuccess("");

    try {
      const response = await authedFetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const body = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(body.error ?? "Could not save business context.");
      }

      setSuccess("Business context saved.");
      if (closeAfterSave) {
        setActiveModal(null);
      }
    } catch (profileError) {
      setError(profileError instanceof Error ? profileError.message : "Could not save business context.");
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function loadVoiceSamples() {
    setIsLoadingSamples(true);
    setError("");
    setSuccess("");

    try {
      const response = await authedFetch("/api/voice/samples");
      const body = (await response.json()) as { samples?: VoiceSample[]; error?: string };

      if (!response.ok) {
        throw new Error(body.error ?? "Could not load sent email samples.");
      }

      const samples = body.samples ?? [];
      setVoiceSamples(samples);
      setSelectedVoiceSampleIds(samples.slice(0, 8).map((sample) => sample.id));
      setSuccess("Sent replies loaded for review.");
    } catch (sampleError) {
      setError(sampleError instanceof Error ? sampleError.message : "Could not load sent email samples.");
    } finally {
      setIsLoadingSamples(false);
    }
  }

  function toggleVoiceSample(id: string) {
    setSelectedVoiceSampleIds((current) =>
      current.includes(id) ? current.filter((sampleId) => sampleId !== id) : [...current, id],
    );
  }

  async function learnVoice() {
    setIsLearningVoice(true);
    setError("");
    setSuccess("");

    try {
      const selectedSamples = voiceSamples
        .filter((sample) => selectedVoiceSampleIds.includes(sample.id))
        .map((sample) => ({ subject: sample.subject, body: sample.body }));
      const response = await authedFetch("/api/voice/learn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ samples: selectedSamples }),
      });
      const body = (await response.json()) as {
        voiceProfile?: string;
        voiceSampleCount?: number;
        voiceLearnedAt?: string;
        error?: string;
      };

      if (!response.ok || !body.voiceProfile) {
        throw new Error(body.error ?? "Could not learn owner voice.");
      }

      setProfile({
        ...profile,
        voiceProfile: body.voiceProfile,
        voiceSampleCount: body.voiceSampleCount ?? selectedSamples.length,
        voiceLearnedAt: body.voiceLearnedAt ?? new Date().toISOString(),
      });
      setSuccess("Owner voice learned and saved.");
    } catch (voiceError) {
      setError(voiceError instanceof Error ? voiceError.message : "Could not learn owner voice.");
    } finally {
      setIsLearningVoice(false);
    }
  }

  const filteredMessages = payload.messages.filter((message) => {
    const sender = senderFilter.trim().toLowerCase();

    if (sender && !message.from.toLowerCase().includes(sender)) {
      return false;
    }

    if (activeFilter === "all") {
      return true;
    }

    if (activeFilter === "needs_reply") {
      return message.triage?.needsReply ?? true;
    }

    return message.triage?.category === activeFilter;
  });

  async function generateReply(message: GmailMessage, instruction = "", variantLabel = instruction ? "Custom" : "Original") {
    setIsGeneratingReply(message.id);
    setError("");
    setSuccess("");
    setLatestReply("");
    setReviewMessageId(message.id);
    setReviewThreadId(message.threadId);
    setReviewMessageSubject(message.subject);
    setReviewRecipient(message.from);
    setReviewTriage(message.triage ?? null);
    setReviewVariantLabel(variantLabel);
    setReviewVariantInstruction(instruction);

    try {
      const response = await authedFetch("/api/gmail/replies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId: message.id,
          instruction,
          triage: message.triage,
        }),
      });
      const body = (await response.json()) as ReplyPayload;

      if (!response.ok || !body.reply) {
        throw new Error(body.error ?? "Could not generate reply.");
      }

      setReviewReply(body.reply);
      setReviewSources(body.sources ?? null);
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
        messages: current.messages.filter((currentMessage) => currentMessage.id !== message.id),
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
        }),
      });
      const body = (await response.json()) as DraftPayload;

      if (!response.ok) {
        throw new Error(body.error ?? "Could not create Gmail draft.");
      }

      setSuccess(body.sent ? "Email sent from Gmail." : "Draft created in Gmail.");
      setLatestReply(body.reply ?? "");
      setReviewMessageId("");
      setReviewThreadId("");
      setReviewMessageSubject("");
      setReviewRecipient("");
      setReviewReply("");
      setReviewSources(null);
      setReviewTriage(null);
      setReviewVariantLabel("Original");
      setReviewVariantInstruction("");
      await loadHistory();
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

      setSuccess("Follow-up reminder saved.");
      await loadReminders();
    } catch (reminderError) {
      setError(reminderError instanceof Error ? reminderError.message : "Could not save follow-up reminder.");
    } finally {
      setIsCreatingReminder("");
    }
  }

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

      await loadReminders();
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

  function searchGmail(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    void loadMessages(accessToken, searchQuery);
  }

  function applySearchChip(query: string) {
    setSearchQuery(query);
    setSenderFilter("");
    setOpenFilterMenu(null);
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
    { label: "Generate a first reply", done: onboardingEvents.includes("first_reply_generated") || Boolean(reviewReply || latestReply || history.length), action: "Choose email", href: null },
    { label: "Create or send first email", done: onboardingEvents.includes("first_email_created") || history.some((event) => event.status === "created"), action: "Review draft", href: null },
  ];

  return (
    <main className="min-h-screen bg-[#f8fbff] text-[#0b132b]">
      <header className="border-b border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Image src="/brand/gibraltar-mark.svg" alt="" width={96} height={96} className="h-10 w-10 rounded-xl shadow-md shadow-blue-500/20" />
            <div>
              <p className="text-lg font-black">Gibraltar</p>
              <p className="text-sm text-slate-500">{userEmail}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/app" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#0b132b] px-4 text-sm font-black text-white">
              Replies
            </Link>
            <Link href="/analytics" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:border-teal-200 hover:text-teal-700">
              Analytics
            </Link>
            <Link href="/settings" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:border-teal-200 hover:text-teal-700">
              Settings
            </Link>
            <Link href="/admin" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:border-teal-200 hover:text-teal-700">
              Admin
            </Link>
            <button type="button" onClick={signOut} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:border-red-200 hover:text-red-700">
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/60">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-black uppercase text-teal-600">Gmail draft workspace</p>
              <h1 className="mt-1 text-3xl font-black">Review replies before they become drafts</h1>
              <p className="mt-2 max-w-3xl leading-7 text-slate-600">
                Gibraltar reads recent Gmail messages so you can choose one, tune a reply, and create a Gmail draft. Nothing is sent automatically.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ActionButton icon={Settings} label="Business context" onClick={() => setActiveModal("context")} active={Boolean(profile.businessName || profile.services)} />
              <ActionButton icon={Sparkles} label="Learn voice" onClick={() => setActiveModal("voice")} active={Boolean(profile.voiceProfile)} />
              <button type="button" onClick={connectGmail} disabled={isConnecting || !accessToken} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-blue-600 px-4 text-sm font-black text-white shadow-lg shadow-blue-500/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300 disabled:hover:translate-y-0">
                {isConnecting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Mail className="h-4 w-4" aria-hidden="true" />}
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

        <SetupChecklist items={setupItems} onConnect={connectGmail} />
        {showTour ? <FirstRunTour onDismiss={dismissTour} /> : null}

        <div className="mt-6 grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
          <section className="flex max-h-[78vh] min-h-[36rem] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60 lg:max-h-[calc(100vh-8rem)]">
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
              </div>
            </form>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 border-b border-slate-100 px-5 py-3">
              <div className="flex flex-wrap gap-2">
                {primaryInboxFilters.map((filter) => (
                  <FilterButton
                    key={filter.value}
                    label={filter.label}
                    active={activeFilter === filter.value}
                    onClick={() => {
                      setActiveFilter(filter.value);
                      setOpenFilterMenu(null);
                    }}
                  />
                ))}
              </div>
              <FilterMenu
                label="More inbox filters"
                open={openFilterMenu === "inbox"}
                onToggle={() => setOpenFilterMenu((current) => (current === "inbox" ? null : "inbox"))}
              >
                {moreInboxFilters.map((filter) => (
                  <FilterMenuItem
                    key={filter.value}
                    label={filter.label}
                    active={activeFilter === filter.value}
                    onClick={() => {
                      setActiveFilter(filter.value);
                      setOpenFilterMenu(null);
                    }}
                  />
                ))}
              </FilterMenu>
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 border-b border-slate-100 px-5 py-3">
              <div className="flex flex-wrap gap-2">
                {primarySearchChips.map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => applySearchChip(chip.query)}
                    disabled={isLoading || !payload.connected}
                    className={`min-h-9 shrink-0 rounded-xl border px-3 text-sm font-black transition disabled:cursor-not-allowed disabled:text-slate-300 ${
                      searchQuery === chip.query
                        ? "border-teal-200 bg-teal-50 text-teal-800"
                        : "border-slate-200 bg-white text-slate-600 hover:border-teal-200 hover:text-teal-700"
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
              <FilterMenu
                label="More Gmail filters"
                open={openFilterMenu === "search"}
                onToggle={() => setOpenFilterMenu((current) => (current === "search" ? null : "search"))}
              >
                {moreSearchChips.map((chip) => (
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
                        onSenderFilter={() => setSenderFilter(message.from)}
                        onGenerate={() => generateReply(message)}
                        onRemoveJunk={() => removeJunk(message)}
                      />
                    )) : <EmptyState title="No messages in this view" body="Try another filter, search Gmail, or load more results." />}
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
                <button type="button" onClick={connectGmail} disabled={isConnecting || !accessToken} className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#0b132b] px-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300">
                  {isConnecting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Mail className="h-4 w-4" aria-hidden="true" />}
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
                reply={reviewReply}
                isGenerating={Boolean(isGeneratingReply)}
                isDrafting={Boolean(isDrafting)}
                isCreatingReminder={isCreatingReminder}
                sources={reviewSources}
                warnings={draftWarnings}
                variantLabel={reviewVariantLabel}
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
                    { id: reviewMessageId, threadId: "", from: "", subject: reviewMessageSubject, date: "", snippet: "" },
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
                  {!(profile.businessName || profile.services) ? (
                    <Link href="/settings" className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl border border-teal-200 bg-white px-4 text-sm font-black text-teal-800 transition hover:-translate-y-0.5">
                      Add business context
                    </Link>
                  ) : null}
                </div>
              </div>
            )}
          </section>
        </div>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/60">
          <div className="grid gap-6 lg:grid-cols-2">
            <section>
              <div className="flex items-center gap-2">
                <Clock3 className="h-5 w-5 text-teal-700" aria-hidden="true" />
                <h2 className="text-2xl font-black">Follow-ups</h2>
              </div>
              <div className="mt-4 grid gap-3">
                {reminders.filter((reminder) => reminder.status === "pending").length ? (
                  reminders
                    .filter((reminder) => reminder.status === "pending")
                    .map((reminder) => (
                      <ReminderItem
                        key={reminder.id}
                        reminder={reminder}
                        busy={isCompletingReminder === reminder.id}
                        onComplete={() => completeReminder(reminder.id)}
                      />
                    ))
                ) : (
                  <p className="leading-7 text-slate-600">Follow-up reminders will appear here.</p>
                )}
              </div>
            </section>
            <section>
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-teal-700" aria-hidden="true" />
                <h2 className="text-2xl font-black">Draft history</h2>
              </div>
              <div className="mt-4 grid gap-3">
                {history.length ? history.map((event) => (
                  <HistoryItem key={event.id} event={event} onOpen={() => setSelectedDraftEvent(event)} />
                )) : (
                  <p className="leading-7 text-slate-600">Draft events will appear here after you create them.</p>
                )}
              </div>
            </section>
          </div>
        </section>
      </section>

      {activeModal === "context" ? (
        <Modal title="Business context" onClose={() => setActiveModal(null)}>
          <p className="text-sm leading-6 text-slate-600">This context improves every generated reply.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <ProfileInput label="Business name" value={profile.businessName} onChange={(value) => setProfile({ ...profile, businessName: value })} />
            <ProfileInput label="Business type" value={profile.businessType} onChange={(value) => setProfile({ ...profile, businessType: value })} />
            <ProfileInput label="Preferred tone" value={profile.replyTone} onChange={(value) => setProfile({ ...profile, replyTone: value })} />
            <ProfileInput label="Booking link" value={profile.bookingLink} onChange={(value) => setProfile({ ...profile, bookingLink: value })} />
            <ProfileInput label="Phone" value={profile.phone} onChange={(value) => setProfile({ ...profile, phone: value })} />
            <ProfileInput label="Hours" value={profile.hours} onChange={(value) => setProfile({ ...profile, hours: value })} />
            <div className="sm:col-span-2">
              <ProfileTextarea label="Services/products" value={profile.services} onChange={(value) => setProfile({ ...profile, services: value })} />
            </div>
            <div className="sm:col-span-2">
              <ProfileTextarea label="Never promise" value={profile.neverPromise} onChange={(value) => setProfile({ ...profile, neverPromise: value })} />
            </div>
            <div className="sm:col-span-2">
              <ProfileTextarea label="Learned owner voice" value={profile.voiceProfile} onChange={(value) => setProfile({ ...profile, voiceProfile: value })} />
            </div>
          </div>
          <ModalFooter>
            <button type="button" onClick={() => setActiveModal(null)} className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700">Cancel</button>
            <button type="button" onClick={() => saveProfile(true)} disabled={isSavingProfile} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#0b132b] px-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300">
              {isSavingProfile ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
              Save context
            </button>
          </ModalFooter>
        </Modal>
      ) : null}

      {activeModal === "voice" ? (
        <Modal title="Learn owner voice" onClose={() => setActiveModal(null)} wide>
          <p className="text-sm leading-6 text-slate-600">
            Load recent sent replies, select examples, and Gibraltar will save a compact style guide. Full sent emails are not stored.
          </p>
          {profile.voiceProfile ? (
            <div className="mt-4 rounded-xl border border-teal-100 bg-teal-50 p-4 text-sm leading-6 text-teal-900">
              Learned from {profile.voiceSampleCount ?? 0} examples{profile.voiceLearnedAt ? ` on ${new Date(profile.voiceLearnedAt).toLocaleDateString()}` : ""}.
            </div>
          ) : null}
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" onClick={loadVoiceSamples} disabled={!payload.connected || isLoadingSamples} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 disabled:cursor-not-allowed disabled:text-slate-300">
              {isLoadingSamples ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <History className="h-4 w-4" aria-hidden="true" />}
              Load sent replies
            </button>
            <button type="button" onClick={learnVoice} disabled={selectedVoiceSampleIds.length < 3 || isLearningVoice} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#0b132b] px-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300">
              {isLearningVoice ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}
              Learn voice
            </button>
          </div>
          <div className="brand-scrollbar mt-5 max-h-[50vh] space-y-3 overflow-y-auto pr-1">
            {voiceSamples.length ? voiceSamples.map((sample) => (
              <label key={sample.id} className="block rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start gap-3">
                  <input type="checkbox" checked={selectedVoiceSampleIds.includes(sample.id)} onChange={() => toggleVoiceSample(sample.id)} className="mt-1 h-4 w-4 accent-teal-600" />
                  <div className="min-w-0">
                    <p className="truncate font-black">{sample.subject || "(No subject)"}</p>
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{sample.body}</p>
                  </div>
                </div>
              </label>
            )) : (
              <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">Connect Gmail, then load sent replies to begin.</p>
            )}
          </div>
        </Modal>
      ) : null}

      {selectedMessage ? (
        <Modal title="Message details" onClose={() => setSelectedMessage(null)} wide>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-black uppercase text-teal-600">From</p>
              <p className="mt-1 truncate font-black">{selectedMessage.from}</p>
              <h2 className="mt-5 text-2xl font-black">{selectedMessage.subject}</h2>
              <p className="mt-2 text-sm text-slate-500">{selectedMessage.date}</p>
              {selectedMessage.triage ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <TriageBadges triage={selectedMessage.triage} />
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
      {selectedDraftEvent ? (
        <Modal title="Draft details" onClose={() => setSelectedDraftEvent(null)} wide>
          <DraftEventDetail event={selectedDraftEvent} />
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

function ActionButton({ icon: Icon, label, onClick, active }: { icon: typeof Settings; label: string; onClick: () => void; active: boolean }) {
  return (
    <button type="button" onClick={onClick} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-black transition ${active ? "border-teal-200 bg-teal-50 text-teal-800" : "border-slate-200 bg-white text-slate-700 hover:border-teal-200 hover:text-teal-700"}`}>
      <Icon className="h-4 w-4" aria-hidden="true" />
      {label}
    </button>
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
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 sm:w-48">
          <div className="h-full rounded-full bg-teal-500" style={{ width: `${(complete / items.length) * 100}%` }} />
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

  if (!profile.businessName.trim()) {
    warnings.push("Business name is missing, so the draft may sound less specific.");
  }

  if ((category === "booking" || text.includes("book") || text.includes("schedule")) && !profile.bookingLink.trim() && !profile.phone.trim()) {
    warnings.push("This looks booking-related, but no booking link or phone number is saved.");
  }

  if ((category === "pricing" || text.includes("price") || text.includes("cost") || text.includes("quote")) && !profile.services.trim()) {
    warnings.push("This looks pricing-related, but services or pricing guidance is missing.");
  }

  if ((text.includes("hour") || text.includes("open") || text.includes("available")) && !profile.hours.trim()) {
    warnings.push("The draft may discuss availability, but business hours are missing.");
  }

  if (!profile.neverPromise.trim()) {
    warnings.push("No guardrails are saved in Never promise. Add anything Gibraltar should avoid promising.");
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

function FilterButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-9 shrink-0 rounded-xl px-3 text-sm font-black transition ${
        active
          ? "bg-[#0b132b] text-white"
          : "border border-slate-200 bg-white text-slate-600 hover:border-teal-200 hover:text-teal-700"
      }`}
    >
      {label}
    </button>
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
  onSenderFilter,
  onGenerate,
  onRemoveJunk,
}: {
  message: GmailMessage;
  busy: boolean;
  isOpening: boolean;
  isRemovingJunk: boolean;
  disabled: boolean;
  onOpen: () => void;
  onSenderFilter: () => void;
  onGenerate: () => void;
  onRemoveJunk: () => void;
}) {
  const needsReply = message.triage?.needsReply ?? true;

  return (
    <article className={`border-l-4 transition hover:bg-slate-50 ${needsReply ? "border-l-orange-400 bg-orange-50/60" : "border-l-transparent bg-white"}`}>
      <div className="grid gap-3 px-4 py-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
        <div className="grid min-w-0 gap-2">
          <button type="button" onClick={onOpen} className="grid min-w-0 gap-2 text-left">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <p className="min-w-0 flex-1 truncate font-black text-slate-950">{message.subject}</p>
              {message.triage ? <TriageBadges triage={message.triage} compact /> : null}
              {isOpening ? (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-teal-100 px-2 py-1 text-xs font-black uppercase text-teal-800">
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                  Opening
                </span>
              ) : null}
            </div>
            <p className="line-clamp-1 text-sm leading-5 text-slate-500">{message.snippet || "No preview available."}</p>
          </button>
          <button
            type="button"
            onClick={onSenderFilter}
            className="block max-w-full truncate text-left text-xs font-black uppercase tracking-wide text-slate-500 transition hover:text-teal-700"
          >
            {message.from}
          </button>
        </div>
        <div className="flex flex-wrap gap-2 xl:justify-end">
          <button type="button" onClick={onRemoveJunk} disabled={disabled} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-600 transition hover:border-red-200 hover:text-red-700 disabled:cursor-not-allowed disabled:text-slate-300">
            {isRemovingJunk ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Trash2 className="h-4 w-4" aria-hidden="true" />}
            Remove junk
          </button>
          <button type="button" onClick={onGenerate} disabled={disabled} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#0b132b] px-4 text-sm font-black text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:hover:translate-y-0">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <PencilLine className="h-4 w-4" aria-hidden="true" />}
            Generate reply
          </button>
        </div>
      </div>
    </article>
  );
}

function TriageBadges({ triage, compact = false }: { triage: MessageTriage; compact?: boolean }) {
  const categoryLabels: Record<TriageCategory, string> = {
    booking: "Booking",
    pricing: "Pricing",
    complaint: "Issue",
    follow_up: "Follow-up",
    general: "General",
    low_priority: "Low priority",
  };
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
        {categoryLabels[triage.category]}
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
function ReviewPanel({
  subject,
  reply,
  isGenerating,
  isDrafting,
  isCreatingReminder,
  sources,
  warnings,
  variantLabel,
  onReplyChange,
  onCreateDraft,
  onCreateReminder,
  onRevise,
}: {
  subject: string;
  reply: string;
  isGenerating: boolean;
  isDrafting: boolean;
  isCreatingReminder: string;
  sources: ReplySources | null;
  warnings: string[];
  variantLabel: string;
  onReplyChange: (value: string) => void;
  onCreateDraft: (sendNow: boolean) => void;
  onCreateReminder: (days: number) => void;
  onRevise: (instruction: string, label: string) => void;
}) {
  return (
    <section>
      <div className="flex items-center gap-2 text-teal-700">
        <PencilLine className="h-5 w-5" aria-hidden="true" />
        <p className="font-black">Review reply</p>
      </div>
      <h2 className="mt-3 text-2xl font-black">{subject}</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        <SourceBadge label="Business context" active={Boolean(sources?.businessContext)} />
        <SourceBadge label="Owner voice" active={Boolean(sources?.voiceProfile)} />
        <SourceBadge label={`${sources?.threadMessages ?? 1} thread messages`} active />
        <SourceBadge label={`Variant: ${variantLabel}`} active />
      </div>
      <textarea value={reply} onChange={(event) => onReplyChange(event.target.value)} rows={12} className="mt-5 w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-4 leading-7 text-slate-800 outline-none transition focus:border-teal-300 focus:ring-4 focus:ring-teal-100" />
      <div className="mt-4 flex flex-wrap gap-2">
        <ReviewButton label="A: Concise" disabled={isGenerating} onClick={() => onRevise("Create variant A: a concise, direct reply with the minimum needed next step.", "A: Concise")} />
        <ReviewButton label="B: Warm" disabled={isGenerating} onClick={() => onRevise("Create variant B: a warmer, more personable reply that still stays concise.", "B: Warm")} />
        <ReviewButton label="C: Conversion" disabled={isGenerating} onClick={() => onRevise("Create variant C: a reply optimized for moving the customer to the next action without sounding pushy.", "C: Conversion")} />
        <ReviewButton label="Ask availability" disabled={isGenerating} onClick={() => onRevise("Ask the customer for their availability and any details needed to move forward.", "Availability")} />
        <ReviewButton label="Add booking link" disabled={isGenerating} onClick={() => onRevise("Include the booking link if one is available in the business context.", "Booking link")} />
        <button type="button" onClick={() => onRevise("", "Original")} disabled={isGenerating} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:border-teal-200 hover:text-teal-700 disabled:cursor-not-allowed disabled:text-slate-300">
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Regenerate
        </button>
      </div>
      {warnings.length ? (
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <div className="flex items-center gap-2">
            <CircleAlert className="h-4 w-4" aria-hidden="true" />
            <p className="text-sm font-black uppercase">Check missing info</p>
          </div>
          <ul className="mt-3 space-y-2 text-sm font-semibold leading-6">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <button type="button" onClick={() => onCreateDraft(false)} disabled={isDrafting || !reply.trim()} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-teal-200 bg-white px-5 text-sm font-black text-teal-800 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300 disabled:hover:translate-y-0">
          {isDrafting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Mail className="h-4 w-4" aria-hidden="true" />}
          Create Gmail draft
        </button>
        <button type="button" onClick={() => onCreateDraft(true)} disabled={isDrafting || !reply.trim()} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-blue-600 px-5 text-sm font-black text-white shadow-lg shadow-blue-500/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300 disabled:hover:translate-y-0">
          {isDrafting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ArrowRight className="h-4 w-4" aria-hidden="true" />}
          Send now
        </button>
      </div>
      <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-black uppercase text-slate-500">Follow up later</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <ReminderButton label="Tomorrow" days={1} busy={isCreatingReminder} onClick={onCreateReminder} />
          <ReminderButton label="2 days" days={2} busy={isCreatingReminder} onClick={onCreateReminder} />
          <ReminderButton label="1 week" days={7} busy={isCreatingReminder} onClick={onCreateReminder} />
        </div>
      </div>
    </section>
  );
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

function ModalFooter({ children }: { children: React.ReactNode }) {
  return <div className="mt-6 flex justify-end gap-2 border-t border-slate-200 pt-4">{children}</div>;
}

function ProfileInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-slate-700">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-teal-300 focus:ring-4 focus:ring-teal-100" />
    </label>
  );
}

function ProfileTextarea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-slate-700">{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={4} className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm leading-6 text-slate-950 outline-none transition focus:border-teal-300 focus:ring-4 focus:ring-teal-100" />
    </label>
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
