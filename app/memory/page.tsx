"use client";

import { useEffect, useMemo, useState } from "react";
import { Brain, CheckCircle2, Loader2 } from "lucide-react";
import { DraftAnalytics } from "../components/analytics-panel";
import { AppHeader } from "../components/app-header";
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
};

type ReplyPlaybook = {
  id: string;
  title: string;
  category: string;
  enabled: boolean;
};

export default function MemoryPage() {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [accessToken, setAccessToken] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [playbooks, setPlaybooks] = useState<ReplyPlaybook[]>([]);
  const [analytics, setAnalytics] = useState<DraftAnalytics | null>(null);
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
      await loadMemory(session.access_token);
    }

    void boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  async function loadMemory(token = accessToken) {
    if (!token) {
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const [profileResponse, playbooksResponse, analyticsResponse] = await Promise.all([
        fetch("/api/profile", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/playbooks", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/gmail/analytics", { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const profileBody = (await profileResponse.json()) as { profile?: BusinessProfile; error?: string };
      const playbooksBody = (await playbooksResponse.json()) as { playbooks?: ReplyPlaybook[]; error?: string };
      const analyticsBody = (await analyticsResponse.json()) as DraftAnalytics & { error?: string };

      if (!profileResponse.ok) {
        throw new Error(profileBody.error ?? "Could not load business memory.");
      }

      if (!playbooksResponse.ok) {
        throw new Error(playbooksBody.error ?? "Could not load reply playbooks.");
      }

      if (!analyticsResponse.ok) {
        throw new Error(analyticsBody.error ?? "Could not load analytics.");
      }

      setProfile(profileBody.profile ?? null);
      setPlaybooks(playbooksBody.playbooks ?? []);
      setAnalytics(analyticsBody);
    } catch (memoryError) {
      setError(friendlyErrorMessage(memoryError, "Could not load memory."));
    } finally {
      setIsLoading(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.replace("/login");
  }

  const readiness = [
    { label: "Business profile", done: Boolean(profile?.businessName || profile?.services) },
    { label: "Booking path", done: Boolean(profile?.bookingLink || profile?.phone) },
    { label: "Owner voice", done: Boolean(profile?.voiceProfile) },
    { label: "Guardrails", done: Boolean(profile?.neverPromise) },
    { label: "Playbooks", done: playbooks.some((playbook) => playbook.enabled) },
  ];
  const missing = readiness.filter((item) => !item.done).map((item) => item.label);

  return (
    <main className="min-h-screen bg-[#f8fbff] text-[#0b132b]">
      <AppHeader active="memory" userEmail={userEmail} onSignOut={signOut} />

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
              <Brain className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-black uppercase text-teal-600">Business memory</p>
              <h1 className="text-3xl font-black">What Gibraltar has learned</h1>
            </div>
          </div>
          <p className="mt-4 max-w-3xl leading-7 text-slate-600">
            A compact view of context, voice, playbooks, and recent customer patterns. Full email bodies are not stored here.
          </p>
        </section>

        {error ? <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div> : null}

        {isLoading ? (
          <div className="mt-6 flex min-h-80 items-center justify-center rounded-2xl border border-slate-200 bg-white">
            <Loader2 className="h-8 w-8 animate-spin text-teal-600" aria-hidden="true" />
          </div>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/60">
              <h2 className="text-2xl font-black">Readiness</h2>
              <div className="mt-4 grid gap-3">
                {readiness.map((item) => (
                  <div key={item.label} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <CheckCircle2 className={`h-5 w-5 ${item.done ? "text-teal-600" : "text-slate-300"}`} aria-hidden="true" />
                    <p className="font-black">{item.label}</p>
                  </div>
                ))}
              </div>
              {missing.length ? (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-900">
                  Add {missing.join(", ")} to make future drafts safer and more specific.
                </div>
              ) : null}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/60">
              <h2 className="text-2xl font-black">Customer patterns</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {(analytics?.summary.inquiryTypes ?? []).slice(0, 6).map((item) => (
                  <div key={item.category} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-black uppercase text-slate-500">{item.label}</p>
                    <p className="mt-2 text-3xl font-black">{item.count}</p>
                  </div>
                ))}
                {!(analytics?.summary.inquiryTypes ?? []).length ? (
                  <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">Customer patterns will appear after Gibraltar triages more messages.</p>
                ) : null}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/60 lg:col-span-2">
              <h2 className="text-2xl font-black">Enabled playbooks</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {playbooks.filter((playbook) => playbook.enabled).map((playbook) => (
                  <div key={playbook.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="font-black">{playbook.title}</p>
                    <p className="mt-2 text-sm font-semibold text-slate-500">{playbook.category}</p>
                  </div>
                ))}
                {!playbooks.some((playbook) => playbook.enabled) ? (
                  <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">No enabled playbooks yet. Add them in Settings.</p>
                ) : null}
              </div>
            </section>
          </div>
        )}
      </section>
    </main>
  );
}
