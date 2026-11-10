// Client for the VOUCHLY FastAPI backend (backend/app/main.py and backend/app/ai_layer.py).
// Only endpoints that exist in the backend are listed here. Add new ones as the backend grows.
const BASE = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
export const apiConfigured = BASE !== "";

let token = null;
export const getToken = () => token;
export const setToken = (t) => {
  token = t;
  if (typeof window !== "undefined") {
    if (t) sessionStorage.setItem("vouchly_token", t);
    else sessionStorage.removeItem("vouchly_token");
  }
};
// Restore token from sessionStorage on load
if (typeof window !== "undefined") {
  const saved = sessionStorage.getItem("vouchly_token");
  if (saved) token = saved;
}

export class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

async function request(path, { method = "GET", body, timeoutMs = 15000 } = {}) {
  if (!BASE) throw new ApiError(0, "The API address is not set.");
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const headers = {};
    if (body) headers["Content-Type"] = "application/json";
    if (token) headers.Authorization = "Bearer " + token;
    const res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined, signal: ctl.signal });
    if (!res.ok) {
      let msg = res.statusText || "Request failed";
      try { const j = await res.json(); if (typeof j.detail === "string") msg = j.detail; } catch (e) { /* keep status text */ }
      throw new ApiError(res.status, msg);
    }
    return await res.json();
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(0, e.name === "AbortError" ? "The server took too long to respond." : "Could not reach the server.");
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------
export const getHealth = () => request("/health", { timeoutMs: 5000 });

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export const register = (workspace_name, email, password, ai_mode = "cloud") =>
  request("/auth/register", { method: "POST", body: { workspace_name, email, password, ai_mode } });

export const login = (email, password) =>
  request("/auth/login", { method: "POST", body: { email, password } });

export const getMe = () => request("/auth/me");

// ---------------------------------------------------------------------------
// Users (admin only)
// ---------------------------------------------------------------------------
export const createUser = (email, password, role) =>
  request("/users", { method: "POST", body: { email, password, role } });

export const listUsers = () => request("/users");

// ---------------------------------------------------------------------------
// Knowledge sources
// ---------------------------------------------------------------------------
export const createSource = (kind, title, text) =>
  request("/sources", { method: "POST", body: { kind, title, text } });

export const listSources = () => request("/sources");

export const updateSource = (sourceId, updates) =>
  request("/sources/" + encodeURIComponent(sourceId), { method: "PUT", body: updates });

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------
export const createContent = (title, content_type, body_text) =>
  request("/content", { method: "POST", body: { title, content_type, body_text } });

export const listContent = (status) =>
  request("/content" + (status ? "?status=" + encodeURIComponent(status) : ""));

export const getContent = (contentId) =>
  request("/content/" + encodeURIComponent(contentId));

export const addVersion = (contentId, body_text) =>
  request("/content/" + encodeURIComponent(contentId) + "/versions", { method: "POST", body: { body_text } });

export const submitForReview = (contentId) =>
  request("/content/" + encodeURIComponent(contentId) + "/submit", { method: "POST" });

// ---------------------------------------------------------------------------
// AI review
// ---------------------------------------------------------------------------
// Returns { version_id, ai_ran, ai_disclosure, findings }
export const getAiDisclosure = () => request("/workspace/ai-disclosure");
export const reviewContent = (contentId) => request("/content/" + encodeURIComponent(contentId) + "/review", { method: "POST", timeoutMs: 90000 });

// ---------------------------------------------------------------------------
// Findings
// ---------------------------------------------------------------------------
export const listFindings = (contentId) =>
  request("/content/" + encodeURIComponent(contentId) + "/findings");

export const decideFinding = (findingId, decision, note) =>
  request("/findings/" + encodeURIComponent(findingId) + "/decision", { method: "POST", body: { decision, note: note || null } });

// ---------------------------------------------------------------------------
// Approval
// ---------------------------------------------------------------------------
export const approveContent = (contentId, decision, note) =>
  request("/content/" + encodeURIComponent(contentId) + "/approval", { method: "POST", body: { decision, note: note || null } });

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------
export const addComment = (contentId, body) =>
  request("/content/" + encodeURIComponent(contentId) + "/comments", { method: "POST", body: { body } });

export const listComments = (contentId) =>
  request("/content/" + encodeURIComponent(contentId) + "/comments");

// ---------------------------------------------------------------------------
// Audit & Insights
// ---------------------------------------------------------------------------
export const getAuditLog = (limit = 50) => request("/audit?limit=" + limit);
export const getInsights = () => request("/insights");

// The backend sends source_id but not the source title yet. Pass a { [source_id]: title } map once a sources endpoint exists.
export function toFinding(f, titles = {}) {
  return {
    id: f.id, category: f.category, severity: f.severity, excerpt: f.excerpt, explanation: f.explanation,
    source_id: f.source_id, source_title: f.source_id ? titles[f.source_id] || "Approved source" : null,
    source_quote: f.source_quote, suggestion: f.suggestion, decision: f.decision, decided_by: f.decided_by || null,
  };
}
