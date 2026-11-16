"""Runs without DB/network:  python tests/test_ai_pure.py   (or pytest)"""
import json, sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from app import ai_layer as grounding, ai_layer as rules
from app.ai_layer import Chunk, MemoryIndex, chunk_text

TEXT = ("Meet the Lumio Lamp, the BEST lamp ever made! Battery lasts 20 hours. "
        "Our users love it. Click here to order.")
CH = [Chunk("s1:0", "s1", "fact", "Battery", "The Lumio Lamp battery lasts up to 12 hours on a full charge."),
      Chunk("s2:0", "s2", "terminology", "Customers", "We say customers, never users.")]


def test_rules():
    cats = {(d.category, d.excerpt) for d in rules.run_rules(TEXT)}
    assert ("claim", "BEST") in cats and ("accessibility", "Click here") in cats


def test_grounding_keeps_real_and_drops_fake():
    items = [
        {"excerpt": "Battery lasts 20 hours.", "chunk_id": "s1:0", "category": "factual", "severity": "high",
         "rule_quote": "battery lasts up to 12 hours", "explanation": "x", "suggestion": "y"},
        {"excerpt": "Our users love it.", "chunk_id": "s2:0", "category": "terminology", "severity": "medium",
         "rule_quote": "never users", "explanation": "x", "suggestion": "y"},
        {"excerpt": "Battery lasts 20 hours.", "chunk_id": "s1:0", "category": "factual",   # invented rule
         "rule_quote": "batteries must be described in minutes", "explanation": "x"},
        {"excerpt": "text that is not in the content", "chunk_id": "s1:0", "rule_quote": "battery", "explanation": "x"},
        {"excerpt": "Our users love it.", "chunk_id": "zzz:9", "rule_quote": "never users", "explanation": "x"},
    ]
    out = grounding.validate(items, TEXT, CH)
    assert [d.source_id for d in out] == ["s1", "s2"]


def test_parse_handles_fences_and_wrapping():
    arr = [{"a": 1}]
    assert grounding.parse_llm_json("```json\n" + json.dumps(arr) + "\n```") == arr
    assert grounding.parse_llm_json("Here you go: " + json.dumps(arr)) == arr
    assert grounding.parse_llm_json("garbage") == []


def test_merge_prefers_cited_ai_finding():
    rule = rules.promo_claims(TEXT)
    ai = [grounding.Draft("claim", "high", "BEST", "backed?", "s9", "quote", None, "ai", 25)]
    m = grounding.merge(rule, ai)
    assert len([d for d in m if d.excerpt == "BEST"]) == 1 and m[0].source_id == "s9"


def test_index_is_workspace_scoped():
    idx = MemoryIndex()
    idx.index_source("wsA", "s1", "fact", "Battery", "Battery lasts up to 12 hours.")
    assert idx.search("wsA", "battery hours") and not idx.search("wsB", "battery hours")
    idx.delete_source("wsA", "s1")
    assert not idx.search("wsA", "battery hours")


def test_chunking():
    assert len(chunk_text("a. " * 400)) > 1 and chunk_text("") == []


if __name__ == "__main__":
    for n, f in list(globals().items()):
        if n.startswith("test_"):
            f(); print("ok", n)
