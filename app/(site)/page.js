import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { TextRoll } from "@/components/core/text-roll";
import { SEED, CATEGORY } from "@/lib/data";

// Every card on this page opens something real in the workspace.
const SAMPLE = "/review/" + SEED[0].id;
const STEPS = [
  ["Add your sources", "A brand manager uploads guidelines, approved facts, terminology lists and reusable assets.", "/queue", "Open the workspace"],
  ["Submit a draft", "Creators and agencies submit text, documents, decks or images.", "/submit", "Check a draft"],
  ["Review the findings", "Each finding names the rule it comes from and offers a rewrite. The creator accepts, edits or disputes it.", SAMPLE, "See a sample review"],
  ["Sign off", "A reviewer approves the draft or asks for changes. Comments, versions and decisions are all recorded.", "/queue", "Open the review queue"],
];

const CHECKS = [
  ["tone", "Language that does not match your voice guide."],
  ["terminology", "Words your glossary rules out."],
  ["factual", "Statements that disagree with your approved facts."],
  ["claim", "Absolute or comparative claims with no approved source behind them."],
  ["visual", "Colours, contrast and logo use measured against your asset rules."],
  ["accessibility", "Missing alt text, low contrast and text embedded in images."],
];

const PROMISES = ["Quotes the exact rule", "Nothing changes without you", "Cloud or local AI, your choice"];

// A whole card is one link: the title carries the link and stretches over the card.
const stretch = "after:absolute after:inset-0 after:content-[''] focus-visible:outline-none";

export default function Home() {
  const f = SEED[0].findings[2];
  return (
    <div className="space-y-24 lg:space-y-32">
      <section className="grid items-center gap-12 lg:min-h-[60vh] lg:grid-cols-[1.1fr_1fr] lg:gap-16">
        <div>
          <p className="inline-block rounded-sm border border-line bg-white px-3 py-1 text-sm font-medium text-mute">Brand governance with a person in charge</p>
          <h1 className="mt-5 font-serif text-4xl font-semibold leading-[1.15] tracking-tight sm:text-5xl lg:text-[3.35rem]">
            <TextRoll duration={0.4} stagger={0.02} exitOffset={0.15}>Catch off-brand content</TextRoll>{" "}
            <span className="text-accent"><TextRoll duration={0.4} stagger={0.02} exitOffset={0.15}>before it goes live.</TextRoll></span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-mute md:text-xl md:leading-relaxed">
            Vouchly checks every draft against your approved guidelines, facts and terminology, shows the exact rule behind each issue, and suggests a fix. Your team always makes the final call.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/queue" className="btn btn-primary gap-2 px-6 py-3 text-base">Open workspace <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
            <a href="#how" className="btn px-6 py-3 text-base">See how it works</a>
          </div>
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[0.95rem] text-mute">
            {PROMISES.map((p) => <li key={p} className="flex items-center gap-1.5"><Check className="h-4 w-4 text-pass" aria-hidden="true" strokeWidth={2.5} />{p}</li>)}
          </ul>
        </div>
        <figure className="tilt">
          <Link href={SAMPLE} className="tape card-link block rounded border border-line bg-white p-6">
            <p className="font-serif text-xl leading-relaxed">Set up your workspace in minutes and review <mark className="bg-mark px-0.5">any PDF of any size</mark>.</p>
            <div className="mt-5 border-t border-line pt-5 text-[0.95rem] leading-relaxed">
              <p className="font-semibold">{CATEGORY[f.category]}</p>
              <p className="mt-1">{f.explanation}</p>
              <blockquote className="mt-3 border-l-2 border-accent pl-3 text-mute">{f.source_quote}<footer className="mt-1 text-xs">From {f.source_title}</footer></blockquote>
              <p className="mt-3"><span className="text-mute">Suggested rewrite: </span><span className="font-semibold">{f.suggestion}</span></p>
              <p className="mt-4 flex items-center gap-1 text-sm font-medium text-accent">Open this sample review <ArrowRight className="arrow h-4 w-4" aria-hidden="true" /></p>
            </div>
          </Link>
          <figcaption className="mt-3 text-sm text-mute">A sample finding. Every finding in Vouchly follows this shape.</figcaption>
        </figure>
      </section>

      <section id="how" aria-labelledby="how-h" className="scroll-mt-8">
        <h2 id="how-h" className="font-serif text-3xl font-semibold tracking-tight">How a check works</h2>
        <p className="mt-2 max-w-2xl text-lg text-mute">Four steps from a draft to a signed-off post. Pick any card to try it.</p>
        <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(([t, d, href, cta], i) => (
            <li key={t} className="note card-link relative flex flex-col rounded border border-line bg-white p-5 pt-8">
              <p className="text-sm font-medium text-mute">Step {i + 1}</p>
              <h3 className="mt-1 text-lg font-semibold leading-snug"><Link href={href} className={stretch}>{t}</Link></h3>
              <p className="mt-2 text-[0.95rem] leading-relaxed text-mute">{d}</p>
              <p className="mt-auto flex items-center gap-1 pt-4 text-sm font-medium text-accent">{cta} <ArrowRight className="arrow h-4 w-4" aria-hidden="true" /></p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="checks">
        <h2 id="checks" className="font-serif text-3xl font-semibold tracking-tight">What gets checked</h2>
        <p className="mt-2 max-w-2xl text-lg text-mute">Six kinds of problem, each tied to a rule you wrote. Pick one to check a draft for it.</p>
        <dl className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {CHECKS.map(([k, d]) => (
            <div key={k} className="card-link relative flex flex-col rounded border border-line bg-white p-5">
              <dt className="text-lg font-semibold"><Link href="/submit" className={stretch}>{CATEGORY[k]}</Link></dt>
              <dd className="mt-1 text-[0.95rem] leading-relaxed text-mute">{d}</dd>
              <dd className="mt-auto flex items-center gap-1 pt-3 text-sm font-medium text-accent">Try this check <ArrowRight className="arrow h-4 w-4" aria-hidden="true" /></dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="data" className="grid gap-6 lg:grid-cols-[1fr_2fr] lg:gap-12">
        <h2 id="data" className="font-serif text-3xl font-semibold tracking-tight">Where your content goes</h2>
        <div className="max-w-3xl text-[1.0625rem] leading-relaxed">
          <p>Each workspace chooses how its drafts are checked. With the cloud option, drafts and the matching passages from your sources are sent to the cloud AI provider your workspace is set up with, such as Anthropic, Groq or OpenRouter. With the local option, a model hosted on your own server does the checking and nothing is sent to an outside AI service. The workspace always names the provider in use.</p>
          <p className="mt-4 text-mute">The <Link href="/privacy" className="underline">privacy policy</Link> lists what we store and who processes it.</p>
        </div>
      </section>

      <section aria-labelledby="start" className="rounded border border-line bg-white p-8 text-center md:p-12">
        <h2 id="start" className="font-serif text-3xl font-semibold tracking-tight">Ready to check your first draft?</h2>
        <p className="mx-auto mt-3 max-w-xl text-lg text-mute">Paste some text and see every issue, with the rule behind it, in about a minute.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/submit" className="btn btn-primary gap-2 px-6 py-3 text-base">Check content <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
          <Link href="/queue" className="btn px-6 py-3 text-base">Open workspace</Link>
        </div>
      </section>
    </div>
  );
}
