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
    <main className="gibraltar-stage min-h-screen text-[#11170f]">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-[#f8fbf1]/90 px-4 py-4 backdrop-blur-2xl sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/home" className="flex items-center gap-3 rounded-xl focus:outline-none focus:ring-4 focus:ring-teal-300/30">
            <Image src="/brand/gibraltar-mark.svg" alt="" width={96} height={96} className="h-10 w-10 rounded-xl shadow-md shadow-blue-500/20" />
            <div>
              <p className="text-lg font-black">Gibraltar</p>
              <p className="text-sm text-slate-500">{userEmail}</p>
            </div>
          </Link>
          <div className="flex flex-wrap gap-2">
            <Link href="/home" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#173c27] px-4 text-sm font-black text-[#f7fbf1]">Home</Link>
            <DarkNavLink href="/app" label="Replies" />
            <DarkNavLink href="/analytics" label="Analytics" />
            <DarkNavLink href="/activity" label="Activity" />
            <DarkNavLink href="/memory" label="Memory" />
            <DarkNavLink href="/settings" label="Settings" />
            <button type="button" onClick={signOut} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:border-red-200 hover:text-red-700">
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
                Command central / customer operations
              </div>
              <h1 className="gibraltar-display mt-6 max-w-4xl text-5xl leading-[0.98] tracking-normal sm:text-6xl lg:text-7xl">
                The operating layer for customer communication.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                Gibraltar reads the signal in your inbox, organizes the work, and helps every customer get the right next step.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/app" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#173c27] px-5 text-sm font-black text-[#f7fbf1] shadow-lg shadow-slate-300/60 transition hover:-translate-y-0.5">
                  Enter reply engine
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link href="/settings" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 transition hover:border-green-900/30">
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
              <TopographicCore />
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
          <div className="mt-6 flex min-h-80 items-center justify-center rounded-3xl border border-slate-200 bg-white">
            <Loader2 className="h-8 w-8 animate-spin text-teal-700" aria-hidden="true" />
          </div>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
            <section className="grid gap-4">
              <ActionCard icon={Mail} title="Reply engine" body="Open the sacred inbox workspace and clear what needs a response." href="/app" cta="Go to replies" />
              <ActionCard icon={Brain} title="Memory" body="See what Gibraltar knows about your business, voice, and customer patterns." href="/memory" cta="Review memory" />
              <ActionCard icon={BookOpen} title="Playbooks" body="Add reusable response logic for pricing, bookings, complaints, and follow-ups." href="/settings" cta="Manage playbooks" />
            </section>
            <section className="gibraltar-panel rounded-3xl p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-black uppercase text-teal-700">Live operations</p>
                  <h2 className="mt-1 text-2xl font-black">What needs attention</h2>
                </div>
                <Link href="/activity" className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700">
                  Activity
                </Link>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <StatusTile icon={CheckCircle2} title="Gmail" value={gmailStatus.connected ? gmailStatus.gmailEmail ?? "Connected" : "Not connected"} ready={Boolean(gmailStatus.connected)} />
                <StatusTile icon={Sparkles} title="Voice" value={profile?.voiceProfile ? "Learned" : "Not learned"} ready={Boolean(profile?.voiceProfile)} />
                <StatusTile icon={Zap} title="Guardrails" value={profile?.neverPromise ? "Set" : "Missing"} ready={Boolean(profile?.neverPromise)} />
              </div>
              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-black uppercase text-slate-400">Next follow-ups</p>
                <div className="mt-3 grid gap-2">
                  {pendingReminders.slice(0, 4).map((reminder) => (
                    <div key={reminder.id} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-3">
                      <p className="truncate text-sm font-bold text-slate-700">{reminder.source_subject || "(No subject)"}</p>
                      <p className="shrink-0 text-xs font-bold text-slate-400">{new Date(reminder.due_at).toLocaleDateString()}</p>
                    </div>
                  ))}
                  {!pendingReminders.length ? (
                    <p className="rounded-xl bg-white px-3 py-3 text-sm font-semibold text-slate-600">No pending follow-ups. The board is clear.</p>
                  ) : null}
                </div>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {(analytics?.summary.inquiryTypes ?? []).slice(0, 4).map((item) => (
                  <div key={item.category} className="rounded-2xl border border-slate-200 bg-white p-4">
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
    <Link href={href} className="gibraltar-quiet-link inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-black transition hover:border-green-900/30">
      {label}
    </Link>
  );
}

function PulseCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 backdrop-blur">
      <p className="text-xs font-black uppercase text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
      <p className="mt-1 text-sm font-semibold text-slate-400">{detail}</p>
    </div>
  );
}

