"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";

const TYPES = [["text", "Text"], ["document", "Document"], ["deck", "Deck"], ["image", "Image"]];

export default function Submit() {
  const { submitContent, role, aiMode } = useStore();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState("text");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const run = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const item = await submitContent(title, type, body);
      router.push("/review/" + item.id);
    } catch (err) {
      setError(err.message || "Something went wrong.");
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
    <form onSubmit={run}>
      <h1 className="font-serif text-3xl font-semibold">Check new content</h1>
      <p className="mt-1 text-mute">Paste your draft. You will see every issue, and the rule behind it, before anyone else reviews it.</p>
      <label className="mt-6 block text-sm font-medium">Title
        <input required value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full rounded border border-line bg-white p-2 font-normal" />
      </label>
      <fieldset className="mt-4">
        <legend className="text-sm font-medium">Content type</legend>
        <div className="mt-1 flex flex-wrap gap-2">
          {TYPES.map(([v, l]) => (
            <label key={v} className={"cursor-pointer rounded border px-3 py-1.5 text-sm " + (type === v ? "border-ink bg-ink text-white" : "border-line bg-white")}>
              <input type="radio" className="sr-only" name="type" checked={type === v} onChange={() => setType(v)} />{l}
            </label>
          ))}
        </div>
        {type !== "text" && <p className="mt-2 text-xs text-mute">File upload is not connected yet. Paste the text from your {type} for now.</p>}
      </fieldset>
      <label className="mt-4 block text-sm font-medium">Content
        <textarea required rows={14} value={body} onChange={(e) => setBody(e.target.value)} className="mt-1 w-full rounded border border-line bg-white p-2 font-serif text-lg font-normal" />
      </label>
      {error && <p className="mt-2 text-sm text-fail" role="alert">{error}</p>}
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <button className="btn-17" disabled={busy}><span className="text-container"><span className="text">{busy ? "Checking" : "Check content"}</span></span></button>
        <span className="text-xs text-mute">{aiMode === "cloud" ? "This workspace uses a cloud AI provider." : "This workspace uses a local model."}</span>
      </div>
    </form>
    <aside className="space-y-5 lg:pt-14">
      <section className="rounded border border-line bg-white p-5">
        <h2 className="font-serif text-lg font-semibold">What we check</h2>
        <ul className="mt-3 space-y-2 text-sm text-mute">
          <li>Tone against your voice guide</li><li>Terminology and banned words</li><li>Facts against approved sources</li>
          <li>Claims that need a source</li><li>Colour, contrast and logo use</li><li>Accessibility basics</li>
        </ul>
      </section>
      <section className="rounded border border-line bg-white p-5 text-sm">
        <h2 className="font-serif text-lg font-semibold">You stay in control</h2>
        <p className="mt-2 text-mute">Nothing changes automatically. You can accept, edit or dispute every finding, then send the draft for review.</p>
      </section>
    </aside>
    </div>
  );
}
