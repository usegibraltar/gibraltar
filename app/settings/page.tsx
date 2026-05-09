"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, CheckCircle2, History, Loader2, LogOut, Mail, Save, Settings, Sparkles, Trash2, Unplug } from "lucide-react";
import { AppHeader } from "../components/app-header";
import { GoogleGIcon } from "../components/google-g-icon";
import { friendlyErrorMessage } from "../lib/friendly-error";
import { getSupabaseBrowser } from "../lib/supabase-browser";

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
  body: string;
};

type PlaybookCategory = "pricing" | "booking" | "cancellation" | "complaint" | "follow_up" | "general";

type ReplyPlaybook = {
  id: string;
  title: string;
  category: PlaybookCategory;
  guidance: string;
  default_cta: string | null;
  enabled: boolean;
};

type PlaybookDraft = {
  id: string;
  title: string;
  category: PlaybookCategory;
  guidance: string;
  defaultCta: string;
  enabled: boolean;
};

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

const defaultPlaybook: PlaybookDraft = {
  id: "",
  title: "",
  category: "general",
  guidance: "",
  defaultCta: "",
  enabled: true,
};

const playbookCategories: Array<{ label: string; value: PlaybookCategory }> = [
  { label: "Pricing inquiry", value: "pricing" },
  { label: "Booking request", value: "booking" },
  { label: "Cancellation/reschedule", value: "cancellation" },
  { label: "Complaint", value: "complaint" },
  { label: "Follow-up", value: "follow_up" },
  { label: "General question", value: "general" },
];

const starterPlaybooks: PlaybookDraft[] = [
  {
    id: "",
    title: "Pricing inquiry",
    category: "pricing",
    guidance: "Answer pricing questions clearly and confidently, but never invent exact prices unless they are saved in business context. Explain what affects the quote, ask only for the details needed to estimate accurately, and move the customer toward the next step. If pricing is not known, frame the reply around getting them an accurate answer instead of guessing.",
    defaultCta: "Ask for the key details needed to provide an accurate quote.",
    enabled: true,
  },
  {
    id: "",
    title: "Booking request",
    category: "booking",
    guidance: "Make booking feel easy and immediate. Mention the booking link or phone number when available, ask for preferred times only when needed, and avoid promising availability unless it is explicitly known. Keep the reply short, warm, and action-oriented so the customer knows exactly how to get on the calendar.",
    defaultCta: "Invite the customer to book or share their preferred time window.",
    enabled: true,
  },
  {
    id: "",
    title: "Complaint",
    category: "complaint",
    guidance: "Lead with calm acknowledgement and make the customer feel heard. Avoid defensiveness, blame, and unsupported admissions of fault. Do not promise refunds, discounts, timelines, or outcomes unless the business context supports them. Move toward a practical next step such as gathering details, offering a call, or escalating to the owner.",
    defaultCta: "Ask for the details needed to make this right or continue the conversation.",
    enabled: true,
  },
  {
    id: "",
    title: "Follow-up",
    category: "follow_up",
    guidance: "Keep follow-ups brief, useful, and human. Reference the prior conversation naturally, make the next step easy, and avoid sounding pushy or automated. Assume the customer is busy, not uninterested. Give them a graceful way to respond or move forward.",
    defaultCta: "Ask whether they would like to move forward or need anything else.",
    enabled: true,
  },
  {
    id: "",
    title: "Cancellation or reschedule",
    category: "cancellation",
    guidance: "Be understanding, efficient, and clear. Confirm the cancellation or reschedule request, ask for the needed timing details, and mention policies only when they are saved in business context. Do not create fees, refund rules, or availability claims that are not explicitly known.",
    defaultCta: "Ask for the new preferred time or confirm the requested change.",
    enabled: true,
  },
  {
    id: "",
    title: "General question",
    category: "general",
    guidance: "Answer the customer directly in a friendly, concise way. Use business context where available, avoid unsupported claims, and do not bury the useful answer under filler. End with a clear next step only when one helps the customer move forward.",
    defaultCta: "Offer to help with the next question or next step.",
    enabled: true,
  },
];

