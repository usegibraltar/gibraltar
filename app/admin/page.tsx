"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  CircleAlert,
  Loader2,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { AppHeader } from "../components/app-header";
import { getSupabaseBrowser } from "../lib/supabase-browser";

type Signup = {
  id: string;
  email: string;
  source: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  approved_at: string | null;
  approved_by: string | null;
  rejected_at: string | null;
};

type SystemCheck = {
  name: string;
  ok: boolean;
  detail: string;
  group?: "environment" | "database" | "oauth" | "security";
};

export default function AdminPage() {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [accessToken, setAccessToken] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [signups, setSignups] = useState<Signup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [checks, setChecks] = useState<SystemCheck[]>([]);
  const failedChecks = checks.filter((check) => !check.ok);
  const pendingSignups = signups.filter((signup) => signup.status === "pending").length;
  const failedGroups = failedChecks.reduce<Record<string, number>>((groups, check) => {
    const group = check.group ?? "system";
    groups[group] = (groups[group] ?? 0) + 1;
    return groups;
  }, {});

  async function loadSignups(token = accessToken) {
    if (!token) {
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/early-access", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const payload = (await response.json()) as {
        signups?: Signup[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Could not load signups.");
      }

      setSignups(payload.signups ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Could not load signups.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function loadSystemChecks(token = accessToken) {
    if (!token) {
      return;
    }

    const response = await fetch("/api/admin/system", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const payload = (await response.json()) as {
      checks?: SystemCheck[];
      error?: string;
    };

    if (response.ok) {
      setChecks(payload.checks ?? []);
    }
  }

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
      await loadSignups(session.access_token);
      await loadSystemChecks(session.access_token);
    }

    void boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  async function updateSignup(id: string, action: "approve" | "reject") {
    setBusyId(id);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/admin/early-access/${id}/${action}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const payload = (await response.json()) as { error?: string; notificationSent?: boolean };

      if (!response.ok) {
        throw new Error(payload.error ?? `Could not ${action} signup.`);
      }

      await loadSignups();
      if (action === "approve") {
        setSuccess(
          payload.notificationSent
            ? "Signup approved and a login email was sent."
            : "Signup approved. The login email could not be sent automatically, so follow up manually.",
        );
      } else {
        setSuccess("Signup rejected.");
      }
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : `Could not ${action} signup.`,
      );
    } finally {
      setBusyId("");
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.replace("/login");
  }

  return (
    <main className="min-h-screen bg-[#f8fbff] text-[#0b132b]">
      <AppHeader active="admin" userEmail={userEmail} onSignOut={signOut} />

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/60">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
                <ShieldCheck className="h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <h1 className="text-3xl font-black">Early access approvals</h1>
                <p className="mt-1 max-w-2xl leading-7 text-slate-600">
                  Approve signup emails when you are ready to let them into the Gmail draft workflow.
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-teal-100 bg-teal-50 px-4 py-3 text-teal-900">
              <p className="text-xs font-black uppercase">Pending</p>
              <p className="text-3xl font-black">{pendingSignups}</p>
            </div>
          </div>
        </header>

        {error ? (
          <div className="mt-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="mt-6 rounded-xl border border-teal-100 bg-teal-50 px-4 py-3 text-sm font-bold text-teal-700">
            {success}
          </div>
        ) : null}

        <section className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm shadow-slate-200/60">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <CircleAlert className={`h-4 w-4 ${failedChecks.length ? "text-amber-700" : "text-teal-700"}`} aria-hidden="true" />
                <p className="text-sm font-black uppercase text-slate-600">System status</p>
              </div>
              <span className={`rounded-full px-2 py-1 text-xs font-black uppercase ${failedChecks.length ? "bg-amber-100 text-amber-800" : "bg-teal-100 text-teal-800"}`}>
                {failedChecks.length ? `${failedChecks.length} fix` : "Ready"}
              </span>
              <span className="text-sm font-semibold text-slate-500">{checks.length || 0} checks</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(failedGroups).map(([group, count]) => (
                <span key={group} className="rounded-full bg-red-50 px-2 py-1 text-xs font-black uppercase text-red-700">
                  {group}: {count}
                </span>
              ))}
              {!checks.length ? <span className="text-sm font-semibold text-slate-500">Loading checks</span> : null}
            </div>
          </div>
          {failedChecks.length ? (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {failedChecks.map((check) => (
                <div key={check.name} className="min-w-64 rounded-lg border border-red-100 bg-red-50 px-3 py-2">
                  <p className="truncate text-sm font-black text-red-800">{check.name}</p>
                  <p className="mt-1 truncate text-xs font-semibold text-red-700">{check.detail}</p>
                </div>
              ))}
            </div>
          ) : null}
        </section>

        <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
          {isLoading ? (
            <div className="flex min-h-80 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-teal-600" aria-hidden="true" />
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {signups.map((signup) => (
                <article key={signup.id} className="p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="text-lg font-black">{signup.email}</p>
                        <StatusBadge status={signup.status} />
                      </div>
                      <p className="mt-2 text-sm text-slate-500">
                        Joined {new Date(signup.created_at).toLocaleString()} from{" "}
                        {signup.source}
                      </p>
                      {signup.approved_by ? (
                        <p className="mt-1 text-sm text-slate-500">
                          Approved by {signup.approved_by}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => updateSignup(signup.id, "approve")}
                        disabled={busyId === signup.id || signup.status === "approved"}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 text-sm font-black text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:hover:translate-y-0"
                      >
                        {busyId === signup.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                        )}
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => updateSignup(signup.id, "reject")}
                        disabled={busyId === signup.id || signup.status === "rejected"}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 text-sm font-black text-red-700 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-300 disabled:hover:translate-y-0"
                      >
                        <XCircle className="h-4 w-4" aria-hidden="true" />
                        Reject
                      </button>
                    </div>
                  </div>
                </article>
              ))}
              {!signups.length ? (
                <div className="p-10 text-center text-slate-600">
                  No early access signups yet.
                </div>
              ) : null}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function StatusBadge({ status }: { status: Signup["status"] }) {
  const classes = {
    pending: "bg-amber-100 text-amber-800",
    approved: "bg-teal-100 text-teal-800",
    rejected: "bg-red-100 text-red-800",
  };

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${classes[status]}`}>
      {status}
    </span>
  );
}
