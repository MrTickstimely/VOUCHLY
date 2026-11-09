import { STATUS } from "@/lib/data";
const S = { draft: "bg-line text-ink", in_review: "bg-accent/10 text-accent", changes_requested: "bg-flag/15 text-flag", approved: "bg-pass/10 text-pass" };
const V = { low: "text-mute border-line", medium: "text-flag border-flag/40", high: "text-fail border-fail/40" };
export const StatusBadge = ({ status }) => <span className={"rounded-sm px-2 py-0.5 text-xs font-medium " + S[status]}>{STATUS[status]}</span>;
export const Severity = ({ level }) => <span className={"rounded-sm border px-1.5 py-0.5 text-xs " + V[level]}>{level} risk</span>;
