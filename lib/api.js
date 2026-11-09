// Client for the VOUCHLY FastAPI backend (backend/app/main.py and backend/app/ai_layer.py).
// Only endpoints that exist in the backend are listed here. Add new ones as the backend grows.
const BASE = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
export const apiConfigured = BASE !== "";

let token = null;
// Call this from the login page once the backend has an auth endpoint.
export const setToken = (t) => { token = t; };

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

export const getHealth = () => request("/health", { timeoutMs: 5000 });
// Returns { ai_mode, provider, model, leaves_your_network, message }
export const getAiDisclosure = () => request("/workspace/ai-disclosure");
// Runs the check on the latest version. Returns { version_id, ai_ran, ai_disclosure, findings }
export const reviewContent = (contentId) => request("/content/" + encodeURIComponent(contentId) + "/review", { method: "POST", timeoutMs: 90000 });

// The backend sends source_id but not the source title yet. Pass a { [source_id]: title } map once a sources endpoint exists.
export function toFinding(f, titles = {}) {
  return {
    id: f.id, category: f.category, severity: f.severity, excerpt: f.excerpt, explanation: f.explanation,
    source_id: f.source_id, source_title: f.source_id ? titles[f.source_id] || "Approved source" : null,
    source_quote: f.source_quote, suggestion: f.suggestion, decision: f.decision, decided_by: null,
  };
}
