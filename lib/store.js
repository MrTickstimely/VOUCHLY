"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { SEED, USERS } from "@/lib/data";
import { apiConfigured, getHealth, getAiDisclosure, reviewContent, toFinding } from "@/lib/api";

const Ctx = createContext(null);
export const useStore = () => useContext(Ctx);

const stamp = () => new Date().toLocaleString([], { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" });

export function Provider({ children }) {
  const [role, setRole] = useState("creator");
  const [items, setItems] = useState(SEED);
  const [aiMode, setAiMode] = useState("cloud");
  // state: sample (no API address set), checking, live (backend answered), offline (backend did not answer)
  const [backend, setBackend] = useState({ state: apiConfigured ? "checking" : "sample", disclosure: null });

  useEffect(() => {
    if (!apiConfigured) return undefined;
    let active = true;
    getHealth()
      .then(() => {
        if (!active) return null;
        setBackend({ state: "live", disclosure: null });
        return getAiDisclosure().then((d) => { if (active) setBackend({ state: "live", disclosure: d }); }).catch(() => {});
      })
      .catch(() => { if (active) setBackend({ state: "offline", disclosure: null }); });
    return () => { active = false; };
  }, []);

  const patch = (id, fn) => setItems((xs) => xs.map((x) => (x.id === id ? fn(x) : x)));
  const log = (x, text) => ({ ...x, history: [{ at: stamp(), text }, ...x.history] });

  const api = {
    role, setRole, aiMode, setAiMode, items, backend,
    get: (id) => items.find((x) => x.id === id),
    addItem: (item) => setItems((xs) => [item, ...xs]),
    // Text only changes when the creator clicks accept or apply.
    decide: (cid, fid, decision, text) => patch(cid, (x) => {
      const fi = x.findings.find((y) => y.id === fid);
      const replacement = decision === "accepted" ? fi.suggestion : decision === "edited" ? text : null;
      const changed = replacement !== null && replacement !== undefined;
      return log({
        ...x,
        body: changed ? x.body.replace(fi.excerpt, replacement) : x.body,
        version_no: changed ? x.version_no + 1 : x.version_no,
        findings: x.findings.map((y) => (y.id === fid ? { ...y, decision, decided_by: USERS[role] } : y)),
      }, USERS[role] + " " + decision + " a " + fi.category + " finding");
    }),
    setStatus: (cid, status) => patch(cid, (x) => log({ ...x, status }, USERS[role] + " set status to " + status.replace("_", " "))),
    comment: (cid, body) => patch(cid, (x) => ({ ...x, comments: [...x.comments, { id: String(Date.now()), author: role, body, at: stamp() }] })),
    // Runs the server check for an item stored on the backend. Decided findings are kept, undecided ones are replaced.
    runServerReview: async (cid) => {
      const item = items.find((x) => x.id === cid);
      if (!item || !item.remoteId) throw new Error("This item is not stored on the server yet.");
      const res = await reviewContent(item.remoteId);
      const fresh = res.findings.map((f) => toFinding(f));
      patch(cid, (x) => log({
        ...x,
        findings: [...x.findings.filter((f) => f.decision !== "pending"), ...fresh],
        lastReview: { ai_ran: res.ai_ran, message: res.ai_disclosure.message },
      }, "Server check found " + fresh.length + (fresh.length === 1 ? " issue" : " issues")));
      return res;
    },
  };
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}
