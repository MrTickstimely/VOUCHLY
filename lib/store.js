"use client";
import { createContext, useContext, useCallback, useEffect, useState } from "react";
import { SEED, USERS } from "@/lib/data";
import {
  apiConfigured, getHealth, getAiDisclosure, reviewContent, toFinding,
  getToken, setToken, getMe, login as apiLogin, register as apiRegister,
  createContent, listContent, getContent, submitForReview,
  decideFinding, addComment as apiAddComment, approveContent,
} from "@/lib/api";

const Ctx = createContext(null);
export const useStore = () => useContext(Ctx);

const stamp = () => new Date().toLocaleString([], { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" });

export function Provider({ children }) {
  const [role, setRole] = useState("creator");
  const [items, setItems] = useState(SEED);
  const [aiMode, setAiMode] = useState("cloud");
  // state: sample (no API address set), checking, live (backend answered), offline (backend did not answer)
  const [backend, setBackend] = useState({ state: apiConfigured ? "checking" : "sample", disclosure: null });
  // auth state
  const [user, setUser] = useState(null); // { id, email, role, workspace_id }

  // On mount: check backend health and restore session
  useEffect(() => {
    if (!apiConfigured) return undefined;
    let active = true;
    getHealth()
      .then(() => {
        if (!active) return null;
        setBackend({ state: "live", disclosure: null });
        // If we have a saved token, restore the session
        if (getToken()) {
          getMe()
            .then((u) => { if (active) { setUser(u); setRole(u.role); } })
            .catch(() => { setToken(null); }); // token expired
        }
        return getAiDisclosure().then((d) => { if (active) setBackend({ state: "live", disclosure: d }); }).catch(() => {});
      })
      .catch(() => { if (active) setBackend({ state: "offline", disclosure: null }); });
    return () => { active = false; };
  }, []);

  // Fetch content from backend when authenticated
  const refreshItems = useCallback(async () => {
    if (backend.state !== "live" || !user) return;
    try {
      const remote = await listContent();
      // Fetch detail for each item (findings, comments, versions)
      const detailed = await Promise.all(
        remote.map(async (item) => {
          try {
            const detail = await getContent(item.id);
            return {
              id: detail.id,
              remoteId: detail.id,
              title: detail.title,
              content_type: detail.content_type,
              status: detail.status,
              author: user.role,
              version_no: detail.latest ? detail.latest.version_no : 1,
              body: detail.latest ? detail.latest.body_text : "",
              findings: detail.findings.map((f) => toFinding(f)),
              comments: [],
              history: [{ at: stamp(), text: "Loaded from server" }],
            };
          } catch {
            return null;
          }
        })
      );
      const valid = detailed.filter(Boolean);
      if (valid.length > 0) setItems(valid);
    } catch {
      // keep local items on failure
    }
  }, [backend.state, user]);

  useEffect(() => { refreshItems(); }, [refreshItems]);

  const patch = (id, fn) => setItems((xs) => xs.map((x) => (x.id === id ? fn(x) : x)));
  const log = (x, text) => ({ ...x, history: [{ at: stamp(), text }, ...x.history] });

  const isLive = backend.state === "live" && !!user;

  const api = {
    role, setRole, aiMode, setAiMode, items, backend, user,

    // --- Auth ---
    login: async (email, password) => {
      const res = await apiLogin(email, password);
      setToken(res.token);
      setUser(res.user);
      setRole(res.user.role);
      return res;
    },
    register: async (workspace_name, email, password, ai_mode) => {
      const res = await apiRegister(workspace_name, email, password, ai_mode);
      setToken(res.token);
      setUser(res.user);
      setRole(res.user.role);
      return res;
    },
    logout: () => {
      setToken(null);
      setUser(null);
      setItems(SEED);
    },

    get: (id) => items.find((x) => x.id === id),
    addItem: (item) => setItems((xs) => [item, ...xs]),

    // --- Submit content (calls backend when live) ---
    submitContent: async (title, content_type, body) => {
      if (isLive) {
        const res = await createContent(title, content_type, body);
        const contentId = res.id;
        // Run AI review
        let findings = [];
        try {
          const review = await reviewContent(contentId);
          findings = review.findings.map((f) => toFinding(f));
        } catch {
          // AI review may fail if no API key; item is still created
        }
        const item = {
          id: contentId,
          remoteId: contentId,
          title, content_type, status: "draft", author: role, version_no: 1, body, findings,
          comments: [],
          history: [
            { at: stamp(), text: "Submitted version 1" },
            { at: stamp(), text: "Automated check found " + findings.length + (findings.length === 1 ? " issue" : " issues") },
          ],
        };
        setItems((xs) => [item, ...xs]);
        return item;
      }
      // Offline fallback: local mock
      const { mockReview } = await import("@/lib/data");
      const findings = mockReview(body);
      const id = "c" + Date.now();
      const item = {
        id, title, content_type, status: "draft", author: role, version_no: 1, body, findings,
        comments: [],
        history: [
          { at: stamp(), text: "Submitted version 1" },
          { at: stamp(), text: "Automated check found " + findings.length + (findings.length === 1 ? " issue" : " issues") },
        ],
      };
      setItems((xs) => [item, ...xs]);
      return item;
    },

    // --- Finding decisions ---
    decide: async (cid, fid, decision, text) => {
      if (isLive) {
        const item = items.find((x) => x.id === cid);
        if (item && item.remoteId) {
          try { await decideFinding(fid, decision, text || null); } catch { /* fall through to local */ }
        }
      }
      patch(cid, (x) => {
        const fi = x.findings.find((y) => y.id === fid);
        const replacement = decision === "accepted" ? fi.suggestion : decision === "edited" ? text : null;
        const changed = replacement !== null && replacement !== undefined;
        return log({
          ...x,
          body: changed ? x.body.replace(fi.excerpt, replacement) : x.body,
          version_no: changed ? x.version_no + 1 : x.version_no,
          findings: x.findings.map((y) => (y.id === fid ? { ...y, decision, decided_by: USERS[role] } : y)),
        }, USERS[role] + " " + decision + " a " + fi.category + " finding");
      });
    },

    // --- Status changes ---
    setStatus: async (cid, status) => {
      if (isLive) {
        const item = items.find((x) => x.id === cid);
        if (item && item.remoteId) {
          try {
            if (status === "in_review") await submitForReview(item.remoteId);
            else if (status === "approved") await approveContent(item.remoteId, "approved");
            else if (status === "changes_requested") await approveContent(item.remoteId, "changes_requested", "Changes requested from review UI");
          } catch { /* fall through to local */ }
        }
      }
      patch(cid, (x) => log({ ...x, status }, USERS[role] + " set status to " + status.replace("_", " ")));
    },

    // --- Comments ---
    comment: async (cid, body) => {
      if (isLive) {
        const item = items.find((x) => x.id === cid);
        if (item && item.remoteId) {
          try { await apiAddComment(item.remoteId, body); } catch { /* fall through to local */ }
        }
      }
      patch(cid, (x) => ({ ...x, comments: [...x.comments, { id: String(Date.now()), author: role, body, at: stamp() }] }));
    },

    // --- Server review (re-run) ---
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