export default function SettingsPage() {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [accessToken, setAccessToken] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [profile, setProfile] = useState<BusinessProfile>(emptyProfile);
  const [gmailEmail, setGmailEmail] = useState("");
  const [voiceSamples, setVoiceSamples] = useState<VoiceSample[]>([]);
  const [selectedVoiceSampleIds, setSelectedVoiceSampleIds] = useState<string[]>([]);
  const [playbooks, setPlaybooks] = useState<ReplyPlaybook[]>([]);
  const [playbookDraft, setPlaybookDraft] = useState<PlaybookDraft>(defaultPlaybook);
  const [activeTab, setActiveTab] = useState<"gmail" | "context" | "voice" | "playbooks" | "account">("gmail");
  const [confirmDisconnectOpen, setConfirmDisconnectOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingPlaybook, setIsSavingPlaybook] = useState(false);
  const [isDeletingPlaybook, setIsDeletingPlaybook] = useState("");
  const [isTogglingPlaybook, setIsTogglingPlaybook] = useState("");
  const [isLoadingSamples, setIsLoadingSamples] = useState(false);
  const [isLearningVoice, setIsLearningVoice] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const authedFetch = useMemo(
    () => async (url: string, init: RequestInit = {}) =>
      fetch(url, {
        ...init,
        headers: {
          ...(init.headers ?? {}),
          Authorization: `Bearer ${accessToken}`,
        },
      }),
    [accessToken],
  );

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
      await loadInitial(session.access_token);
    }

    void boot();
  }, [supabase]);

  async function loadInitial(token: string) {
    setIsLoading(true);
    setError("");

    try {
      const [profileResponse, gmailResponse, playbooksResponse] = await Promise.all([
        fetch("/api/profile", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/gmail/status", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/playbooks", { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const profileBody = (await profileResponse.json()) as { profile?: BusinessProfile; error?: string };
      const gmailBody = (await gmailResponse.json()) as { connected?: boolean; gmailEmail?: string | null; error?: string };
      const playbooksBody = (await playbooksResponse.json()) as { playbooks?: ReplyPlaybook[]; error?: string };

      if (!profileResponse.ok) {
        throw new Error(profileBody.error ?? "Could not load business context.");
      }

      if (!gmailResponse.ok) {
        throw new Error(gmailBody.error ?? "Could not load Gmail status.");
      }

      if (!playbooksResponse.ok) {
        throw new Error(playbooksBody.error ?? "Could not load reply playbooks.");
      }

      setProfile(profileBody.profile ?? emptyProfile);
      setGmailEmail(gmailBody.connected ? gmailBody.gmailEmail ?? "Connected" : "");
      setPlaybooks(playbooksBody.playbooks ?? []);
    } catch (loadError) {
      setError(friendlyErrorMessage(loadError, "Could not load settings."));
    } finally {
      setIsLoading(false);
    }
  }

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
      setError(friendlyErrorMessage(connectError, "Could not start Gmail connection."));
      setIsConnecting(false);
    }
  }

  async function disconnectGmail() {
    setIsDisconnecting(true);
    setError("");

    try {
      const response = await authedFetch("/api/gmail/disconnect", { method: "POST" });
      const body = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(body.error ?? "Could not disconnect Gmail.");
      }

      setGmailEmail("");
      setSuccess("Gmail disconnected.");
    } catch (disconnectError) {
      setError(friendlyErrorMessage(disconnectError, "Could not disconnect Gmail."));
    } finally {
      setIsDisconnecting(false);
    }
  }

  async function saveProfile() {
    setIsSaving(true);
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
    } catch (saveError) {
      setError(friendlyErrorMessage(saveError, "Could not save business context."));
    } finally {
      setIsSaving(false);
    }
  }

  async function loadVoiceSamples() {
    setIsLoadingSamples(true);
    setError("");

    try {
      const response = await authedFetch("/api/voice/samples");
      const body = (await response.json()) as { samples?: VoiceSample[]; error?: string };

      if (!response.ok) {
        throw new Error(body.error ?? "Could not load sent email samples.");
      }

      const samples = body.samples ?? [];
      setVoiceSamples(samples);
      setSelectedVoiceSampleIds(samples.slice(0, 5).map((sample) => sample.id));
    } catch (sampleError) {
      setError(friendlyErrorMessage(sampleError, "Could not load sent email samples."));
    } finally {
      setIsLoadingSamples(false);
    }
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
      setSuccess("Owner voice learned.");
    } catch (voiceError) {
      setError(friendlyErrorMessage(voiceError, "Could not learn owner voice."));
    } finally {
      setIsLearningVoice(false);
    }
  }

  function editPlaybook(playbook: ReplyPlaybook) {
    setPlaybookDraft({
      id: playbook.id,
      title: playbook.title,
      category: playbook.category,
      guidance: playbook.guidance,
      defaultCta: playbook.default_cta ?? "",
      enabled: playbook.enabled,
    });
  }

  async function savePlaybook() {
    setIsSavingPlaybook(true);
    setError("");
    setSuccess("");

    try {
      const url = playbookDraft.id ? `/api/playbooks/${encodeURIComponent(playbookDraft.id)}` : "/api/playbooks";
      const response = await authedFetch(url, {
        method: playbookDraft.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(playbookDraft),
      });
      const body = (await response.json()) as { playbook?: ReplyPlaybook; error?: string };

      if (!response.ok || !body.playbook) {
        throw new Error(body.error ?? "Could not save reply playbook.");
      }

      const savedPlaybook = body.playbook;
      setPlaybooks((current) =>
        playbookDraft.id
          ? current.map((playbook) => (playbook.id === savedPlaybook.id ? savedPlaybook : playbook))
          : [...current, savedPlaybook],
      );
      setPlaybookDraft(defaultPlaybook);
      setSuccess("Reply playbook saved.");
    } catch (playbookError) {
      setError(friendlyErrorMessage(playbookError, "Could not save reply playbook."));
    } finally {
      setIsSavingPlaybook(false);
    }
  }

  async function deletePlaybook(id: string) {
    setIsDeletingPlaybook(id);
    setError("");
    setSuccess("");

    try {
      const response = await authedFetch(`/api/playbooks/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const body = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(body.error ?? "Could not delete reply playbook.");
      }

      setPlaybooks((current) => current.filter((playbook) => playbook.id !== id));
      if (playbookDraft.id === id) {
        setPlaybookDraft(defaultPlaybook);
      }
      setSuccess("Reply playbook deleted.");
    } catch (playbookError) {
      setError(friendlyErrorMessage(playbookError, "Could not delete reply playbook."));
    } finally {
      setIsDeletingPlaybook("");
    }
  }

  async function togglePlaybook(playbook: ReplyPlaybook) {
    setIsTogglingPlaybook(playbook.id);
    setError("");
    setSuccess("");

    try {
      const response = await authedFetch(`/api/playbooks/${encodeURIComponent(playbook.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: playbook.id,
          title: playbook.title,
          category: playbook.category,
          guidance: playbook.guidance,
          defaultCta: playbook.default_cta ?? "",
          enabled: !playbook.enabled,
        }),
      });
      const body = (await response.json()) as { playbook?: ReplyPlaybook; error?: string };

      if (!response.ok || !body.playbook) {
        throw new Error(body.error ?? "Could not update reply playbook.");
      }

      setPlaybooks((current) => current.map((item) => (item.id === body.playbook?.id ? body.playbook : item)));
      if (playbookDraft.id === body.playbook.id) {
        setPlaybookDraft({
          id: body.playbook.id,
          title: body.playbook.title,
          category: body.playbook.category,
          guidance: body.playbook.guidance,
          defaultCta: body.playbook.default_cta ?? "",
          enabled: body.playbook.enabled,
        });
      }
      setSuccess(body.playbook.enabled ? "Reply playbook enabled." : "Reply playbook paused.");
    } catch (playbookError) {
      setError(friendlyErrorMessage(playbookError, "Could not update reply playbook."));
    } finally {
      setIsTogglingPlaybook("");
    }
  }

  function toggleVoiceSample(id: string) {
    setSelectedVoiceSampleIds((current) =>
      current.includes(id) ? current.filter((sampleId) => sampleId !== id) : [...current, id],
    );
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.replace("/login");
  }

  return (
    <main className="min-h-screen bg-[#f8fbff] text-[#0b132b]">
      <AppHeader active="settings" userEmail={userEmail} onSignOut={signOut} />

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
              <Settings className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-black uppercase text-teal-600">Settings</p>
              <h1 className="text-3xl font-black">Business setup</h1>
            </div>
          </div>
          <p className="mt-4 max-w-3xl leading-7 text-slate-600">
            Connect Gmail, save business context, and learn the owner voice before drafting replies.
          </p>
        </section>

        {error ? <Notice tone="error" text={error} /> : null}
        {success ? <Notice tone="success" text={success} /> : null}

        {isLoading ? (
          <div className="mt-6 flex min-h-80 items-center justify-center rounded-2xl border border-slate-200 bg-white">
            <Loader2 className="h-8 w-8 animate-spin text-teal-600" aria-hidden="true" />
          </div>
        ) : (
          <>
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-200/60">
            <div className="grid gap-2 sm:grid-cols-5">
              <SettingsTab label="Gmail" active={activeTab === "gmail"} onClick={() => setActiveTab("gmail")} />
              <SettingsTab label="Business context" active={activeTab === "context"} onClick={() => setActiveTab("context")} />
              <SettingsTab label="Voice" active={activeTab === "voice"} onClick={() => setActiveTab("voice")} />
              <SettingsTab label="Playbooks" active={activeTab === "playbooks"} onClick={() => setActiveTab("playbooks")} />
              <SettingsTab label="Account" active={activeTab === "account"} onClick={() => setActiveTab("account")} />
            </div>
          </div>

          <div className="mt-6">
            {activeTab === "gmail" ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/60">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-teal-700" aria-hidden="true" />
                <h2 className="text-2xl font-black">Gmail</h2>
              </div>
              <div className="mt-4 rounded-xl border border-teal-100 bg-teal-50 p-4 text-sm font-semibold leading-6 text-teal-950">
                By connecting Gmail, you allow Gibraltar to read mailbox data needed to show email threads, create drafts, and send emails only when Send now is confirmed. Gmail tokens are stored encrypted, and Gmail can be disconnected anytime here.
              </div>
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className={`h-5 w-5 ${gmailEmail ? "text-teal-600" : "text-slate-300"}`} aria-hidden="true" />
                  <p className="font-black">{gmailEmail || "Not connected"}</p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={connectGmail} disabled={isConnecting || !accessToken} className="group inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#dadce0] bg-white px-4 text-sm font-black text-[#3c4043] shadow-sm shadow-slate-200/70 transition hover:-translate-y-0.5 hover:border-[#c7cdd3] hover:bg-[#f8fbff] hover:text-slate-950 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200 transition group-hover:ring-slate-300">
                      {isConnecting ? <Loader2 className="h-4 w-4 animate-spin text-slate-500" aria-hidden="true" /> : <GoogleGIcon className="h-4 w-4" />}
                    </span>
                    {gmailEmail ? "Reconnect Gmail" : "Connect Gmail"}
                  </button>
                  <button type="button" onClick={() => setConfirmDisconnectOpen(true)} disabled={!gmailEmail || isDisconnecting} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 disabled:cursor-not-allowed disabled:text-slate-300">
                    {isDisconnecting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Unplug className="h-4 w-4" aria-hidden="true" />}
                    Disconnect
                  </button>
                </div>
              </div>
            </section>
            ) : null}

            {activeTab === "context" ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/60">
              <div className="flex items-center gap-2">
                <Save className="h-5 w-5 text-teal-700" aria-hidden="true" />
                <h2 className="text-2xl font-black">Business context</h2>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field label="Business name" value={profile.businessName} onChange={(value) => setProfile({ ...profile, businessName: value })} />
                <Field label="Business type" value={profile.businessType} onChange={(value) => setProfile({ ...profile, businessType: value })} />
                <Field label="Preferred tone" value={profile.replyTone} onChange={(value) => setProfile({ ...profile, replyTone: value })} />
                <Field label="Booking link" value={profile.bookingLink} onChange={(value) => setProfile({ ...profile, bookingLink: value })} />
                <Field label="Phone" value={profile.phone} onChange={(value) => setProfile({ ...profile, phone: value })} />
                <Field label="Hours" value={profile.hours} onChange={(value) => setProfile({ ...profile, hours: value })} />
                <div className="sm:col-span-2">
                  <Textarea label="Services/products" value={profile.services} onChange={(value) => setProfile({ ...profile, services: value })} />
                </div>
                <div className="sm:col-span-2">
                  <Textarea label="Never promise" value={profile.neverPromise} onChange={(value) => setProfile({ ...profile, neverPromise: value })} />
                </div>
              </div>
              <button type="button" onClick={saveProfile} disabled={isSaving} className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#0b132b] px-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
                Save context
              </button>
            </section>
            ) : null}

            {activeTab === "voice" ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/60 lg:col-span-2">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-teal-700" aria-hidden="true" />
                  <h2 className="text-2xl font-black">Owner voice</h2>
                </div>
                {profile.voiceProfile ? (
                  <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-black uppercase text-teal-800">
                    Learned from {profile.voiceSampleCount ?? 0}
                  </span>
                ) : null}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={loadVoiceSamples} disabled={!gmailEmail || isLoadingSamples} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 disabled:cursor-not-allowed disabled:text-slate-300">
                  {isLoadingSamples ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <History className="h-4 w-4" aria-hidden="true" />}
                  Load sent replies
                </button>
                <button type="button" onClick={learnVoice} disabled={selectedVoiceSampleIds.length < 3 || isLearningVoice} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#0b132b] px-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300">
                  {isLearningVoice ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}
                  Learn voice
                </button>
              </div>
              {profile.voiceProfile ? (
                <div className="mt-4 rounded-xl border border-teal-100 bg-teal-50 p-4 text-sm leading-6 text-teal-900">{profile.voiceProfile}</div>
              ) : null}
              <div className="brand-scrollbar mt-5 max-h-[46vh] space-y-3 overflow-y-auto pr-1">
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
            </section>
            ) : null}

            {activeTab === "playbooks" ? (
              <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/60">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#173c27] text-[#f7fbf1]">
                        <BookOpen className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <div>
                        <p className="text-sm font-black uppercase text-teal-700">Reply logic</p>
                        <h2 className="text-2xl font-black">{playbookDraft.id ? "Edit playbook" : "New playbook"}</h2>
                        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                          Playbooks give Gibraltar reusable owner-approved judgment for repeat customer situations.
                        </p>
                      </div>
                    </div>
                  </div>
                  {!playbookDraft.id ? (
                    <div className="mt-5 rounded-2xl border border-teal-100 bg-teal-50 p-4">
                      <div className="flex flex-col gap-1">
                        <p className="text-sm font-black uppercase text-teal-700">Starter templates</p>
                        <p className="text-sm font-semibold text-teal-900">Pick one, tune it once, then let Gibraltar apply it inside the reply engine.</p>
                      </div>
                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        {starterPlaybooks.map((starter) => (
                          <StarterTemplateButton
                            key={starter.title}
                            starter={starter}
                            onClick={() => setPlaybookDraft(starter)}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-5 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950">
                      Editing {playbookDraft.title}. Changes apply to future generated replies.
                    </div>
                  )}
                  <div className="mt-5 grid gap-4">
                    <Field label="Title" value={playbookDraft.title} onChange={(value) => setPlaybookDraft({ ...playbookDraft, title: value })} />
                    <label className="block">
                      <span className="text-sm font-bold text-slate-700">Category</span>
                      <select value={playbookDraft.category} onChange={(event) => setPlaybookDraft({ ...playbookDraft, category: event.target.value as PlaybookCategory })} className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-teal-300 focus:ring-4 focus:ring-teal-100">
                        {playbookCategories.map((category) => (
                          <option key={category.value} value={category.value}>{category.label}</option>
                        ))}
                      </select>
                    </label>
                    <Textarea label="Guidance" value={playbookDraft.guidance} onChange={(value) => setPlaybookDraft({ ...playbookDraft, guidance: value })} />
                    <Textarea label="Default CTA" value={playbookDraft.defaultCta} onChange={(value) => setPlaybookDraft({ ...playbookDraft, defaultCta: value })} />
                    <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-black text-slate-700">
                      <span>
                        Enabled for reply generation
                        <span className="mt-1 block text-xs font-semibold text-slate-500">Disabled playbooks stay saved but will not be suggested.</span>
                      </span>
                      <input type="checkbox" checked={playbookDraft.enabled} onChange={(event) => setPlaybookDraft({ ...playbookDraft, enabled: event.target.checked })} className="h-5 w-5 accent-teal-600" />
                    </label>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <button type="button" onClick={savePlaybook} disabled={isSavingPlaybook} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#173c27] px-4 text-sm font-black text-[#f7fbf1] disabled:cursor-not-allowed disabled:bg-slate-300">
                      {isSavingPlaybook ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
                      Save playbook
                    </button>
                    {playbookDraft.id ? (
                      <button type="button" onClick={() => setPlaybookDraft(defaultPlaybook)} className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700">
                        New playbook
                      </button>
                    ) : null}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/60">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-black uppercase text-teal-600">Saved playbooks</p>
                      <h2 className="text-2xl font-black">{playbooks.filter((playbook) => playbook.enabled).length} active / {playbooks.length} total</h2>
                      <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">These are available in the reply panel as reusable guidance.</p>
                    </div>
                    <button type="button" onClick={() => setPlaybookDraft(defaultPlaybook)} className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 transition hover:border-teal-200 hover:text-teal-700">
                      New playbook
                    </button>
                  </div>
                  <div className="mt-5 grid gap-3">
                    {playbooks.length ? playbooks.map((playbook) => (
                      <SettingsPlaybookCard
                        key={playbook.id}
                        playbook={playbook}
                        isDeleting={isDeletingPlaybook === playbook.id}
                        isToggling={isTogglingPlaybook === playbook.id}
                        onEdit={() => editPlaybook(playbook)}
                        onToggle={() => togglePlaybook(playbook)}
                        onDelete={() => deletePlaybook(playbook.id)}
                      />
                    )) : (
                      <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">Create playbooks for the replies you send most often.</p>
                    )}
                  </div>
                </div>
              </section>
            ) : null}

            {activeTab === "account" ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/60">
                <div className="flex items-center gap-2">
                  <LogOut className="h-5 w-5 text-teal-700" aria-hidden="true" />
                  <h2 className="text-2xl font-black">Account</h2>
                </div>
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-black uppercase text-slate-500">Signed in as</p>
                  <p className="mt-2 font-black">{userEmail}</p>
                  <button type="button" onClick={signOut} className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 text-sm font-black text-red-700">
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    Sign out
                  </button>
                </div>
              </section>
            ) : null}
          </div>
          </>
        )}
      </section>
      {confirmDisconnectOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-8 backdrop-blur-sm">
          <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-950/20">
            <h2 className="text-2xl font-black">Disconnect Gmail?</h2>
            <p className="mt-3 leading-7 text-slate-600">
              Gibraltar will remove the saved Gmail connection. Replies, analytics, and settings will remain, but new drafts and sends will require reconnecting Gmail.
            </p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setConfirmDisconnectOpen(false)} className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700">
                Keep connected
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmDisconnectOpen(false);
                  void disconnectGmail();
                }}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 text-sm font-black text-red-700"
              >
                <Unplug className="h-4 w-4" aria-hidden="true" />
                Disconnect Gmail
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

function SettingsTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-11 rounded-xl px-3 text-sm font-black transition ${
        active ? "bg-[#0b132b] text-white" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
      }`}
    >
      {label}
    </button>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-slate-700">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-teal-300 focus:ring-4 focus:ring-teal-100" />
    </label>
  );
}

function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-slate-700">{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={4} className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm leading-6 text-slate-950 outline-none transition focus:border-teal-300 focus:ring-4 focus:ring-teal-100" />
    </label>
  );
}

function Notice({ tone, text }: { tone: "success" | "error"; text: string }) {
  const classes = tone === "success" ? "border-teal-100 bg-teal-50 text-teal-700" : "border-red-100 bg-red-50 text-red-700";
  return <div className={`mt-4 rounded-xl border px-4 py-3 text-sm font-bold ${classes}`}>{text}</div>;
}

function StarterTemplateButton({ starter, onClick }: { starter: PlaybookDraft; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border border-teal-200 bg-white px-3 py-3 text-left transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-sm"
    >
      <span className="block text-sm font-black text-teal-950">{starter.title}</span>
      <span className="mt-1 block text-xs font-black uppercase text-teal-700">{playbookCategoryLabel(starter.category)}</span>
      <span className="mt-2 line-clamp-2 block text-xs font-semibold leading-5 text-slate-600">{starter.defaultCta}</span>
    </button>
  );
}

function SettingsPlaybookCard({
  playbook,
  isDeleting,
  isToggling,
  onEdit,
  onToggle,
  onDelete,
}: {
  playbook: ReplyPlaybook;
  isDeleting: boolean;
  isToggling: boolean;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <article className={`rounded-2xl border p-4 transition ${playbook.enabled ? "border-slate-200 bg-slate-50" : "border-slate-200 bg-white opacity-75"}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-black">{playbook.title}</p>
            <span className={`rounded-full px-2 py-1 text-xs font-black uppercase ${playbook.enabled ? "bg-teal-100 text-teal-800" : "bg-slate-200 text-slate-600"}`}>
              {playbook.enabled ? "Enabled" : "Paused"}
            </span>
            <span className="rounded-full bg-white px-2 py-1 text-xs font-black uppercase text-slate-500">
              {playbookCategoryLabel(playbook.category)}
            </span>
          </div>
          <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{playbook.guidance}</p>
          {playbook.default_cta ? (
            <p className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
              CTA: {playbook.default_cta}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button type="button" onClick={onToggle} disabled={isToggling} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 transition hover:border-teal-200 hover:text-teal-700 disabled:cursor-not-allowed disabled:text-slate-300">
            {isToggling ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
            {playbook.enabled ? "Pause" : "Enable"}
          </button>
          <button type="button" onClick={onEdit} className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 transition hover:border-teal-200 hover:text-teal-700">
            Edit
          </button>
          <button type="button" onClick={onDelete} disabled={isDeleting} aria-label={`Delete ${playbook.title}`} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-700 disabled:cursor-not-allowed disabled:text-slate-300">
            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Trash2 className="h-4 w-4" aria-hidden="true" />}
          </button>
        </div>
      </div>
    </article>
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
