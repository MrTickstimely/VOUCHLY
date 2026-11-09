// Sample data shaped like backend/app/db/models.py. Replace with API calls once the endpoints exist.
export const ROLES = ["creator", "manager", "reviewer", "admin", "agency"];
export const STATUS = { draft: "Draft", in_review: "In review", changes_requested: "Changes requested", approved: "Approved" };
export const CATEGORY = { tone: "Tone", terminology: "Terminology", factual: "Factual accuracy", claim: "Promotional claim", visual: "Visual", accessibility: "Accessibility" };
export const USERS = { creator: "Aditi S.", manager: "Harsh K.", reviewer: "Aditya V.", admin: "Ekansh G.", agency: "Studio Nine (agency)" };
export const REVIEWER_ROLES = ["manager", "reviewer", "admin"];

export const SOURCES = [
  { id: "s1", title: "Brand Voice Guide v3", quote: "Write in a warm, plain voice. Avoid superlatives such as 'best' or 'revolutionary'." },
  { id: "s2", title: "Approved Terms", quote: "Use 'workspace', never 'account space'." },
  { id: "s3", title: "Product Facts Sheet", quote: "Vouchly supports PDF, Word and PowerPoint files up to 25 MB." },
  { id: "s4", title: "Accessibility Standard", quote: "Every image must have alt text of at least 5 words describing its content." },
];

const f = (id, category, severity, excerpt, explanation, source, suggestion) => ({
  id, category, severity, excerpt, explanation, source_id: source ? source.id : null,
  source_title: source ? source.title : null, source_quote: source ? source.quote : null,
  suggestion, decision: "pending", decided_by: null,
});

export const SEED = [
  {
    id: "c1", title: "Winter launch announcement", content_type: "text", status: "in_review", author: "creator", version_no: 1,
    body: "Vouchly is the best brand checker in the world. Set up your account space in minutes and review any PDF of any size. Our revolutionary engine never misses an error.",
    findings: [
      f("f1", "tone", "medium", "the best brand checker in the world", "Superlative with no evidence behind it.", SOURCES[0], "a brand checker built for teams who care about consistency"),
      f("f2", "terminology", "low", "account space", "This term is not approved. The glossary uses 'workspace'.", SOURCES[1], "workspace"),
      f("f3", "factual", "high", "any PDF of any size", "Contradicts the documented file size limit.", SOURCES[2], "PDF, Word or PowerPoint files up to 25 MB"),
      f("f4", "claim", "high", "never misses an error", "Absolute performance claim.", null, "helps catch errors before you publish"),
    ],
    comments: [{ id: "m1", author: "manager", body: "Please resolve the file size claim before this goes to legal.", at: "Today, 10:12" }],
    history: [{ at: "Today, 09:40", text: "Aditi S. submitted version 1" }, { at: "Today, 09:41", text: "Automated check found 4 issues" }],
  },
  {
    id: "c2", title: "Onboarding deck, Q4", content_type: "deck", status: "draft", author: "agency", version_no: 2,
    body: "Slide 3: Hero image of the team (alt text: 'img').",
    findings: [f("f5", "accessibility", "medium", "alt text: 'img'", "The alt text is too short to describe the image.", SOURCES[3], "alt text: 'The team reviewing a campaign at a shared desk'")],
    comments: [], history: [{ at: "Yesterday", text: "Studio Nine submitted version 2" }],
  },
  {
    id: "c3", title: "Press note: partnership", content_type: "document", status: "approved", author: "creator", version_no: 3,
    body: "Vouchly now supports PDF, Word and PowerPoint files up to 25 MB in every workspace.",
    findings: [], comments: [], history: [{ at: "Monday", text: "Approved by Aditya V." }],
  },
];

// Stand-in for the backend review until the endpoint exists. Uses simple pattern rules only.
const RULES = [
  [/account space/i, "terminology", "low", "This term is not approved. The glossary uses 'workspace'.", 1, "workspace"],
  [/\b(best|revolutionary|world-class|number one)\b[^.]*/i, "tone", "medium", "Superlative with no evidence behind it.", 0, null],
  [/\b(never|always|guarantee[sd]?)\b[^.]*/i, "claim", "high", "Absolute claim.", null, null],
  [/any (pdf|file) of any size/i, "factual", "high", "Contradicts the documented file size limit.", 2, "PDF, Word or PowerPoint files up to 25 MB"],
];
export function mockReview(body) {
  let n = 0;
  const out = [];
  RULES.forEach(([re, cat, sev, why, si, fix]) => {
    const m = body.match(re);
    if (m) out.push(f("n" + Date.now() + "-" + n++, cat, sev, m[0], why, si === null ? null : SOURCES[si], fix));
  });
  return out;
}
