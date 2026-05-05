import { ArrowRight, CheckCircle2, MailCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "You are on the list | Gibraltar",
  description: "Thanks for joining the Gibraltar early access list.",
};

export default function ThankYouPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.14),transparent_34%),linear-gradient(180deg,#ffffff_0%,#f4f8fc_100%)] px-4 py-8 text-[#0b132b] sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl flex-col items-center justify-center text-center">
        <div className="mb-8 flex items-center gap-3">
          <Image
            src="/brand/gibraltar-mark.svg"
            alt=""
            width={96}
            height={96}
            className="h-11 w-11 rounded-xl shadow-lg shadow-blue-500/20"
          />
          <span className="text-xl font-black">Gibraltar</span>
        </div>

        <section className="w-full rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-200/70 sm:p-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-100 text-teal-700">
            <CheckCircle2 className="h-9 w-9" aria-hidden="true" />
          </div>
          <p className="mt-8 text-sm font-black uppercase tracking-wide text-teal-600">
            You are on the list
          </p>
          <h1 className="mx-auto mt-3 max-w-3xl text-4xl font-black leading-tight sm:text-6xl">
            Thanks for joining early access.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            We saved your email and will use it to follow up as Gibraltar gets
            closer to launch. The goal is simple: help local businesses answer
            customers faster and turn more messages into bookings.
          </p>

          <div className="mx-auto mt-10 grid max-w-3xl gap-4 text-left md:grid-cols-3">
            <NextStep title="Build" body="We are shaping the first real workflow for busy owners." />
            <NextStep title="Invite" body="Early users will get a first look before the public launch." />
            <NextStep title="Improve" body="Feedback will help make replies more useful for real businesses." />
          </div>

          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-blue-600 px-6 py-4 text-base font-black text-white shadow-lg shadow-blue-500/20 transition hover:-translate-y-0.5"
            >
              Back to Gibraltar
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>
            <div className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-6 py-4 text-sm font-black text-slate-600">
              <MailCheck className="h-5 w-5 text-teal-600" aria-hidden="true" />
              Watch your inbox
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function NextStep({ title, body }: { title: string; body: string }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <h2 className="text-lg font-black">{title}</h2>
      <p className="mt-2 leading-6 text-slate-600">{body}</p>
    </article>
  );
}
