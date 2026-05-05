import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Gibraltar Brand Preview",
  description: "A private brand board for the Gibraltar identity direction.",
};

const palette = [
  { name: "Deep Navy", value: "#071426", note: "Primary brand anchor" },
  { name: "Harbor Blue", value: "#168EEA", note: "Action and links" },
  { name: "Tide Blue", value: "#2F56E8", note: "Water and motion" },
  { name: "Earth Brown", value: "#A96D4D", note: "Mountain warmth" },
  { name: "Shadow Umber", value: "#5C3A2A", note: "Rock depth" },
  { name: "Mist", value: "#F4FBFF", note: "Page background" },
  { name: "Foam", value: "#EAF9FF", note: "Soft panels" },
];

const taglines = [
  "Clear replies. Solid follow-through.",
  "Steady help for busy inboxes.",
  "Customer replies, ready when you are.",
];

const iconTiles = [
  { label: "Inbox", icon: <InboxIcon /> },
  { label: "Reply", icon: <ReplyIcon /> },
  { label: "Follow-up", icon: <FollowUpIcon /> },
  { label: "Booking", icon: <BookingIcon /> },
  { label: "Email", icon: <EmailIcon /> },
  { label: "Customer", icon: <CustomerIcon /> },
  { label: "Clock", icon: <ClockIcon /> },
  { label: "Growth", icon: <GrowthIcon /> },
  { label: "Copy", icon: <CopyIcon /> },
];

