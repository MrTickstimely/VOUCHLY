"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { ROLES } from "@/lib/data";
import ThemeToggle from "@/components/ThemeToggle";
import RoleSelect from "@/components/RoleSelect";
import Logo from "@/components/Logo";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/core/dialog";

const NAV = [["/queue", "Review queue"], ["/submit", "Check new content"], ["/login", "Account"]];
const BACKEND_LINE = {
  sample: "Showing sample data. Changes reset when you reload.",
  checking: "Connecting to the server.",
  live: "Connected to the server.",
  offline: "The server did not respond. Showing sample data.",
};

export default function Shell({ children }) {
  const { role, setRole, aiMode, setAiMode, backend, user, logout } = useStore();
  const path = usePathname();
  const [askCloud, setAskCloud] = useState(false);
  const d = backend.disclosure;
  return (
    <div className="min-h-screen md:grid md:grid-cols-[264px_1fr]">
      <aside className="sidebar flex flex-col border-b border-line bg-white p-4 md:sticky md:top-0 md:h-screen md:self-start md:overflow-y-auto md:border-b-0 md:border-r">
        <Logo />
        <nav className="mt-4 flex gap-1 md:flex-col" aria-label="Workspace">
          {NAV.map(([href, label]) => (
            <Link key={href} href={href} aria-current={path === href ? "page" : undefined}
              className={"rounded px-3 py-2 text-sm " + (path === href ? "bg-ink text-white" : "hover:bg-paper")}>{label}</Link>
          ))}
        </nav>
        <div className="mt-6 space-y-4 text-sm">
          {user ? (
            <div className="rounded border border-line bg-paper p-3 text-xs">
              <p className="text-mute">Signed in as</p>
              <p className="font-medium truncate">{user.email}</p>
              <p className="text-mute capitalize mt-0.5">Role: {user.role}</p>
              <button onClick={logout} className="mt-2 text-fail underline block">Sign out</button>
            </div>
          ) : (
            <RoleSelect value={role} onChange={setRole} options={ROLES} />
          )}
          {d ? (
            <div>
              <p className="text-mute">AI model for this workspace</p>
              <p className="mt-1 font-medium">{d.provider === "none" ? "No AI model" : d.provider + (d.model ? ", " + d.model : "")}</p>
              <p className="mt-2 rounded bg-paper p-2 text-xs text-mute">{d.message} {d.leaves_your_network ? "Content leaves your network." : "Content stays on your network."}</p>
            </div>
          ) : (
            <>
              <fieldset>
                <legend className="text-mute">AI model for this workspace</legend>
                {[["cloud", "Cloud AI provider"], ["local", "Local (Ollama)"]].map(([v, l]) => (
                  <label key={v} className="mt-1 flex items-center gap-2">
                    <input type="radio" name="ai" checked={aiMode === v} onChange={() => (v === "cloud" && aiMode !== "cloud" ? setAskCloud(true) : setAiMode(v))} /> {l}
                  </label>
                ))}
              </fieldset>
              <p className="rounded bg-paper p-2 text-xs text-mute">
                {aiMode === "cloud" ? "Drafts and the matching source passages are sent to the cloud AI provider set up for this workspace." : "Drafts are checked on your own server. Nothing is sent to an outside AI service."}
              </p>
            </>
          )}
        </div>
        <div className="mt-auto pt-6 text-xs text-mute">
          <div className="mb-3 flex items-center justify-between"><span>Dark mode</span><ThemeToggle /></div>
          <p>{BACKEND_LINE[backend.state]}</p>
          <p className="mt-2 flex gap-3"><Link href="/privacy" className="underline">Privacy</Link><Link href="/terms" className="underline">Terms</Link></p>
        </div>
      </aside>
      <main className="w-full max-w-[1400px] p-4 md:p-8 lg:p-10">{children}</main>
      <Dialog open={askCloud} onOpenChange={setAskCloud}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send drafts to a cloud AI provider?</DialogTitle>
            <DialogDescription>With the cloud option, drafts and the matching passages from your sources leave your server and are processed by the cloud AI provider this workspace is set up with. Switch only if your organisation allows it.</DialogDescription>
          </DialogHeader>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <DialogClose className="btn">Keep local</DialogClose>
            <button className="btn btn-primary" onClick={() => { setAiMode("cloud"); setAskCloud(false); }}>Use cloud AI</button>
          </div>
          <DialogClose />
        </DialogContent>
      </Dialog>
    </div>
  );
}
