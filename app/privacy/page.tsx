import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#f8fbff] px-4 py-10 text-[#0b132b] sm:px-6 lg:px-8">
      <article className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 leading-7 shadow-xl shadow-slate-200/60 sm:p-8">
        <Link href="/" className="text-sm font-black text-teal-700">Back to Gibraltar</Link>
        <h1 className="mt-6 text-4xl font-black">Privacy Policy</h1>
        <p className="mt-4 text-slate-600">Last updated: May 6, 2026</p>
        <h2 className="mt-8 text-2xl font-black">What Gibraltar Does</h2>
        <p className="mt-3 text-slate-700">
          Gibraltar helps businesses draft, review, and optionally send customer email replies. Gmail is connected only after a user explicitly authorizes access.
        </p>
        <h2 className="mt-8 text-2xl font-black">Information Collected</h2>
        <p className="mt-3 text-slate-700">
          Gibraltar may store account email, early access status, business context, learned writing style summaries, encrypted Gmail OAuth tokens, draft/send events, analytics metadata, and selected email content needed to generate or save a reply.
        </p>
        <h2 className="mt-8 text-2xl font-black">Gmail Data</h2>
        <p className="mt-3 text-slate-700">
          Gmail message and thread content is used to show messages, generate reply drafts, create drafts, send emails when requested, and calculate reply analytics. Gibraltar does not send email unless the user selects Send now.
        </p>
        <h2 className="mt-8 text-2xl font-black">Storage and Security</h2>
        <p className="mt-3 text-slate-700">
          OAuth tokens are encrypted before storage. Users can disconnect Gmail in Settings. Disconnecting removes the saved Gmail connection from Gibraltar.
        </p>
        <h2 className="mt-8 text-2xl font-black">Contact</h2>
        <p className="mt-3 text-slate-700">
          For privacy questions, contact the Gibraltar team using the support email provided during onboarding.
        </p>
      </article>
    </main>
  );
}