export default function BrandPage() {
  return (
    <main className="min-h-screen bg-[#f4fbff] text-[#071426]">
      <section className="relative overflow-hidden px-5 py-8 sm:px-8 lg:px-12">
        <div className="pointer-events-none absolute -right-28 top-8 h-96 w-96 rounded-full bg-[#20d4c7]/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-32 top-96 h-96 w-96 rounded-full bg-[#168eea]/16 blur-3xl" />

        <div className="relative mx-auto max-w-7xl">
          <header className="flex flex-col gap-5 rounded-3xl border border-slate-200/80 bg-white/85 p-5 shadow-xl shadow-slate-200/70 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Image
                src="/brand/gibraltar-mark.svg"
                alt="Gibraltar mark"
                width={96}
                height={96}
                className="h-12 w-12 rounded-2xl shadow-lg shadow-blue-900/15"
              />
              <div>
                <p className="text-sm font-black uppercase tracking-[0.2em] text-[#168eea]">
                  Brand preview
                </p>
                <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                  Gibraltar
                </h1>
              </div>
            </div>
            <div className="rounded-full border border-[#20d4c7]/30 bg-[#eaf9ff] px-4 py-2 text-sm font-bold text-[#0f766e]">
              usegibraltar.com
            </div>
          </header>

          <section className="grid gap-8 py-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-[#168eea]">
                Modern Rock
              </p>
              <h2 className="mt-4 max-w-3xl text-5xl font-black leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl">
                Strong, coastal, and built to feel established.
              </h2>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                Gibraltar moves the product away from generic AI-tool energy and into
                something sturdier: a practical assistant with an earthy Santa Barbara
                signal, a reliable voice, and a mark where shaded mountain and blue
                tide meet cleanly.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                {taglines.map((tagline) => (
                  <span
                    key={tagline}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm"
                  >
                    {tagline}
                  </span>
                ))}
              </div>
            </div>

            <BrandHeroCard />
          </section>

          <SectionHeading
            eyebrow="Logo system"
            title="Three first-pass directions"
            body="All three use the same rock and current language, but each solves a different brand moment."
          />
          <section className="grid gap-5 lg:grid-cols-3">
            <LogoCard
              title="Primary mark"
              description="The ownable mountain-and-tide mark with warm earth tones and a darker shadow face. Best for favicons, social avatars, and UI marks."
            >
              <Image
                src="/brand/gibraltar-mark.svg"
                alt="Gibraltar primary mark"
                width={96}
                height={96}
                className="h-28 w-28"
              />
            </LogoCard>
            <LogoCard
              title="App icon"
              description="A more dimensional rounded-square version for mobile homescreens, product cards, and launch graphics."
            >
              <Image
                src="/brand/gibraltar-app-icon.svg"
                alt="Gibraltar app icon"
                width={512}
                height={512}
                className="h-28 w-28 rounded-[2rem]"
              />
            </LogoCard>
            <LogoCard
              title="Horizontal lockup"
              description="The practical nav and footer treatment. Strong wordmark, compact mark, and enough white space to breathe."
            >
              <Image
                src="/brand/gibraltar-horizontal.svg"
                alt="Gibraltar horizontal logo"
                width={420}
                height={104}
                className="h-auto w-full max-w-sm"
              />
            </LogoCard>
          </section>

          <SectionHeading
            eyebrow="Icon family"
            title="Product icons with one visual voice"
            body="Rounded line icons, consistent stroke weight, and coastal accent fills. These are for feature cards, empty states, and small UI moments."
          />
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {iconTiles.map((tile) => (
              <div
                key={tile.label}
                className="flex items-center gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#071426] text-[#20d4c7] shadow-lg shadow-blue-900/15">
                  {tile.icon}
                </div>
                <div>
                  <h3 className="text-lg font-black">{tile.label}</h3>
                  <p className="mt-1 text-sm text-slate-500">Gibraltar system icon</p>
                </div>
              </div>
            ))}
          </section>

          <SectionHeading
            eyebrow="Foundations"
            title="Colors and interface pieces"
            body="A compact kit for making the product feel premium without turning it into a heavy enterprise dashboard."
          />
          <section className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-xl font-black">Palette</h3>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {palette.map((color) => (
                  <div key={color.name} className="rounded-2xl border border-slate-200 p-3">
                    <div
                      className="h-20 rounded-xl border border-black/5"
                      style={{ backgroundColor: color.value }}
                    />
                    <div className="mt-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black">{color.name}</p>
                        <p className="text-sm text-slate-500">{color.note}</p>
                      </div>
                      <code className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">
                        {color.value}
                      </code>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-xl font-black">Sample UI</h3>
              <div className="mt-5 rounded-3xl border border-slate-200 bg-[#f8fbff] p-4">
                <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <Image
                      src="/brand/gibraltar-mark.svg"
                      alt=""
                      width={96}
                      height={96}
                      className="h-10 w-10 rounded-xl"
                    />
                    <span className="text-lg font-black">Gibraltar</span>
                  </div>
                  <nav className="flex flex-wrap gap-4 text-sm font-semibold text-slate-500">
                    <span>How it works</span>
                    <span>Examples</span>
                    <span>Inbox preview</span>
                  </nav>
                  <button className="whitespace-nowrap rounded-xl bg-[#071426] px-4 py-3 text-sm font-black text-white shadow-lg shadow-blue-950/20">
                    Write my reply
                  </button>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-[#168eea]">
                      Customer asked
                    </p>
                    <p className="mt-4 rounded-xl bg-slate-100 p-4 leading-7 text-slate-700">
                      “Do you have any appointments open this weekend?”
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[#20d4c7]/40 bg-[#eaf9ff] p-5">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0f766e]">
                      Send this
                    </p>
                    <p className="mt-4 rounded-xl border border-[#20d4c7]/35 bg-white p-4 leading-7 text-slate-800">
                      “Yes, we have a few openings. I can check the best time for
                      you. Are you looking for Saturday or Sunday?”
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <button className="min-h-14 rounded-2xl bg-[#168eea] px-5 font-black text-white shadow-lg shadow-blue-500/25">
                  Primary action
                </button>
                <button className="min-h-14 rounded-2xl border border-slate-200 bg-white px-5 font-black text-[#071426]">
                  Secondary action
                </button>
              </div>
            </div>
          </section>

          <SectionHeading
            eyebrow="Usage preview"
            title="Footer, favicon, and small-space checks"
            body="These are the places where a brand either feels real or starts to look temporary."
          />
          <section className="grid gap-5 lg:grid-cols-3">
            <div className="rounded-3xl bg-[#071426] p-6 text-white shadow-xl shadow-slate-300">
              <div className="flex items-center gap-3">
                <Image
                  src="/brand/gibraltar-mark.svg"
                  alt=""
                  width={96}
                  height={96}
                  className="h-10 w-10 rounded-xl"
                />
                <span className="text-lg font-black">Gibraltar</span>
              </div>
              <p className="mt-8 max-w-sm text-sm leading-6 text-blue-100">
                Steady help for busy inboxes. Clear replies, reliable follow-up,
                and customer conversations that keep moving.
              </p>
              <p className="mt-10 text-xs text-blue-200">2026 Gibraltar. usegibraltar.com</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-black">Small sizes</h3>
              <div className="mt-6 flex items-end gap-4">
                <Image src="/brand/gibraltar-mark.svg" alt="" width={96} height={96} className="h-16 w-16 rounded-2xl" />
                <Image src="/brand/gibraltar-mark.svg" alt="" width={96} height={96} className="h-12 w-12 rounded-xl" />
                <Image src="/brand/gibraltar-mark.svg" alt="" width={96} height={96} className="h-8 w-8 rounded-lg" />
                <Image src="/brand/gibraltar-mark.svg" alt="" width={96} height={96} className="h-6 w-6 rounded-md" />
              </div>
              <p className="mt-6 text-sm leading-6 text-slate-500">
                The white current line stays readable down to nav and favicon sizes.
              </p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-black">Wordmark</h3>
              <Image
                src="/brand/gibraltar-wordmark.svg"
                alt="Gibraltar wordmark"
                width={320}
                height={80}
                className="mt-5 h-auto w-full max-w-xs"
              />
              <p className="mt-6 text-sm leading-6 text-slate-500">
                The wordmark is intentionally plain and sturdy so the custom mark
                can carry the coastal personality.
              </p>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

function BrandHeroCard() {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-300/70">
      <div className="rounded-[1.5rem] bg-[#071426] p-7 text-white">
        <div className="flex items-center justify-between gap-4">
          <Image
            src="/brand/gibraltar-app-icon.svg"
            alt="Gibraltar app icon"
            width={512}
            height={512}
            className="h-20 w-20 rounded-3xl shadow-2xl shadow-black/30"
          />
          <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-blue-100">
            Rock + Wave
          </span>
        </div>
        <h3 className="mt-14 text-5xl font-black tracking-tight sm:text-6xl">
          Gibraltar
        </h3>
        <p className="mt-4 max-w-md text-lg leading-8 text-blue-100">
          Clear replies. Solid follow-through.
        </p>
        <div className="mt-10 rounded-2xl border border-white/10 bg-white/8 p-4">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#20d4c7]">
            Brand signal
          </p>
          <p className="mt-3 leading-7 text-blue-50">
            Stable enough for local businesses, modern enough for an AI product,
            and coastal enough to feel rooted instead of generic. The mark should
            feel like Santa Barbara: earthy mountain meeting blue water.
          </p>
        </div>
      </div>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div className="mt-20 mb-8 max-w-3xl">
      <p className="text-sm font-black uppercase tracking-[0.2em] text-[#168eea]">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
        {title}
      </h2>
      <p className="mt-4 text-lg leading-8 text-slate-600">{body}</p>
    </div>
  );
}

function LogoCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex min-h-48 items-center justify-center rounded-3xl bg-[radial-gradient(circle_at_50%_35%,#eaf9ff,#ffffff_64%)] p-6">
        {children}
      </div>
      <h3 className="mt-6 text-xl font-black">{title}</h3>
      <p className="mt-2 leading-7 text-slate-600">{description}</p>
    </div>
  );
}

function IconBase({ children }: { children: React.ReactNode }) {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      {children}
    </svg>
  );
}

function InboxIcon() {
  return (
    <IconBase>
      <path d="M5 9.5h18v11H5v-11Z" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M5 9.5 9 5h10l4 4.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 15h3.5l1.5 2h2l1.5-2H20" stroke="#EAF9FF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </IconBase>
  );
}

function ReplyIcon() {
  return (
    <IconBase>
      <path d="M7 8.5h14v9H10.5L7 21v-12.5Z" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M11 12h7M11 15h4" stroke="#EAF9FF" strokeWidth="2.2" strokeLinecap="round" />
    </IconBase>
  );
}

function FollowUpIcon() {
  return (
    <IconBase>
      <path d="M8 8.5h10.5A4.5 4.5 0 0 1 23 13v0a4.5 4.5 0 0 1-4.5 4.5H11" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M12 13 7 18l5 5" stroke="#EAF9FF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </IconBase>
  );
}

function BookingIcon() {
  return (
    <IconBase>
      <path d="M7 6.5h14v15H7v-15Z" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M10 5v4M18 5v4M7 11h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="m11 16 2 2 4-4" stroke="#EAF9FF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </IconBase>
  );
}

function EmailIcon() {
  return (
    <IconBase>
      <path d="M5 8h18v13H5V8Z" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="m6 9 8 7 8-7" stroke="#EAF9FF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </IconBase>
  );
}

function CustomerIcon() {
  return (
    <IconBase>
      <path d="M14 14a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Z" stroke="currentColor" strokeWidth="2.2" />
      <path d="M6.5 23c1.3-4 4-6 7.5-6s6.2 2 7.5 6" stroke="#EAF9FF" strokeWidth="2.2" strokeLinecap="round" />
    </IconBase>
  );
}

function ClockIcon() {
  return (
    <IconBase>
      <path d="M14 23a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" stroke="currentColor" strokeWidth="2.2" />
      <path d="M14 9v5l3.5 2" stroke="#EAF9FF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </IconBase>
  );
}

function GrowthIcon() {
  return (
    <IconBase>
      <path d="M6 21h16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M8 18l5-5 3 3 5-7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18 9h3v3" stroke="#EAF9FF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </IconBase>
  );
}

function CopyIcon() {
  return (
    <IconBase>
      <path d="M10 9h10v13H10V9Z" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M8 18H6V6h10v2" stroke="#EAF9FF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </IconBase>
  );
}
