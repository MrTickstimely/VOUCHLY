"use client";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { REVIEWER_ROLES } from "@/lib/data";
import { StatusBadge } from "@/components/Badges";

export default function Queue() {
  const { items, role } = useStore();
  const reviewer = REVIEWER_ROLES.includes(role);
  const rank = { in_review: 0, changes_requested: 1, draft: 2, approved: 3 };
  const list = (reviewer ? items : items.filter((x) => x.author === role)).slice().sort((a, b) => rank[a.status] - rank[b.status]);
  const open = (x) => x.findings.filter((f) => f.decision === "pending").length;
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-semibold">{reviewer ? "Review queue" : "Your content"}</h1>
          <p className="mt-1 text-mute">{reviewer ? "Items waiting for sign-off are listed first." : "Open an item to see what was flagged and why."}</p>
        </div>
        <Link href="/submit" className="btn btn-primary">Check new content</Link>
      </div>
      <dl className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[["in_review", "Waiting for sign-off"], ["changes_requested", "Need changes"], ["draft", "Drafts"], ["approved", "Approved"]].map(([k, l]) => (
          <div key={k} className="rounded border border-line bg-white p-4">
            <dd className="font-serif text-3xl font-semibold">{list.filter((x) => x.status === k).length}</dd>
            <dt className="text-sm text-mute">{l}</dt>
          </div>
        ))}
      </dl>
      {list.length === 0 ? (
        <p className="mt-6 rounded border border-line bg-white p-6">Nothing here yet. <Link href="/submit" className="underline">Check your first draft</Link>.</p>
      ) : (
        <ul className="mt-6 divide-y divide-line rounded border border-line bg-white">
          {list.map((x) => (
            <li key={x.id}>
              <Link href={"/review/" + x.id} className="flex items-center justify-between gap-4 p-4 hover:bg-paper">
                <div>
                  <div className="font-medium">{x.title}</div>
                  <div className="text-sm text-mute">{x.content_type}, version {x.version_no}</div>
                </div>
                <div className="flex items-center gap-3">
                  {open(x) > 0 && <span className="text-sm text-fail">{open(x)} to resolve</span>}
                  <StatusBadge status={x.status} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
