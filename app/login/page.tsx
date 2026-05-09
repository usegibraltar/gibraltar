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
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
    const { error: googleError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${siteUrl}/auth/confirm`,
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
    <main className="gibraltar-stage min-h-screen px-4 py-8 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-lg flex-col justify-center">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm font-black text-slate-400 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Gibraltar
        </Link>

        <section className="gibraltar-panel rounded-2xl p-6 sm:p-8">
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

          <h1 className="gibraltar-display mt-10 text-5xl leading-none">
            Enter the command center.
          </h1>
          <p className="mt-5 leading-7 text-slate-300">
            Use the email you joined with. Only approved early-access users can
            receive a login link.
          </p>

          <form onSubmit={handleSubmit} className="mt-8">
            <label className="block">
              <span className="text-sm font-bold text-slate-300">
                Email address
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@yourbusiness.com"
                className="mt-3 min-h-14 w-full rounded-xl border border-white/10 bg-black/35 px-4 text-base text-white outline-none transition placeholder:text-slate-500 focus:border-white/40 focus:ring-4 focus:ring-white/10"
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
              className="mt-6 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-white px-5 text-base font-black text-black shadow-lg shadow-black/30 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-slate-500 disabled:hover:translate-y-0"
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
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-xs font-black uppercase text-slate-500">
              or
            </span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-5 text-base font-black text-slate-100 shadow-sm transition hover:border-white/35 hover:text-white disabled:cursor-not-allowed disabled:text-slate-500"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-white/20 text-sm font-black text-white">
              G
            </span>
            Continue with Google
          </button>
          <p className="mt-6 text-center text-sm leading-6 text-slate-400">
            By signing in, you agree to Gibraltar&apos;s{" "}
            <Link href="/terms" className="font-black text-white">Terms</Link>
            {" "}and{" "}
            <Link href="/privacy" className="font-black text-white">Privacy Policy</Link>.
          </p>
        </section>
      </div>
    </main>
  );
}
