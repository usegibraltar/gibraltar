"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { BarChart3, Loader2, LogOut, RefreshCw } from "lucide-react";
import { AnalyticsPanel, DraftAnalytics } from "../components/analytics-panel";
import { friendlyErrorMessage } from "../lib/friendly-error";
import { getSupabaseBrowser } from "../lib/supabase-browser";

export default function AnalyticsPage() {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [accessToken, setAccessToken] = useState("");
  const [userEmail, setUserEmail] = useState("");
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
      await loadAnalytics(session.access_token);
    }

    void boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  async function loadAnalytics(token = accessToken) {
    if (!token) {
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/gmail/analytics", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const body = (await response.json()) as DraftAnalytics & { error?: string };

      if (!response.ok) {
        throw new Error(body.error ?? "Could not load reply analytics.");
      }

      setAnalytics(body);
    } catch (analyticsError) {
      setError(friendlyErrorMessage(analyticsError, "Could not load reply analytics."));
    } finally {
      setIsLoading(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.replace("/login");
  }

  return (
    <main className="min-h-screen bg-[#f8fbff] text-[#0b132b]">
      <header className="border-b border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/home" className="flex items-center gap-3 rounded-xl focus:outline-none focus:ring-4 focus:ring-teal-100">
            <Image src="/brand/gibraltar-mark.svg" alt="" width={96} height={96} className="h-10 w-10 rounded-xl shadow-md shadow-blue-500/20" />
            <div>
              <p className="text-lg font-black">Gibraltar</p>
              <p className="text-sm text-slate-500">{userEmail}</p>
            </div>
          </Link>
          <div className="flex flex-wrap gap-2">
            <Link href="/home" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:border-teal-200 hover:text-teal-700">
              Home
            </Link>
            <Link href="/app" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:border-teal-200 hover:text-teal-700">
              Replies
            </Link>
            <Link href="/analytics" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#0b132b] px-4 text-sm font-black text-white">
              Analytics
            </Link>
            <Link href="/activity" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:border-teal-200 hover:text-teal-700">
              Activity
            </Link>
            <Link href="/memory" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:border-teal-200 hover:text-teal-700">
              Memory
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
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
                <BarChart3 className="h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-black uppercase text-teal-600">Reply analytics</p>
                <h1 className="text-3xl font-black">Draft and send performance</h1>
              </div>
            </div>
            <button
              type="button"
              onClick={() => loadAnalytics()}
              disabled={isLoading || !accessToken}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:border-teal-200 hover:text-teal-700 disabled:cursor-not-allowed disabled:text-slate-300"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-4 w-4" aria-hidden="true" />}
              Refresh analytics
            </button>
          </div>
          <p className="mt-4 max-w-3xl leading-7 text-slate-600">
            Track draft volume, send-now usage, and which reply variants lead to customer responses in the Gmail thread.
          </p>
        </section>

        {error ? (
          <div className="mt-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {error}
          </div>
        ) : null}

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/60">
          {isLoading ? (
            <div className="flex min-h-80 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-teal-600" aria-hidden="true" />
            </div>
          ) : (
            <AnalyticsPanel analytics={analytics} />
          )}
        </section>
      </section>
    </main>
  );
}
