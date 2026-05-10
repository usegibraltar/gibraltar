"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Loader2, MailCheck } from "lucide-react";
import { GoogleGIcon } from "../components/google-g-icon";
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
    <main className="gibraltar-stage min-h-screen px-4 py-8 text-[#11170f]">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-lg flex-col justify-center">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm font-black text-slate-600 transition hover:text-slate-950"
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
            Sign in to Gibraltar.
          </h1>
          <p className="mt-5 leading-7 text-slate-600">
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
                className="mt-3 min-h-14 w-full rounded-xl border border-slate-200 bg-white px-4 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-green-900/30 focus:ring-4 focus:ring-green-900/10"
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
              className="mt-6 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#173c27] px-5 text-base font-black text-[#f7fbf1] shadow-lg shadow-slate-300/60 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:hover:translate-y-0"
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
            <span className="text-xs font-black uppercase text-slate-500">
              or
            </span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="google-auth-button group inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-xl border px-5 text-base font-black shadow-sm shadow-slate-200/70 transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200 transition group-hover:ring-slate-300">
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-slate-500" aria-hidden="true" />
              ) : (
                <GoogleGIcon className="h-5 w-5" />
              )}
            </span>
            Continue with Google
          </button>
          <p className="mt-6 text-center text-sm leading-6 text-slate-500">
            By signing in, you agree to Gibraltar&apos;s{" "}
            <Link href="/terms" className="font-black text-[#173c27]">Terms</Link>
            {" "}and{" "}
            <Link href="/privacy" className="font-black text-[#173c27]">Privacy Policy</Link>.
          </p>
        </section>
      </div>
    </main>
  );
}
