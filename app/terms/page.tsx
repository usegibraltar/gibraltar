import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#f8fbff] px-4 py-10 text-[#0b132b] sm:px-6 lg:px-8">
      <article className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 leading-7 shadow-xl shadow-slate-200/60 sm:p-8">
        <Link href="/" className="text-sm font-black text-teal-700">Back to Gibraltar</Link>
        <h1 className="mt-6 text-4xl font-black">Terms of Use</h1>
        <p className="mt-4 text-slate-600">Last updated: May 6, 2026</p>
        <h2 className="mt-8 text-2xl font-black">Use of Gibraltar</h2>
        <p className="mt-3 text-slate-700">
          Gibraltar is an early access product for drafting and reviewing customer email replies. Users are responsible for reviewing all generated content before creating drafts or sending emails.
        </p>
        <h2 className="mt-8 text-2xl font-black">Email Sending</h2>
        <p className="mt-3 text-slate-700">
          Gibraltar only sends emails after a user chooses Send now and confirms the send action. Users are responsible for ensuring recipients, content, and timing are appropriate.
        </p>
        <h2 className="mt-8 text-2xl font-black">AI Drafts</h2>
        <p className="mt-3 text-slate-700">
          AI-generated replies may be incomplete or incorrect. Businesses should verify pricing, availability, policies, and commitments before sending.
        </p>
        <h2 className="mt-8 text-2xl font-black">Early Access</h2>
        <p className="mt-3 text-slate-700">
          Access may be approved, paused, or removed while the product is in early access. Features may change as Gibraltar improves.
        </p>
        <h2 className="mt-8 text-2xl font-black">Contact</h2>
        <p className="mt-3 text-slate-700">
          For terms or support questions, contact the Gibraltar team using the support email provided during onboarding.
        </p>
      </article>
    </main>
  );
}
