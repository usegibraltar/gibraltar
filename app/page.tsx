"use client";

import {
  ArrowRight,
  BadgeDollarSign,
  BriefcaseBusiness,
  CheckCircle2,
  Clipboard,
  Clock3,
  Dumbbell,
  Handshake,
  Leaf,
  Loader2,
  Mail,
  MailCheck,
  MapPin,
  MessageCircle,
  MessageSquare,
  Scissors,
  ShoppingBag,
  Sparkles,
  Target,
  TrendingUp,
  Utensils,
  Wrench,
  Zap,
} from "lucide-react";
import { FormEvent, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

const businessTypes = [
  "Restaurant",
  "Barber / Salon",
  "Fitness / Trainer",
  "Home Service",
  "Retail Shop",
  "Other",
] as const;

const tones = ["Friendly", "Professional", "Confident", "Casual"] as const;

const sampleMessages = [
  "Do you have any openings this weekend?",
  "How much would it cost for a group of 10?",
  "Can I come in today?",
  "Do you offer discounts?",
  "I'm interested but still comparing options.",
];

const problems = [
  { icon: Clock3, text: "Customers wait and book somewhere else", color: "from-red-500 to-orange-500" },
  { icon: MessageSquare, text: "Quick replies come out too short or unclear", color: "from-orange-500 to-amber-500" },
  { icon: Target, text: "Interested people never get a simple next step", color: "from-amber-500 to-yellow-500" },
  { icon: BriefcaseBusiness, text: "You are busy serving customers, not writing messages", color: "from-lime-500 to-emerald-500" },
];

const solutions = [
  { icon: Zap, text: "Answer while they are still interested", color: "from-teal-500 to-cyan-500" },
  { icon: CheckCircle2, text: "Send a reply that sounds calm and professional", color: "from-sky-500 to-blue-600" },
  { icon: Target, text: "Ask for the booking, quote, visit, or sale", color: "from-blue-500 to-violet-600" },
];

const features = [
  {
    icon: Zap,
    title: "Book more appointments",
    body: "Turn availability questions into clear replies that help customers choose a time.",
    color: "from-teal-500 to-cyan-500",
  },
  {
    icon: BadgeDollarSign,
    title: "Answer pricing questions",
    body: "Respond without sounding unsure, defensive, or like you are just naming a number.",
    color: "from-blue-500 to-indigo-500",
  },
  {
    icon: MessageCircle,
    title: "Follow up without feeling pushy",
    body: "Get a gentle message to send when someone goes quiet after showing interest.",
    color: "from-violet-500 to-fuchsia-500",
  },
  {
    icon: CheckCircle2,
    title: "Sound professional every time",
    body: "Send replies that are friendly, clear, and helpful even during your busiest hours.",
    color: "from-orange-500 to-red-500",
  },
  {
    icon: Clock3,
    title: "Save time during busy hours",
    body: "Stop rewriting the same replies between appointments, orders, calls, or jobs.",
    color: "from-emerald-500 to-teal-500",
  },
  {
    icon: Mail,
    title: "Use it anywhere you get messages",
    body: "Texts, emails, DMs, and contact forms all work. Paste the message and send the reply.",
    color: "from-cyan-500 to-blue-500",
  },
];

const examples = [
  {
    icon: Utensils,
    label: "Restaurant",
    customer: "Do you have any tables available for 6 people tomorrow night around 7pm?",
    reply:
      "Yes, we'd love to have you. I can reserve a table for 6 tomorrow at 7pm. Would you prefer indoor seating or our patio?",
    why: "Moves the conversation toward a reservation instead of leaving the customer to ask again.",
  },
  {
    icon: Scissors,
    label: "Salon",
    customer: "Do you have any haircut openings this weekend?",
    reply:
      "Yes, we have a few openings this weekend. I can check the best times for you now. Are you looking for Saturday or Sunday?",
    why: "Turns a casual question into an appointment request with one easy choice.",
  },
  {
    icon: Dumbbell,
    label: "Fitness",
    customer: "How much is personal training?",
    reply:
      "Training starts with a quick consultation so we can match the right plan to your goals. Want me to send over available times this week?",
    why: "Keeps the pricing conversation helpful and points the customer toward a consultation.",
  },
  {
    icon: Wrench,
    label: "Home Service",
    customer: "Can someone come fix a leaking sink today?",
    reply:
      "We may be able to help today. Send your address and a quick photo of the leak, and I'll check the soonest available appointment.",
    why: "Gets the details needed to turn the message into a real service call.",
  },
  {
    icon: ShoppingBag,
    label: "Retail",
    customer: "Do you still have this in stock?",
    reply:
      "I can check that for you. Which size or color are you looking for? If we have it, I can set it aside today.",
    why: "Makes the next step feel easy and creates a path to an in-store or same-day purchase.",
  },
];

const inboxSteps = [
  {
    title: "Connect your inbox",
    body: "Bring in customer emails from Gmail or Outlook when inbox support launches.",
  },
  {
    title: "Spot messages that need a reply",
    body: "Pricing questions, booking requests, quote asks, and follow-ups rise to the top.",
  },
  {
    title: "Draft a better response",
    body: "Gibraltar helps write a clear reply you can review, copy, or send.",
  },
];

type GenerateReplyResponse = {
  recommendedReply: string;
  whyThisWorks: string;
  followUpMessage: string;
  upsellSuggestion: string;
};

export default function Home() {
  const router = useRouter();
  const toolRef = useRef<HTMLDivElement>(null);
  const [customerMessage, setCustomerMessage] = useState("");
  const [businessType, setBusinessType] = useState<(typeof businessTypes)[number]>(
    "Restaurant",
  );
  const [tone, setTone] = useState<(typeof tones)[number]>("Friendly");
  const [activeExample, setActiveExample] = useState(0);
  const [result, setResult] = useState<GenerateReplyResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [earlyAccessEmail, setEarlyAccessEmail] = useState("");
  const [joinedEarlyAccess, setJoinedEarlyAccess] = useState(false);
  const [earlyAccessError, setEarlyAccessError] = useState("");
  const [isJoiningEarlyAccess, setIsJoiningEarlyAccess] = useState(false);

  const canGenerate = useMemo(
    () => customerMessage.trim().length > 0 && !isLoading,
    [customerMessage, isLoading],
  );

  function focusTool() {
    toolRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function handleGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!customerMessage.trim()) {
      return;
    }

    setIsLoading(true);
    setError("");
    setCopied(false);

    try {
      const response = await fetch("/api/generate-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerMessage, businessType, tone }),
      });

      const payload = (await response.json()) as
        | GenerateReplyResponse
        | { error?: string };

      if (!response.ok) {
        throw new Error(
          "error" in payload && payload.error
            ? payload.error
            : "Something went wrong. Please try again.",
        );
      }

      setResult(payload as GenerateReplyResponse);
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function copyReply() {
    if (!result?.recommendedReply) {
      return;
    }

    await navigator.clipboard.writeText(result.recommendedReply);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  const selectedExample = examples[activeExample];
  const SelectedIcon = selectedExample.icon;

  return (
    <main
      id="top"
      className="relative min-h-screen scroll-mt-32 overflow-x-hidden bg-white text-[#0b132b]"
    >
      <Header onTry={focusTool} />
      <BusinessFlair />

      <section className="relative z-10 px-4 pb-20 pt-32 sm:px-6 lg:px-20 lg:pt-36 xl:px-24">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[0.95fr_1fr]">
          <div>
            <h1 className="max-w-3xl text-4xl font-black leading-[1.12] sm:text-6xl lg:text-7xl">
              Stop losing customers because you{" "}
              <span className="bg-gradient-to-r from-teal-500 to-blue-600 bg-clip-text text-transparent">
                did not reply fast enough.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-xl leading-8 text-slate-600">
              Paste any customer text, DM, or email and get a ready-to-send reply
              that helps book the appointment, table, job, or sale.
            </p>
            <button
              type="button"
              onClick={focusTool}
              className="mt-8 inline-flex items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-teal-500 to-blue-600 px-8 py-4 text-base font-black text-white shadow-lg shadow-blue-500/20 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-500/25"
            >
              Write my reply
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </button>
            <p className="mt-8 text-base text-slate-500">
              No login. No setup. Just paste a message.
            </p>
            <div className="mt-8 grid max-w-xl gap-3 sm:grid-cols-3">
              <TrustPill icon={Clock3} text="Ready in seconds" />
              <TrustPill icon={MapPin} text="Made for local shops" />
              <TrustPill icon={CheckCircle2} text="Human-sounding replies" />
            </div>
          </div>

          <HeroPreview />
        </div>
      </section>

      <section className="relative z-10 px-4 pb-20 sm:px-6 lg:px-20 xl:px-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 text-center">
            <p className="text-sm font-bold uppercase text-teal-600">
              Before and after
            </p>
            <h2 className="mt-3 text-4xl font-black sm:text-5xl">
              Same message. Better chance of getting booked.
            </h2>
          </div>
          <div className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/70 lg:grid-cols-2">
            <article className="border-b border-slate-200 bg-slate-50 p-8 lg:border-b-0 lg:border-r">
              <p className="text-sm font-black uppercase text-red-500">
                Before
              </p>
              <div className="mt-5 rounded-xl bg-white p-6 text-lg leading-8 text-slate-700">
                Yeah we might have spots. What day?
              </div>
              <p className="mt-4 text-slate-500">
                Fast, but vague. The customer still has to do the work.
              </p>
            </article>
            <article className="bg-cyan-50 p-8">
              <p className="text-sm font-black uppercase text-teal-600">After</p>
              <div className="mt-5 rounded-xl border border-teal-200 bg-white p-6 text-lg leading-8 text-slate-800">
                Yes, we have a few openings this weekend. I can check the best
                time for you now. Are you looking for Saturday or Sunday?
              </div>
              <p className="mt-4 text-slate-600">
                Clear, friendly, and pointed toward a booking.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section
        id="how-it-works"
        ref={toolRef}
        className="relative z-10 scroll-mt-28 bg-gradient-to-br from-[#112536] to-[#101a30] px-4 py-20 sm:px-6 lg:px-20 xl:px-24"
      >
        <div className="mx-auto max-w-5xl overflow-hidden rounded-[1.6rem] bg-slate-50 shadow-2xl shadow-slate-950/30">
          <div className="px-6 py-10 text-center sm:px-10">
            <h2 className="text-4xl font-black sm:text-5xl">
              Got a customer message? Turn it into a better reply.
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Use it for pricing questions, appointment requests, availability,
              quotes, discounts, and follow-ups.
            </p>
          </div>

          <form onSubmit={handleGenerate} className="px-6 pb-10 sm:px-12">
            <label className="block">
              <span className="text-sm font-bold text-slate-700">
                Customer message
              </span>
              <textarea
                value={customerMessage}
                onChange={(event) => setCustomerMessage(event.target.value)}
                rows={5}
                placeholder="Hi, how much would it cost to book a birthday dinner for 8 people this Friday?"
                className="mt-3 w-full resize-none rounded-xl border border-slate-200 bg-white px-5 py-4 text-base leading-7 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-teal-300 focus:ring-4 focus:ring-teal-100"
              />
            </label>

            <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr]">
              <label className="block">
                <span className="text-sm font-bold text-slate-700">
                  Business type
                </span>
                <select
                  value={businessType}
                  onChange={(event) =>
                    setBusinessType(
                      event.target.value as (typeof businessTypes)[number],
                    )
                  }
                  className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-5 py-4 text-base text-slate-800 outline-none transition focus:border-teal-300 focus:ring-4 focus:ring-teal-100"
                >
                  {businessTypes.map((type) => (
                    <option key={type}>{type}</option>
                  ))}
                </select>
              </label>

              <div>
                <p className="text-sm font-bold text-slate-700">Tone</p>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {tones.map((toneOption) => (
                    <button
                      key={toneOption}
                      type="button"
                      onClick={() => setTone(toneOption)}
                      className={`flex min-h-14 items-center justify-center rounded-xl border px-4 py-4 text-center text-sm font-black transition ${
                        tone === toneOption
                          ? "border-teal-500 bg-teal-500 text-white shadow-lg shadow-teal-500/20"
                          : "border-slate-200 bg-white text-slate-700 hover:border-teal-200"
                      }`}
                    >
                      {toneOption}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {error ? (
              <div className="mt-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={!canGenerate}
              className="mt-8 inline-flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-teal-400 to-blue-500 px-6 py-5 text-base font-black text-white shadow-lg shadow-blue-500/20 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none disabled:hover:translate-y-0"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                  Generating reply...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" aria-hidden="true" />
                  Write My Reply
                </>
              )}
            </button>
          </form>

          <div className="border-t border-slate-200 bg-slate-100/60 px-6 py-7 sm:px-12">
            <p className="text-sm text-slate-600">Try a sample:</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {sampleMessages.map((message) => (
                <button
                  key={message}
                  type="button"
                  onClick={() => setCustomerMessage(message)}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-teal-200 hover:text-teal-700"
                >
                  {message}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {result ? (
        <section className="relative z-10 px-4 py-20 sm:px-6 lg:px-20 xl:px-24">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm font-bold uppercase text-teal-600">
                  Generated response
                </p>
                <h2 className="mt-2 text-4xl font-black">Ready to send</h2>
              </div>
              <button
                type="button"
                onClick={copyReply}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:border-teal-200 hover:text-teal-700"
              >
                <Clipboard className="h-4 w-4" aria-hidden="true" />
                {copied ? "Copied" : "Copy reply"}
              </button>
            </div>
            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <article className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/60">
                <h3 className="text-xl font-black">Recommended Reply</h3>
                <p className="mt-4 whitespace-pre-line text-lg leading-8 text-slate-700">
                  {result.recommendedReply}
                </p>
              </article>
              <div className="grid gap-4">
                <OutputCard title="Why this works" body={result.whyThisWorks} />
                <OutputCard
                  title="Follow-up if they don't respond"
                  body={result.followUpMessage}
                />
                <OutputCard
                  title="Possible upsell"
                  body={result.upsellSuggestion}
                />
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="relative z-10 px-4 py-20 sm:px-6 lg:px-20 xl:px-24">
        <div className="mx-auto max-w-7xl text-center">
          <div className="mx-auto mb-10 grid max-w-4xl gap-4 text-left md:grid-cols-3">
            <MarketProof value="5" label="business types supported" />
            <MarketProof value="24/7" label="reply help when leads arrive" />
            <MarketProof value="0" label="software setup required" />
          </div>
          <h2 className="text-4xl font-black sm:text-5xl">
            Customers move on when replies are slow or unclear
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-xl leading-8 text-slate-600">
            Gibraltar helps you answer while the customer is still interested,
            with a reply that makes the next step obvious.
          </p>

          <div className="mt-14 grid gap-12 text-left lg:grid-cols-2">
            <div>
              <p className="mb-6 text-sm font-bold uppercase text-slate-500">
                The problem
              </p>
              <div className="space-y-4">
                {problems.map((item) => (
                  <ListCard key={item.text} {...item} />
                ))}
              </div>
            </div>
            <div>
              <p className="mb-6 text-sm font-bold uppercase text-teal-600">
                The solution
              </p>
              <div className="space-y-4">
                {solutions.map((item) => (
                  <ListCard key={item.text} {...item} highlight />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="features"
        className="relative z-10 scroll-mt-28 bg-slate-50 px-4 py-20 sm:px-6 lg:px-20 xl:px-24"
      >
        <div className="mx-auto max-w-7xl text-center">
          <h2 className="text-4xl font-black sm:text-5xl">
            Built for real business owners with real messages to answer
          </h2>
          <p className="mt-5 text-xl text-slate-600">
            Less typing, fewer missed chances, and more conversations that turn
            into revenue.
          </p>
          <div className="mt-14 grid gap-6 text-left md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <article
                key={feature.title}
                className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/70"
              >
                <IconBox icon={feature.icon} color={feature.color} />
                <h3 className="mt-6 text-xl font-black">{feature.title}</h3>
                <p className="mt-4 leading-7 text-slate-600">{feature.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="inbox-preview" className="relative z-10 scroll-mt-28 px-4 py-20 sm:px-6 lg:px-20 xl:px-24">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-sm font-black uppercase text-teal-600">
              Email integration preview
            </p>
            <h2 className="mt-3 text-4xl font-black leading-tight sm:text-5xl">
              Soon, Gibraltar can help right where customers already message you.
            </h2>
            <p className="mt-5 text-xl leading-8 text-slate-600">
              Pasting a message is the fastest MVP. The bigger vision is even
              simpler: connect Gmail or Outlook, find customer inquiries, and get
              a ready-to-review reply without digging through your inbox.
            </p>
            <div className="mt-8 space-y-4">
              {inboxSteps.map((step, index) => (
                <div key={step.title} className="flex gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-blue-600 text-sm font-black text-white">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="text-lg font-black">{step.title}</h3>
                    <p className="mt-1 leading-7 text-slate-600">{step.body}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-teal-200 bg-cyan-50 px-4 py-2 text-sm font-black text-teal-700">
              <MailCheck className="h-4 w-4" aria-hidden="true" />
              Coming soon: Gmail and Outlook
            </div>
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
              Today, Gibraltar works by pasting a message into the tool. The
              planned inbox version would connect email, find customer messages,
              and prepare drafts for you to review.
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/70">
            <div className="border-b border-slate-200 bg-slate-50 px-6 py-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-black uppercase text-slate-500">
                    Customer inbox
                  </p>
                  <h3 className="mt-1 text-2xl font-black">Messages that need action</h3>
                </div>
                <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-black text-orange-700">
                  Preview
                </span>
              </div>
            </div>
            <div className="grid lg:grid-cols-[0.85fr_1.15fr]">
              <div className="border-b border-slate-200 bg-white lg:border-b-0 lg:border-r">
                <InboxRow
                  active
                  name="Maya R."
                  subject="Birthday dinner for 8"
                  meta="Needs reply"
                />
                <InboxRow
                  name="Chris L."
                  subject="Do you have openings today?"
                  meta="New inquiry"
                />
                <InboxRow
                  name="Angela P."
                  subject="Still comparing prices"
                  meta="Follow up"
                />
              </div>
              <div className="bg-cyan-50 p-6">
                <p className="text-sm font-black uppercase text-teal-600">
                  Suggested reply
                </p>
                <div className="mt-4 rounded-xl border border-teal-200 bg-white p-5 text-base leading-7 text-slate-700">
                  Absolutely, we would love to host you. I can check the best
                  seating options for 8 people this Friday. What time were you
                  hoping to come in?
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    className="rounded-xl bg-gradient-to-r from-teal-500 to-blue-600 px-4 py-3 text-sm font-black text-white"
                  >
                    Copy draft
                  </button>
                  <button
                    type="button"
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700"
                  >
                    Open in inbox
                  </button>
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-500">
                  This is a product preview. Today, the live MVP starts with
                  paste-and-generate.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="examples" className="relative z-10 scroll-mt-28 px-4 py-20 sm:px-6 lg:px-20 xl:px-24">
        <div className="mx-auto max-w-6xl text-center">
          <h2 className="text-4xl font-black sm:text-5xl">
            Real messages business owners get every day
          </h2>
          <p className="mt-5 text-xl text-slate-600">
            See how a short reply can move someone toward a reservation,
            appointment, quote, consultation, or purchase.
          </p>
          <div className="mt-12 flex flex-wrap justify-center gap-3">
            {examples.map((example, index) => {
              const ExampleIcon = example.icon;

              return (
                <button
                  key={example.label}
                  type="button"
                  onClick={() => setActiveExample(index)}
                  className={`inline-flex items-center gap-3 rounded-xl px-5 py-3 text-base font-black transition ${
                    activeExample === index
                      ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/20"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <ExampleIcon className="h-5 w-5" aria-hidden="true" />
                  {example.label}
                </button>
              );
            })}
          </div>

          <div className="mt-10 overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-xl shadow-slate-200/70">
            <div className="grid lg:grid-cols-2">
              <div className="border-b border-slate-200 p-8 lg:border-b-0 lg:border-r">
                <p className="text-sm font-bold uppercase text-slate-500">
                  Customer message
                </p>
                <div className="mt-4 rounded-xl bg-slate-100 p-6 text-lg leading-8">
                  {`"${selectedExample.customer}"`}
                </div>
              </div>
              <div className="p-8">
                <p className="text-sm font-bold uppercase text-teal-600">
                  Gibraltar reply
                </p>
                <div className="mt-4 rounded-xl border border-teal-200 bg-cyan-50 p-6 text-lg leading-8">
                  {`"${selectedExample.reply}"`}
                </div>
              </div>
            </div>
            <div className="border-t border-teal-100 bg-cyan-50 px-8 py-6">
              <p className="leading-7 text-slate-700">
                <span className="font-black">Why it works:</span>{" "}
                {selectedExample.why}
              </p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-black text-slate-700">
                <SelectedIcon className="h-4 w-4 text-teal-600" aria-hidden="true" />
                {selectedExample.label} example
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 bg-gradient-to-br from-[#101a30] to-[#18334a] px-4 py-24 text-white sm:px-6 lg:px-20 xl:px-24">
        <div className="mx-auto max-w-4xl text-center">
          <EarlyAccessForm
            email={earlyAccessEmail}
            joined={joinedEarlyAccess}
            error={earlyAccessError}
            isLoading={isJoiningEarlyAccess}
            onEmailChange={setEarlyAccessEmail}
            onJoin={async (email) => {
              setEarlyAccessError("");
              setIsJoiningEarlyAccess(true);

              try {
                const response = await fetch("/api/early-access", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ email }),
                });

                const payload = (await response.json()) as { error?: string };

                if (!response.ok) {
                  throw new Error(
                    payload.error ?? "We could not save that email just now.",
                  );
                }

                setJoinedEarlyAccess(true);
                router.push("/thank-you");
              } catch (signupError) {
                setEarlyAccessError(
                  signupError instanceof Error
                    ? signupError.message
                    : "We could not save that email just now.",
                );
              } finally {
                setIsJoiningEarlyAccess(false);
              }
            }}
          />
          <h2 className="text-5xl font-black leading-tight sm:text-6xl">
            Stop letting warm leads go cold
          </h2>
          <p className="mx-auto mt-8 max-w-2xl text-xl leading-9 text-slate-200">
            Gibraltar helps you answer faster, sound sharper, and give every
            customer a clear next step.
          </p>
          <button
            type="button"
            onClick={focusTool}
            className="mt-10 inline-flex items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-teal-500 to-blue-600 px-10 py-5 text-lg font-black text-white shadow-lg shadow-blue-950/20 transition hover:-translate-y-0.5"
            >
            Write my reply
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </button>
          <p className="mt-8 text-slate-300">No login required. See results in seconds.</p>
        </div>
      </section>

      <footer className="relative z-10 bg-[#0d1729] px-4 py-12 text-white sm:px-6 lg:px-20 xl:px-24">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <Logo light />
          <p className="text-sm text-slate-300">
            (c) 2026 Gibraltar. Clear replies. Solid follow-through.
          </p>
        </div>
      </footer>
    </main>
  );
}

function Header({ onTry }: { onTry: () => void }) {
  return (
    <header className="fixed left-0 right-0 top-4 z-50 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl items-center justify-between rounded-xl border border-slate-200 bg-white/92 px-6 py-4 shadow-lg shadow-slate-200/60 backdrop-blur-xl">
        <a
          href="#top"
          aria-label="Back to top"
          className="rounded-lg focus:outline-none focus:ring-4 focus:ring-teal-100"
        >
          <Logo />
        </a>
        <nav className="hidden items-center gap-8 text-base text-slate-600 md:flex">
          <a href="#how-it-works" className="transition hover:text-slate-950">
            How it works
          </a>
          <a href="#examples" className="transition hover:text-slate-950">
            Examples
          </a>
          <a href="#inbox-preview" className="transition hover:text-slate-950">
            Inbox preview
          </a>
          <a href="#features" className="transition hover:text-slate-950">
            For local businesses
          </a>
        </nav>
        <button
          type="button"
          onClick={onTry}
          className="rounded-xl bg-gradient-to-r from-teal-500 to-blue-600 px-6 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5"
        >
          Write my reply
        </button>
      </div>
    </header>
  );
}

function BusinessFlair() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 left-0 right-0 z-20 hidden overflow-hidden lg:block"
    >
      <FlairIcon icon={BadgeDollarSign} className="right-6 top-56 rotate-[-10deg]" glow="bg-emerald-400/25" tile="bg-emerald-600" />
      <FlairIcon icon={Leaf} className="left-6 top-[760px] rotate-12" glow="bg-teal-400/25" tile="bg-teal-600" />
      <FlairIcon icon={Target} className="right-6 top-[1030px] rotate-[-8deg]" glow="bg-orange-400/25" tile="bg-orange-600" />
      <FlairIcon icon={BadgeDollarSign} className="right-6 top-[1510px] rotate-12" glow="bg-emerald-400/25" tile="bg-emerald-600" />
      <FlairIcon icon={Handshake} className="left-6 top-[1880px] rotate-6" glow="bg-indigo-400/25" tile="bg-indigo-600" />
      <FlairIcon icon={TrendingUp} className="left-6 top-[2360px] rotate-[-8deg]" glow="bg-sky-400/25" tile="bg-sky-600" />
      <FlairIcon icon={Clock3} className="right-6 top-[2740px] rotate-[-10deg]" glow="bg-cyan-400/25" tile="bg-cyan-600" />
      <FlairIcon icon={Leaf} className="right-6 top-[3340px] rotate-[-12deg]" glow="bg-teal-400/25" tile="bg-teal-600" />
      <FlairIcon icon={MailCheck} className="left-6 top-[3850px] rotate-6" glow="bg-blue-400/25" tile="bg-blue-600" />
      <FlairIcon icon={TrendingUp} className="right-6 top-[4510px] rotate-[-8deg]" glow="bg-sky-400/25" tile="bg-sky-600" />
      <FlairIcon icon={Leaf} className="right-6 top-[5230px] rotate-6" glow="bg-teal-400/25" tile="bg-teal-600" />
      <FlairIcon icon={Handshake} className="left-6 top-[5600px] rotate-[-10deg]" glow="bg-indigo-400/25" tile="bg-indigo-600" />
      <FlairIcon icon={Target} className="right-6 top-[6040px] rotate-12" glow="bg-orange-400/25" tile="bg-orange-600" />
    </div>
  );
}

function FlairIcon({
  icon: Icon,
  className,
  glow,
  tile,
}: {
  icon: typeof BadgeDollarSign;
  className: string;
  glow: string;
  tile: string;
}) {
  return (
    <div className={`absolute h-16 w-16 ${className}`}>
      <div
        className={`absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full blur-lg ${glow}`}
      />
      <div
        className={`absolute left-1/2 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-xl ${tile} text-white shadow-xl shadow-slate-300/80 ring-[3px] ring-white`}
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
    </div>
  );
}

function Logo({ light = false }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <Image
        src="/brand/gibraltar-mark.svg"
        alt=""
        width={96}
        height={96}
        className="h-9 w-9 rounded-lg shadow-md shadow-blue-500/20"
      />
      <span className={`font-black ${light ? "text-white" : "text-slate-950"}`}>
        Gibraltar
      </span>
    </div>
  );
}

function TrustPill({
  icon: Icon,
  text,
}: {
  icon: typeof Clock3;
  text: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-600 shadow-sm">
      <Icon className="h-4 w-4 shrink-0 text-teal-600" aria-hidden="true" />
      <span>{text}</span>
    </div>
  );
}

function HeroPreview() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-2xl shadow-slate-200/70">
      <div className="p-6">
        <p className="text-sm font-bold uppercase text-slate-500">Customer asked</p>
        <div className="mt-3 rounded-xl bg-slate-200/70 p-5 text-lg leading-8">
          &quot;Hi, how much would it cost to book a birthday dinner for 8 people this
          Friday?&quot;
        </div>
      </div>
      <div className="border-t border-slate-200 bg-white p-6">
        <p className="text-sm font-bold uppercase text-teal-600">Send this</p>
        <div className="mt-3 rounded-xl border border-teal-200 bg-cyan-50 p-5 text-lg leading-8">
          &quot;Absolutely, we would love to host you. For 8 guests this Friday, I can
          check availability and send the best seating options. What time are you
          hoping to come in?&quot;
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge icon={CheckCircle2} text="Clear answer" tone="teal" />
          <Badge icon={ArrowRight} text="Next step" tone="blue" />
          <Badge icon={ArrowRight} text="Natural upsell" tone="purple" />
          <Badge icon={MessageCircle} text="Warm lead" tone="orange" />
        </div>
        <div className="mt-5 flex flex-wrap gap-6 text-sm text-slate-600">
          <span>
            <Clock3 className="mr-1 inline h-4 w-4 text-teal-600" />
            Ready <b className="text-slate-950">in seconds</b>
          </span>
          <span>
            Tone <b className="text-slate-950">Friendly</b>
          </span>
          <span>
            Customer interest <b className="text-teal-600">High</b>
          </span>
        </div>
      </div>
    </div>
  );
}

function Badge({
  icon: Icon,
  text,
  tone,
}: {
  icon: typeof CheckCircle2;
  text: string;
  tone: "teal" | "blue" | "purple" | "orange";
}) {
  const styles = {
    teal: "bg-teal-100 text-teal-700",
    blue: "bg-blue-100 text-blue-700",
    purple: "bg-purple-100 text-purple-700",
    orange: "bg-orange-100 text-orange-700",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${styles[tone]}`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {text}
    </span>
  );
}

function IconBox({
  icon: Icon,
  color,
}: {
  icon: typeof Zap;
  color: string;
}) {
  return (
    <div
      className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${color} text-white shadow-lg shadow-slate-300/70`}
    >
      <Icon className="h-6 w-6" aria-hidden="true" />
    </div>
  );
}

function ListCard({
  icon,
  text,
  color,
  highlight = false,
}: {
  icon: typeof Zap;
  text: string;
  color: string;
  highlight?: boolean;
}) {
  return (
    <article
      className={`flex items-center gap-5 rounded-xl border p-5 ${
        highlight
          ? "border-teal-200 bg-cyan-50 shadow-md shadow-teal-100/70"
          : "border-slate-200 bg-slate-50"
      }`}
    >
      <IconBox icon={icon} color={color} />
      <p className="text-lg font-semibold">{text}</p>
    </article>
  );
}

function MarketProof({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/60">
      <p className="text-3xl font-black text-slate-950">{value}</p>
      <p className="mt-2 text-sm font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
    </div>
  );
}

function InboxRow({
  name,
  subject,
  meta,
  active = false,
}: {
  name: string;
  subject: string;
  meta: string;
  active?: boolean;
}) {
  return (
    <div
      className={`border-b border-slate-100 p-5 last:border-b-0 ${
        active ? "bg-cyan-50" : "bg-white"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-black ${
            active
              ? "bg-gradient-to-br from-teal-500 to-blue-600 text-white"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          {name.slice(0, 1)}
        </div>
        <div className="min-w-0">
          <p className="font-black text-slate-950">{name}</p>
          <p className="mt-1 truncate text-sm font-semibold text-slate-600">
            {subject}
          </p>
          <p
            className={`mt-2 text-xs font-black uppercase ${
              active ? "text-teal-600" : "text-slate-400"
            }`}
          >
            {meta}
          </p>
        </div>
      </div>
    </div>
  );
}

function EarlyAccessForm({
  email,
  joined,
  error,
  isLoading,
  onEmailChange,
  onJoin,
}: {
  email: string;
  joined: boolean;
  error: string;
  isLoading: boolean;
  onEmailChange: (email: string) => void;
  onJoin: (email: string) => Promise<void>;
}) {
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onJoin(email);
  }

  return (
    <div className="mx-auto mb-20 max-w-2xl rounded-2xl border border-white/10 bg-white/8 p-6 shadow-2xl shadow-slate-950/20 backdrop-blur sm:p-8">
      <h2 className="text-3xl font-black sm:text-4xl">
        Want this built for your business?
      </h2>
      <p className="mx-auto mt-4 max-w-xl text-lg leading-8 text-slate-200">
        Join early access and be first to try a version made for busy local
        owners who answer customers all day.
      </p>
      {joined ? (
        <div className="mt-6 rounded-xl border border-teal-300/30 bg-teal-400/15 px-5 py-4 text-base font-bold text-teal-100">
          Thanks, you are on the list. We saved your email for early access.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto]">
          <label className="sr-only" htmlFor="early-access-email">
            Email address
          </label>
          <input
            id="early-access-email"
            type="email"
            required
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
            placeholder="you@yourbusiness.com"
            className="min-h-14 rounded-xl border border-white/15 bg-white px-4 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-teal-300 focus:ring-4 focus:ring-teal-300/20"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="min-h-14 rounded-xl bg-gradient-to-r from-teal-500 to-blue-600 px-6 text-base font-black text-white shadow-lg shadow-blue-950/20 transition hover:-translate-y-0.5"
          >
            {isLoading ? "Joining..." : "Join early access"}
          </button>
          {error ? (
            <div className="rounded-xl border border-red-300/30 bg-red-400/15 px-4 py-3 text-left text-sm font-bold text-red-100 sm:col-span-2">
              {error}
            </div>
          ) : null}
          <p className="text-left text-sm leading-6 text-slate-300 sm:col-span-2">
            Emails are saved to your Supabase early access table once you add
            your Supabase keys.
          </p>
        </form>
      )}
    </div>
  );
}

function OutputCard({ title, body }: { title: string; body: string }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-black">{title}</h3>
      <p className="mt-3 whitespace-pre-line leading-7 text-slate-600">{body}</p>
    </article>
  );
}
