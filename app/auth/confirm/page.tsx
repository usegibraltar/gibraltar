"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { getSupabaseBrowser } from "../../lib/supabase-browser";

export default function AuthConfirmPage() {
  const [message, setMessage] = useState("Finishing sign in...");
  const [error, setError] = useState("");

  useEffect(() => {
    async function confirm() {
      const supabase = getSupabaseBrowser();
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const tokenHash = url.searchParams.get("token_hash");

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          setError(exchangeError.message);
          return;
        }
      } else if (tokenHash) {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: "email",
        });

        if (verifyError) {
          setError(verifyError.message);
          return;
        }
      } else {
        const { data } = await supabase.auth.getSession();

        if (!data.session) {
          setError("The login link did not include a session code.");
          return;
        }
      }

      setMessage("You are signed in. Redirecting...");
      window.location.replace("/app");
    }

    void confirm();
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-[#0b132b]">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-200/70">
        {error ? null : (
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-teal-600" aria-hidden="true" />
        )}
        <h1 className="mt-6 text-3xl font-black">
          {error ? "Sign in did not complete" : "Signing you in"}
        </h1>
        <p className="mt-3 leading-7 text-slate-600">{error || message}</p>
        {error ? (
          <Link
            href="/login"
            className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-gradient-to-r from-teal-500 to-blue-600 px-5 font-black text-white"
          >
            Try again
          </Link>
        ) : null}
      </section>
    </main>
  );
}
