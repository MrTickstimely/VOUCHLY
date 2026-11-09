"""End-to-end test of the whole workflow through the real API (no server needed).

Run from backend/:   pip install httpx pytest   then   python test_api.py
Uses a throwaway SQLite file, rules-only AI, and the in-memory index.
"""
import os

os.environ["DATABASE_URL"] = "sqlite:///./test_vouchly.db"
os.environ["USE_CHROMA"] = "0"
os.environ["AI_DISABLED"] = "1"
if os.path.exists("test_vouchly.db"):
    os.remove("test_vouchly.db")

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402

c = TestClient(app)


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def ok(r, code=200):
    assert r.status_code == code, f"{r.request.method} {r.request.url.path} -> {r.status_code}: {r.text}"
    return r.json()


# --- workspace + users ---------------------------------------------------------------------
admin = ok(c.post("/auth/register", json={"workspace_name": "Lumio", "email": "admin@lumio.test",
                                          "password": "password123"}), 201)["token"]
for email, role in (("cam@lumio.test", "creator"), ("rev@lumio.test", "reviewer")):
    ok(c.post("/users", headers=auth(admin), json={"email": email, "password": "password123", "role": role}), 201)
creator = ok(c.post("/auth/login", json={"email": "cam@lumio.test", "password": "password123"}))["token"]
reviewer = ok(c.post("/auth/login", json={"email": "rev@lumio.test", "password": "password123"}))["token"]
assert c.post("/auth/login", json={"email": "cam@lumio.test", "password": "wrong"}).status_code == 401
assert c.get("/auth/me").status_code == 401  # no token
print("auth ok")

# --- knowledge base: only managers/admins ---------------------------------------------------
body = {"kind": "fact", "title": "Battery life", "text": "The Lumio Lamp battery lasts up to 12 hours."}
assert c.post("/sources", headers=auth(creator), json=body).status_code == 403
ok(c.post("/sources", headers=auth(admin), json=body), 201)
print("sources ok")

# --- content + AI review (rules only) --------------------------------------------------------
item = ok(c.post("/content", headers=auth(creator), json={
    "title": "Launch post", "body_text": "Meet the BEST lamp ever made. Click here to order."}), 201)
cid = item["id"]
review = ok(c.post(f"/content/{cid}/review", headers=auth(creator)))
findings = review["findings"]
assert any(f["severity"] == "high" for f in findings), "expected a high-severity promo finding"
print(f"review ok: {len(findings)} findings, ai_ran={review['ai_ran']}")

# --- the human-in-the-loop gate ---------------------------------------------------------------
ok(c.post(f"/content/{cid}/submit", headers=auth(creator)))
r = c.post(f"/content/{cid}/approval", headers=auth(reviewer), json={"decision": "approved"})
assert r.status_code == 409, "must not approve with pending high findings"
assert c.post(f"/content/{cid}/approval", headers=auth(creator), json={"decision": "approved"}).status_code == 403

high = next(f for f in findings if f["severity"] == "high")
other = next(f for f in findings if f["id"] != high["id"])
assert c.post(f"/findings/{high['id']}/decision", headers=auth(creator),
              json={"decision": "disputed"}).status_code == 422  # reason required
ok(c.post(f"/findings/{high['id']}/decision", headers=auth(creator),
          json={"decision": "disputed", "note": "Legal approved this superlative in Q3"}))
ok(c.post(f"/findings/{other['id']}/decision", headers=auth(creator), json={"decision": "accepted"}))

done = ok(c.post(f"/content/{cid}/approval", headers=auth(reviewer),
                 json={"decision": "approved", "note": "ok"}))
assert done["status"] == "approved"
print("workflow gate ok")

# --- comments, audit, insights ------------------------------------------------------------------
assert len(ok(c.get(f"/content/{cid}/comments", headers=auth(reviewer)))) == 1  # the dispute reason
actions = [a["action"] for a in ok(c.get("/audit", headers=auth(admin)))]
assert "approval:approved" in actions and "finding_disputed" in actions
ins = ok(c.get("/insights", headers=auth(admin)))
assert ins["recurring_categories"], ins
print("comments / audit / insights ok")

# --- new version resets status; other tenants see nothing ----------------------------------------
v2 = ok(c.post(f"/content/{cid}/versions", headers=auth(creator), json={"body_text": "Meet the Lumio Lamp."}), 201)
assert v2["status"] == "draft" and v2["version"]["version_no"] == 2
other_ws = ok(c.post("/auth/register", json={"workspace_name": "Rival", "email": "x@rival.test",
                                             "password": "password123"}), 201)["token"]
assert c.get(f"/content/{cid}", headers=auth(other_ws)).status_code == 404
assert c.get("/content", headers=auth(other_ws)).json() == []
print("versions + tenant isolation ok")

# --- security: brute-force lockout, headers, size cap ------------------------------------------
codes = [c.post("/auth/login", json={"email": "rev@lumio.test", "password": "wrong-password"}).status_code
         for _ in range(7)]
assert codes[:5] == [401] * 5 and 429 in codes[5:], f"expected lockout after 5 bad logins, got {codes}"
assert c.post("/auth/login", json={"email": "ghost@nowhere.test", "password": "whatever-123"}).status_code == 401
h = c.get("/health").headers
assert h["x-content-type-options"] == "nosniff" and h["x-frame-options"] == "DENY"
assert c.post("/content", headers={**auth(creator), "Content-Length": "99999999"}, content=b"{}").status_code == 413
assert c.post("/auth/register", json={"workspace_name": "W", "email": "s@s.test", "password": "short"}).status_code == 422
print("security checks ok")

print("\nALL CHECKS PASSED")