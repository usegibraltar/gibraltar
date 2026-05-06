"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Loader2, MailCheck } from "lucide-react";
import { friendlyErrorMessage } from "../lib/friendly-error";
import { getSupabaseBrowser } from "../lib/supabase-browser";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleGoogleSignIn() {
    setIsLoading(true);
    setMessage("");
    setError("");

    const supabase = getSupabaseBrowser();
    const { error: googleError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/confirm`,
        scopes: "openid email profile",
      },
    });

    if (googleError) {
      setError(friendlyErrorMessage(googleError, "Could not start Google sign-in."));
      setIsLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/auth/request-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Could not send a login email.");
      }

      setMessage("Check your inbox for your Gibraltar login link.");
    } catch (loginError) {
      setError(
        friendlyErrorMessage(loginError, "Could not send a login email."),
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#f4f8fc_100%)] px-4 py-8 text-[#0b132b]">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-lg flex-col justify-center">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm font-black text-slate-600 transition hover:text-slate-950"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Gibraltar
        </Link>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-200/70 sm:p-8">
          <div className="flex items-center gap-3">
            <Image
              src="/brand/gibraltar-mark.svg"
              alt=""
              width={96}
              height={96}
              className="h-11 w-11 rounded-xl shadow-lg shadow-blue-500/20"
            />
            <span className="text-xl font-black">Gibraltar</span>
          </div>

          <h1 className="mt-10 text-4xl font-black leading-tight">
            Sign in to early access.
          </h1>
          <p className="mt-4 leading-7 text-slate-600">
            Use the email you joined with. Only approved early-access users can
            receive a login link.
          </p>

          <form onSubmit={handleSubmit} className="mt-8">
            <label className="block">
              <span className="text-sm font-bold text-slate-700">
                Email address
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@yourbusiness.com"
                className="mt-3 min-h-14 w-full rounded-xl border border-slate-200 bg-white px-4 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-teal-300 focus:ring-4 focus:ring-teal-100"
              />
            </label>

            {error ? (
              <div className="mt-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                {error}
              </div>
            ) : null}

            {message ? (
              <div className="mt-5 rounded-xl border border-teal-100 bg-teal-50 px-4 py-3 text-sm font-bold text-teal-700">
                {message}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isLoading}
              className="mt-6 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-blue-600 px-5 text-base font-black text-white shadow-lg shadow-blue-500/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300 disabled:hover:translate-y-0"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              ) : (
                <MailCheck className="h-5 w-5" aria-hidden="true" />
              )}
              Send login link
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-black uppercase text-slate-400">
              or
            </span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-5 text-base font-black text-slate-700 shadow-sm transition hover:border-teal-200 hover:text-teal-700 disabled:cursor-not-allowed disabled:text-slate-300"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 text-sm font-black text-blue-600">
              G
            </span>
            Continue with Google
          </button>
          <p className="mt-6 text-center text-sm leading-6 text-slate-500">
            By signing in, you agree to Gibraltar&apos;s{" "}
            <Link href="/terms" className="font-black text-teal-700">Terms</Link>
            {" "}and{" "}
            <Link href="/privacy" className="font-black text-teal-700">Privacy Policy</Link>.
          </p>
        </section>
      </div>
    </main>
  );
}
