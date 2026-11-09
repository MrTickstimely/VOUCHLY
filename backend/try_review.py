"""Smoke test for ai_layer.py using Aditya's real models on a throwaway in-memory SQLite DB.
No login, no server, no Chroma needed.

Run from the backend/ folder:
    python try_review.py fake      # canned AI answers: tests the whole pipeline, no key needed (default)
    python try_review.py rules     # AI off: rule-based checks only
    python try_review.py claude    # real Claude call (needs ANTHROPIC_API_KEY)
    python try_review.py groq      # free Groq call (needs GROQ_API_KEY)
    python try_review.py ollama    # real local model (needs `ollama serve` + a pulled model)
"""
import json, os, sys

mode = sys.argv[1] if len(sys.argv) > 1 else "fake"
os.environ["USE_CHROMA"] = "0"                      # in-memory index, no model download
if mode == "rules":
    os.environ["AI_DISABLED"] = "1"
if mode == "groq":
    os.environ["CLOUD_PROVIDER"] = "groq"

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app import ai_layer
from app.db.database import Base
from app.db import models as m

engine = create_engine("sqlite:///:memory:")
Base.metadata.create_all(engine)
db = sessionmaker(bind=engine, expire_on_commit=False)()

ws = m.Workspace(name="Lumio", ai_mode="local" if mode == "ollama" else "cloud")
db.add(ws); db.flush()
user = m.User(workspace_id=ws.id, email="cam@lumio.test", password_hash="x", role="creator")
db.add(user); db.flush()

SOURCES = [
    ("fact", "Battery life", "The Lumio Lamp battery lasts up to 12 hours on a full charge."),
    ("terminology", "Customers", "We say customers, never users."),
    ("guideline", "Voice and tone", "Lumio sounds warm, plain-spoken and confident. We never shout or use hype."),
]
ids = {}
for kind, title, text in SOURCES:
    s = m.KnowledgeSource(workspace_id=ws.id, uploaded_by=user.id, kind=kind, title=title,
                          content_hash=ai_layer.content_hash(text))
    db.add(s); db.flush()
    ai_layer.get_index().index_source(ws.id, s.id, kind, title, text)
    ids[title] = s.id

TEXT = ("Meet the Lumio Lamp, the BEST lamp ever made! Battery lasts 20 hours. "
        "Our users love it. Click here to order.")
item = m.ContentItem(workspace_id=ws.id, created_by=user.id, title="Launch post", content_type="text")
db.add(item); db.flush()
ver = m.ContentVersion(content_id=item.id, created_by=user.id, version_no=1, body_text=TEXT)
db.add(ver); db.commit()

if mode == "fake":
    class FakeProvider:
        def complete(self, system, prompt):
            return json.dumps([
                {"excerpt": "Battery lasts 20 hours.", "chunk_id": f"{ids['Battery life']}:0", "category": "factual",
                 "severity": "high", "rule_quote": "battery lasts up to 12 hours",
                 "explanation": "Content says 20 hours; the approved fact says up to 12.",
                 "suggestion": "Battery lasts up to 12 hours on a full charge."},
                {"excerpt": "Our users love it.", "chunk_id": f"{ids['Customers']}:0", "category": "terminology",
                 "severity": "medium", "rule_quote": "never users", "explanation": "Approved term is 'customers'.",
                 "suggestion": "Our customers love it."},
                {"excerpt": "Battery lasts 20 hours.", "chunk_id": f"{ids['Battery life']}:0", "category": "factual",
                 "rule_quote": "batteries must be quoted in minutes", "explanation": "INVENTED RULE - must be dropped"},
            ])
        def disclosure(self):
            return ai_layer.Disclosure("fake", None, False, "Canned test responses; no AI was called.")
    ai_layer.provider_for = lambda ai_mode: FakeProvider()

res = ai_layer.run_review(db, ver.id, user.id)
print(f"\nmode={mode}  ai_ran={res.ai_ran}  error={res.error}")
print("disclosure:", res.disclosure.message, "\n")
for f in res.findings:
    src = f"source {f.source_id[:8]}.. \"{f.source_quote}\"" if f.source_id else "NO SOURCE"
    print(f"[{f.severity:6}] {f.category:13} \"{f.excerpt}\"\n         why: {f.explanation}\n         {src}\n         fix: {f.suggestion}\n")
print("audit:", [(a.action, a.entity_type) for a in db.query(m.AuditLog).all()])

if mode == "fake":
    assert not any("minutes" in (f.source_quote or "") for f in res.findings), "invented rule leaked through!"
    print("OK: the invented rule was dropped by the grounding check")