"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  LayoutDashboard,
  Loader2,
  LogOut,
  Mail,
  Settings,
  Sparkles,
  Zap,
} from "lucide-react";
import { DraftAnalytics } from "../components/analytics-panel";
import { friendlyErrorMessage } from "../lib/friendly-error";
import { getSupabaseBrowser } from "../lib/supabase-browser";

type BusinessProfile = {
  businessName: string;
  services: string;
  bookingLink: string;
  phone: string;
  neverPromise: string;
  voiceProfile: string;
};

type FollowUpReminder = {
  id: string;
  source_subject: string | null;
  due_at: string;
  status: "pending" | "completed";
};

type ReplyPlaybook = {
  id: string;
  title: string;
  enabled: boolean;
};

type GmailStatus = {
  connected?: boolean;
  gmailEmail?: string | null;
};

export default function HomeBasePage() {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [accessToken, setAccessToken] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [gmailStatus, setGmailStatus] = useState<GmailStatus>({});
  const [analytics, setAnalytics] = useState<DraftAnalytics | null>(null);
  const [reminders, setReminders] = useState<FollowUpReminder[]>([]);
  const [playbooks, setPlaybooks] = useState<ReplyPlaybook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

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
      await loadCommandCenter(session.access_token);
    }

    void boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  async function loadCommandCenter(token = accessToken) {
    if (!token) {
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [profileResponse, gmailResponse, analyticsResponse, remindersResponse, playbooksResponse] =
        await Promise.all([
          fetch("/api/profile", { headers }),
          fetch("/api/gmail/status", { headers }),
          fetch("/api/gmail/analytics", { headers }),
          fetch("/api/follow-ups", { headers }),
          fetch("/api/playbooks", { headers }),
        ]);
      const profileBody = (await profileResponse.json()) as { profile?: BusinessProfile; error?: string };
      const gmailBody = (await gmailResponse.json()) as GmailStatus & { error?: string };
      const analyticsBody = (await analyticsResponse.json()) as DraftAnalytics & { error?: string };
      const remindersBody = (await remindersResponse.json()) as { reminders?: FollowUpReminder[]; error?: string };
      const playbooksBody = (await playbooksResponse.json()) as { playbooks?: ReplyPlaybook[]; error?: string };

      if (!profileResponse.ok) {
        throw new Error(profileBody.error ?? "Could not load business context.");
      }
      if (!gmailResponse.ok) {
        throw new Error(gmailBody.error ?? "Could not load Gmail status.");
      }
      if (!analyticsResponse.ok) {
        throw new Error(analyticsBody.error ?? "Could not load analytics.");
      }
      if (!remindersResponse.ok) {
        throw new Error(remindersBody.error ?? "Could not load follow-ups.");
      }
      if (!playbooksResponse.ok) {
        throw new Error(playbooksBody.error ?? "Could not load playbooks.");
      }

      setProfile(profileBody.profile ?? null);
      setGmailStatus(gmailBody);
      setAnalytics(analyticsBody);
      setReminders(remindersBody.reminders ?? []);
      setPlaybooks(playbooksBody.playbooks ?? []);
    } catch (homeError) {
      setError(friendlyErrorMessage(homeError, "Could not load home base."));
    } finally {
      setIsLoading(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.replace("/login");
  }

  const pendingReminders = reminders.filter((reminder) => reminder.status === "pending");
  const enabledPlaybooks = playbooks.filter((playbook) => playbook.enabled);
  const readiness = [
    Boolean(gmailStatus.connected),
    Boolean(profile?.businessName || profile?.services),
    Boolean(profile?.voiceProfile),
    Boolean(enabledPlaybooks.length),
  ];
  const readinessScore = readiness.filter(Boolean).length;

  return (
    <main className="gibraltar-stage min-h-screen text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/55 px-4 py-4 backdrop-blur-2xl sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/home" className="flex items-center gap-3 rounded-xl focus:outline-none focus:ring-4 focus:ring-teal-300/30">
            <Image src="/brand/gibraltar-mark.svg" alt="" width={96} height={96} className="h-10 w-10 rounded-xl shadow-md shadow-blue-500/20" />
            <div>
              <p className="text-lg font-black">Gibraltar</p>
              <p className="text-sm text-slate-300">{userEmail}</p>
            </div>
          </Link>
          <div className="flex flex-wrap gap-2">
            <Link href="/home" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-4 text-sm font-black text-[#0b132b]">Home</Link>
            <DarkNavLink href="/app" label="Replies" />
            <DarkNavLink href="/analytics" label="Analytics" />
            <DarkNavLink href="/activity" label="Activity" />
            <DarkNavLink href="/memory" label="Memory" />
            <DarkNavLink href="/settings" label="Settings" />
            <button type="button" onClick={signOut} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-black text-slate-200 transition hover:border-red-300/40 hover:text-red-100">
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 pb-10 pt-8 sm:px-6 lg:px-8">
        <section className="gibraltar-panel relative min-h-[34rem] overflow-hidden rounded-3xl p-6 md:p-10">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />
          <div className="absolute left-0 top-0 h-full w-1/2 bg-[linear-gradient(112deg,rgba(255,255,255,0.08),transparent_65%)]" aria-hidden="true" />
          <div className="relative grid gap-8 lg:grid-cols-[1fr_0.88fr] lg:items-center">
            <div>
              <div className="gibraltar-kicker">
                <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                Command central / live customer ops
              </div>
              <h1 className="gibraltar-display mt-6 max-w-4xl text-5xl leading-[0.98] tracking-normal sm:text-6xl lg:text-7xl">
                Every customer thread, brought under command.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
                Gibraltar watches the inbox, drafts the next move, protects your voice, and keeps the work moving from one cinematic home base.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/app" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-black text-black shadow-lg shadow-black/30 transition hover:-translate-y-0.5">
                  Enter reply engine
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link href="/settings" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 text-sm font-black text-slate-100 transition hover:border-white/35">
                  Tune intelligence
                  <Settings className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
              <div className="mt-10 grid max-w-2xl gap-3 sm:grid-cols-3">
                <SignalLine label="Inbox state" value={gmailStatus.connected ? "Connected" : "Offline"} />
                <SignalLine label="Voice model" value={profile?.voiceProfile ? "Learned" : "Waiting"} />
                <SignalLine label="Playbooks" value={`${enabledPlaybooks.length} enabled`} />
              </div>
            </div>
            <div className="relative">
              <ObsidianCore />
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <PulseCard label="System readiness" value={`${readinessScore}/4`} detail="Core setup" />
                <PulseCard label="Handled" value={String(analytics?.summary.handled ?? 0)} detail="Last 30 days" />
                <PulseCard label="Follow-ups" value={String(pendingReminders.length)} detail="Needs attention" />
                <PulseCard label="Playbooks" value={String(enabledPlaybooks.length)} detail="Enabled" />
              </div>
            </div>
          </div>
        </section>

        {error ? <div className="mt-5 rounded-xl border border-red-300/20 bg-red-400/10 px-4 py-3 text-sm font-bold text-red-100">{error}</div> : null}

        {isLoading ? (
          <div className="mt-6 flex min-h-80 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.04]">
            <Loader2 className="h-8 w-8 animate-spin text-teal-300" aria-hidden="true" />
          </div>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
            <section className="grid gap-4">
              <ActionCard icon={Mail} title="Reply engine" body="Open the sacred inbox workspace and clear what needs a response." href="/app" cta="Go to replies" />
              <ActionCard icon={Brain} title="Memory" body="See what Gibraltar knows about your business, voice, and customer patterns." href="/memory" cta="Review memory" />
              <ActionCard icon={BookOpen} title="Playbooks" body="Add reusable response logic for pricing, bookings, complaints, and follow-ups." href="/settings" cta="Manage playbooks" />
            </section>
            <section className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 shadow-xl shadow-black/20">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-black uppercase text-teal-200">Live operations</p>
                  <h2 className="mt-1 text-2xl font-black">What needs attention</h2>
                </div>
                <Link href="/activity" className="inline-flex min-h-10 items-center justify-center rounded-xl border border-white/15 bg-white/5 px-3 text-sm font-black text-slate-100">
                  Activity
                </Link>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <StatusTile icon={CheckCircle2} title="Gmail" value={gmailStatus.connected ? gmailStatus.gmailEmail ?? "Connected" : "Not connected"} ready={Boolean(gmailStatus.connected)} />
                <StatusTile icon={Sparkles} title="Voice" value={profile?.voiceProfile ? "Learned" : "Not learned"} ready={Boolean(profile?.voiceProfile)} />
                <StatusTile icon={Zap} title="Guardrails" value={profile?.neverPromise ? "Set" : "Missing"} ready={Boolean(profile?.neverPromise)} />
              </div>
              <div className="mt-5 rounded-2xl border border-white/10 bg-[#0b1628] p-4">
                <p className="text-sm font-black uppercase text-slate-400">Next follow-ups</p>
                <div className="mt-3 grid gap-2">
                  {pendingReminders.slice(0, 4).map((reminder) => (
                    <div key={reminder.id} className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.04] px-3 py-3">
                      <p className="truncate text-sm font-bold text-slate-100">{reminder.source_subject || "(No subject)"}</p>
                      <p className="shrink-0 text-xs font-bold text-slate-400">{new Date(reminder.due_at).toLocaleDateString()}</p>
                    </div>
                  ))}
                  {!pendingReminders.length ? (
                    <p className="rounded-xl bg-white/[0.04] px-3 py-3 text-sm font-semibold text-slate-300">No pending follow-ups. The board is clear.</p>
                  ) : null}
                </div>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {(analytics?.summary.inquiryTypes ?? []).slice(0, 4).map((item) => (
                  <div key={item.category} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-sm font-black uppercase text-slate-400">{item.label}</p>
                    <p className="mt-2 text-3xl font-black">{item.count}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </section>
    </main>
  );
}

function DarkNavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="gibraltar-quiet-link inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.035] px-4 text-sm font-black transition hover:border-white/30 hover:bg-white/[0.07]">
      {label}
    </Link>
  );
}

function PulseCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/35 p-4 backdrop-blur">
      <p className="text-xs font-black uppercase text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
      <p className="mt-1 text-sm font-semibold text-slate-400">{detail}</p>
    </div>
  );
}

function ActionCard({ icon: Icon, title, body, href, cta }: { icon: typeof Mail; title: string; body: string; href: string; cta: string }) {
  return (
    <Link href={href} className="gibraltar-panel group rounded-3xl p-5 transition hover:-translate-y-0.5 hover:border-white/30">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white text-black">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-xl font-black">{title}</h2>
          <p className="mt-2 leading-7 text-slate-300">{body}</p>
          <p className="mt-4 inline-flex items-center gap-2 text-sm font-black text-teal-200">
            {cta}
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden="true" />
          </p>
        </div>
      </div>
    </Link>
  );
}

function StatusTile({ icon: Icon, title, value, ready }: { icon: typeof Activity; title: string; value: string; ready: boolean }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/35 p-4">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${ready ? "text-teal-300" : "text-slate-500"}`} aria-hidden="true" />
        <p className="text-sm font-black uppercase text-slate-400">{title}</p>
      </div>
      <p className="mt-2 truncate font-black">{value}</p>
    </div>
  );
}

function SignalLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-l border-white/20 pl-3">
      <p className="text-xs font-black uppercase text-slate-500">{label}</p>
      <p className="mt-1 truncate text-sm font-black text-slate-100">{value}</p>
    </div>
  );
}

function ObsidianCore() {
  const tiles = [
    "left-[28%] top-[4%] h-[22%] w-[28%]",
    "left-[52%] top-[11%] h-[24%] w-[28%]",
    "left-[14%] top-[31%] h-[28%] w-[30%]",
    "left-[43%] top-[39%] h-[29%] w-[31%]",
    "left-[70%] top-[41%] h-[24%] w-[22%]",
    "left-[26%] top-[65%] h-[22%] w-[25%]",
    "left-[55%] top-[69%] h-[20%] w-[28%]",
  ];

  return (
    <div className="relative mx-auto aspect-square max-w-sm">
      <div className="absolute inset-x-8 bottom-4 h-10 bg-black/70 blur-2xl" aria-hidden="true" />
      <div className="gibraltar-object absolute inset-4 rotate-[-13deg]">
        {tiles.map((tile) => (
          <div key={tile} className={`gibraltar-object-tile ${tile}`} />
        ))}
      </div>
      <div className="absolute left-1/2 top-1/2 h-px w-[72%] -translate-x-1/2 rotate-[-22deg] bg-gradient-to-r from-transparent via-white/50 to-transparent" aria-hidden="true" />
    </div>
  );
}