function ActionCard({ icon: Icon, title, body, href, cta }: { icon: typeof Mail; title: string; body: string; href: string; cta: string }) {
  return (
    <Link href={href} className="gibraltar-panel group rounded-3xl p-5 transition hover:-translate-y-0.5 hover:border-green-900/30">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-[#173c27] text-[#f7fbf1]">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-xl font-black">{title}</h2>
          <p className="mt-2 leading-7 text-slate-600">{body}</p>
          <p className="mt-4 inline-flex items-center gap-2 text-sm font-black text-teal-700">
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
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${ready ? "text-teal-700" : "text-slate-500"}`} aria-hidden="true" />
        <p className="text-sm font-black uppercase text-slate-400">{title}</p>
      </div>
      <p className="mt-2 truncate font-black">{value}</p>
    </div>
  );
}

function SignalLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-l border-slate-300 pl-3">
      <p className="text-xs font-black uppercase text-slate-500">{label}</p>
      <p className="mt-1 truncate text-sm font-black text-slate-800">{value}</p>
    </div>
  );
}

function TopographicCore() {
  return (
    <div className="relative mx-auto aspect-square max-w-sm">
      <div className="absolute inset-4 rounded-3xl border border-slate-200 bg-[#eef6e8]/70 gibraltar-ledger" aria-hidden="true" />
      <svg className="gibraltar-object relative z-10 h-full w-full" viewBox="0 0 360 360" role="img" aria-label="Gibraltar intelligence map">
        <path d="M103 246L171 64L270 232C240 246 213 246 189 232C164 217 135 222 103 246Z" fill="#dfead5" stroke="currentColor" strokeWidth="2.5" />
        <path className="gibraltar-object-line" d="M128 223C146 207 167 204 192 214C211 222 230 220 249 207" />
        <path className="gibraltar-object-line" d="M136 199C154 185 174 183 195 193C213 202 231 200 245 188" />
        <path className="gibraltar-object-line" d="M145 174C161 163 179 162 198 172C214 181 229 178 240 168" />
        <path className="gibraltar-object-line" d="M155 148C169 139 184 140 199 149C212 157 224 155 235 146" />
        <path className="gibraltar-object-line" d="M164 122C176 116 188 118 201 126C212 133 223 133 232 126" />
        <path className="gibraltar-object-line" d="M174 96C184 92 194 94 204 101C213 107 222 108 229 103" />
        <path d="M102 263C135 249 166 250 196 264C222 276 248 275 274 263" fill="none" stroke="#275d38" strokeWidth="7" strokeLinecap="round" />
      </svg>
      <div className="absolute right-2 top-24 z-20 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xl shadow-slate-300/40">
        <p className="text-xs font-black uppercase text-slate-500">Action</p>
        <p className="mt-1 text-sm font-black text-slate-900">Reply now</p>
      </div>
      <div className="absolute bottom-12 left-3 z-20 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xl shadow-slate-300/40">
        <p className="text-xs font-black uppercase text-slate-500">Signal</p>
        <p className="mt-1 text-sm font-black text-slate-900">Booking</p>
      </div>
    </div>
  );
}
