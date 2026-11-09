"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { CATEGORY, USERS, REVIEWER_ROLES } from "@/lib/data";
import { StatusBadge, Severity } from "@/components/Badges";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/core/dialog";

function Proof({ body, findings }) {
  let parts = [body];
  findings.filter((f) => f.decision === "pending" && body.includes(f.excerpt)).forEach((f) => {
    parts = parts.flatMap((p) => {
      if (typeof p !== "string") return [p];
      const pieces = p.split(f.excerpt);
      const out = [];
      pieces.forEach((s, i) => { out.push(s); if (i < pieces.length - 1) out.push({ mark: f.excerpt, key: f.id + "-" + i }); });
      return out;
    });
  });
  return <p className="proof font-serif text-xl leading-relaxed">{parts.map((p, i) => (typeof p === "string" ? <span key={i}>{p}</span> : <mark key={p.key}>{p.mark}</mark>))}</p>;
}

function FindingCard({ cid, f, canDecide }) {
  const { decide, comment } = useStore();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(f.suggestion || "");
  const [disputing, setDisputing] = useState(false);
  const [reason, setReason] = useState("");
  const done = f.decision !== "pending";

  const closeDispute = () => { setDisputing(false); setReason(""); };
  // The reason is saved as a comment so reviewers and managers can see why the finding was disputed.
  const confirmDispute = () => {
    comment(cid, "Disputed " + CATEGORY[f.category].toLowerCase() + " finding on \"" + f.excerpt + "\": " + reason.trim());
    decide(cid, f.id, "disputed");
    closeDispute();
  };

  return (
    <li className={"rounded border border-line bg-white p-4 " + (done ? "opacity-70" : "")}>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium">{CATEGORY[f.category]}</span>
        <Severity level={f.severity} />
        {done && <span className="ml-auto text-pass">{f.decision} by {f.decided_by}</span>}
      </div>
      <p className="mt-2 text-sm"><span className="bg-mark px-1">{f.excerpt}</span></p>
      <p className="mt-2">{f.explanation}</p>
      {f.source_quote ? (
        <blockquote className="mt-3 border-l-2 border-accent pl-3 text-sm text-mute">
          {f.source_quote}
          <footer className="mt-1 text-xs">From {f.source_title}</footer>
        </blockquote>
      ) : (
        <p className="mt-3 border-l-2 border-flag pl-3 text-sm text-flag">No approved source supports or contradicts this. A reviewer should decide.</p>
      )}
      {f.suggestion && <p className="mt-3 text-sm"><span className="text-mute">Suggested rewrite: </span><span className="font-medium">{f.suggestion}</span></p>}
      {!done && canDecide && (
        <div className="mt-4">
          {editing ? (
            <div className="flex flex-wrap gap-2">
              <input aria-label="Your wording" value={text} onChange={(e) => setText(e.target.value)} className="min-w-0 flex-1 rounded border border-line p-1.5 text-sm" />
              <button className="btn btn-primary" disabled={!text.trim()} onClick={() => decide(cid, f.id, "edited", text.trim())}>Apply my wording</button>
              <button className="btn" onClick={() => setEditing(false)}>Cancel</button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button className="btn btn-primary" disabled={!f.suggestion} onClick={() => decide(cid, f.id, "accepted")}>Accept rewrite</button>
              <button className="btn" onClick={() => setEditing(true)}>Edit wording</button>
              <button className="btn" onClick={() => setDisputing(true)}>Dispute finding</button>
            </div>
          )}
        </div>
      )}
      <Dialog open={disputing} onOpenChange={(o) => { if (!o) closeDispute(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dispute this finding</DialogTitle>
            <DialogDescription>Tell reviewers why you disagree. Your reason is saved as a comment, and the draft text stays as it is.</DialogDescription>
          </DialogHeader>
          <label className="mt-4 block text-sm font-medium">Your reason
            <textarea autoFocus rows={3} value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1 w-full rounded border border-line p-2 font-normal" />
          </label>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <DialogClose className="btn">Cancel</DialogClose>
            <button className="btn btn-primary" disabled={!reason.trim()} onClick={confirmDispute}>Dispute finding</button>
          </div>
          <DialogClose />
        </DialogContent>
      </Dialog>
    </li>
  );
}

export default function Review() {
  const { id } = useParams();
  const { get, role, setStatus, comment, backend, runServerReview } = useStore();
  const [msg, setMsg] = useState("");
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState("");
  const [dialog, setDialog] = useState(null); // null, "send", "approve" or "changes"
  const [note, setNote] = useState("");
  const x = get(id);
  if (!x) return <p>That item does not exist. <Link href="/queue" className="underline">Back to the review queue</Link>.</p>;

  const isReviewer = REVIEWER_ROLES.includes(role);
  const pending = x.findings.filter((f) => f.decision === "pending").length;
  const highCount = x.findings.filter((f) => f.severity === "high" && f.decision === "pending").length;
  const canEdit = !isReviewer && x.status !== "approved" && x.status !== "in_review";
  const canSend = !isReviewer && (x.status === "draft" || x.status === "changes_requested");
  const canReview = isReviewer && x.status === "in_review";

  const closeDialog = () => { setDialog(null); setNote(""); };
  const sendForReview = () => { setStatus(x.id, "in_review"); closeDialog(); };
  const approve = () => { setStatus(x.id, "approved"); closeDialog(); };
  const requestChanges = () => { comment(x.id, note.trim()); setStatus(x.id, "changes_requested"); closeDialog(); };
  const runCheck = async () => {
    setRunning(true); setRunError("");
    try { await runServerReview(x.id); } catch (e) { setRunError(e.message); }
    setRunning(false);
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div>
        <Link href="/queue" className="text-sm text-mute underline">Review queue</Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="font-serif text-3xl font-semibold">{x.title}</h1>
          <StatusBadge status={x.status} />
        </div>
        <p className="mt-1 text-sm text-mute">Version {x.version_no} by {USERS[x.author]}</p>
        <section className="mt-5 rounded border border-line bg-white p-6" aria-label="Content under review">
          <Proof body={x.body} findings={x.findings} />
        </section>
        <h2 className="mt-8 text-lg font-semibold">{x.findings.length === 0 ? "No findings" : pending ? pending + " to resolve" : "All findings resolved"}</h2>
        <p className="text-sm text-mute">Findings come from an automated check. Nothing in the draft changes until the creator accepts, edits or disputes it.</p>
        {isReviewer && x.findings.length > 0 && <p className="mt-1 text-sm text-mute">Only the creator can act on findings. You can comment and sign off.</p>}
        {backend.state === "live" && x.remoteId && (
          <div className="mt-3">
            <button className="btn" disabled={running} onClick={runCheck}>{running ? "Checking" : "Run check again"}</button>
            {runError && <p className="mt-2 text-sm text-fail" role="alert">{runError}</p>}
            {x.lastReview && <p className="mt-2 text-xs text-mute">{x.lastReview.message}</p>}
          </div>
        )}
        <ul className="mt-3 space-y-3">{x.findings.map((f) => <FindingCard key={f.id} cid={x.id} f={f} canDecide={canEdit} />)}</ul>
      </div>

      <aside className="space-y-6">
        <section className="rounded border border-line bg-white p-4">
          <h2 className="font-semibold">Sign-off</h2>
          {canSend && (
            <button className="btn btn-primary mt-3 w-full" onClick={() => (highCount > 0 ? setDialog("send") : sendForReview())}>Send for review</button>
          )}
          {canReview && (
            <div className="mt-3 flex flex-col gap-2">
              <button className="btn btn-primary" onClick={() => setDialog("approve")}>Approve</button>
              <button className="btn" onClick={() => setDialog("changes")}>Request changes</button>
            </div>
          )}
          {x.status === "approved" && <p className="mt-3 text-sm text-pass">Approved. This version is ready to publish.</p>}
          {!canSend && !canReview && x.status !== "approved" && <p className="mt-3 text-sm text-mute">Nothing to do right now.{x.status === "in_review" && !isReviewer ? " A reviewer will pick this up." : ""}</p>}
        </section>

        <section className="rounded border border-line bg-white p-4">
          <h2 className="font-semibold">Comments</h2>
          <ul className="mt-3 space-y-3 text-sm">
            {x.comments.length === 0 && <li className="text-mute">No comments yet.</li>}
            {x.comments.map((c) => <li key={c.id}><span className="font-medium">{USERS[c.author]}</span> <span className="text-xs text-mute">{c.at}</span><br />{c.body}</li>)}
          </ul>
          <form className="mt-3" onSubmit={(e) => { e.preventDefault(); if (msg.trim()) { comment(x.id, msg.trim()); setMsg(""); } }}>
            <textarea aria-label="Add a comment" value={msg} onChange={(e) => setMsg(e.target.value)} rows={3} className="w-full rounded border border-line p-2 text-sm" />
            <button className="btn mt-2">Post comment</button>
          </form>
        </section>

        <section className="rounded border border-line bg-white p-4">
          <h2 className="font-semibold">Revision history</h2>
          <ol className="mt-3 space-y-2 text-sm">{x.history.map((h, i) => <li key={i}><span className="text-xs text-mute">{h.at}</span><br />{h.text}</li>)}</ol>
        </section>
      </aside>

      <Dialog open={dialog === "send"} onOpenChange={(o) => { if (!o) closeDialog(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send with high risk findings open?</DialogTitle>
            <DialogDescription>{highCount + (highCount === 1 ? " high risk finding is" : " high risk findings are") + " still unresolved. Reviewers will see them. You can fix them first, or send the draft as it is."}</DialogDescription>
          </DialogHeader>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <DialogClose className="btn">Go back</DialogClose>
            <button className="btn btn-primary" onClick={sendForReview}>Send for review</button>
          </div>
          <DialogClose />
        </DialogContent>
      </Dialog>
      <Dialog open={dialog === "approve"} onOpenChange={(o) => { if (!o) closeDialog(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve this version?</DialogTitle>
            <DialogDescription>{"Version " + x.version_no + " will be marked approved and ready to publish. The decision is recorded in the revision history under your name." + (pending > 0 ? " " + pending + (pending === 1 ? " finding is" : " findings are") + " still unresolved." : "")}</DialogDescription>
          </DialogHeader>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <DialogClose className="btn">Cancel</DialogClose>
            <button className="btn btn-primary" onClick={approve}>Approve</button>
          </div>
          <DialogClose />
        </DialogContent>
      </Dialog>
      <Dialog open={dialog === "changes"} onOpenChange={(o) => { if (!o) closeDialog(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request changes</DialogTitle>
            <DialogDescription>The creator will see your note as a comment and can send the draft back for review once it is fixed.</DialogDescription>
          </DialogHeader>
          <label className="mt-4 block text-sm font-medium">What should change?
            <textarea autoFocus rows={4} value={note} onChange={(e) => setNote(e.target.value)} className="mt-1 w-full rounded border border-line p-2 font-normal" />
          </label>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <DialogClose className="btn">Cancel</DialogClose>
            <button className="btn btn-primary" disabled={!note.trim()} onClick={requestChanges}>Request changes</button>
          </div>
          <DialogClose />
        </DialogContent>
      </Dialog>
    </div>
  );
}
