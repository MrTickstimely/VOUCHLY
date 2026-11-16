"""python tests/test_media.py  (no DB, no network; PDF test is skipped if PyMuPDF is missing)"""
import io, json, os, sys, tempfile, threading, zipfile
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from PIL import Image
from app import ai_layer as ai
from app import media_review as m

TMP = Path(tempfile.mkdtemp())


def make_png(path, color=(200, 30, 30), size=(800, 600)):
    Image.new("RGB", size, color).save(path)
    return path


def test_docx_text_images_alt():
    from docx import Document
    png = make_png(TMP / "a.png")
    d = Document(); d.add_paragraph("Battery lasts 20 hours."); d.add_paragraph("Our users love it.")
    d.add_picture(str(png)); p = TMP / "t.docx"; d.save(p)
    ex = m.extract_docx(p)
    assert "Battery lasts 20 hours." in ex.text and "\n\n" in ex.text
    assert len(ex.images) == 1 and ex.images[0].width == 800
    assert any("no alt text" in x.excerpt for x in ex.drafts)       # filename / empty alt counts as missing


def test_pptx_text_images_alt():
    from pptx import Presentation
    from pptx.util import Inches
    prs = Presentation(); s = prs.slides.add_slide(prs.slide_layouts[5]); s.shapes.title.text = "The BEST lamp"
    pic = s.shapes.add_picture(str(make_png(TMP / "b.png")), Inches(1), Inches(2), Inches(3))
    pic._element.nvPicPr.cNvPr.set("descr", "A red lamp on a table")   # proper alt on this one
    s2 = prs.slides.add_slide(prs.slide_layouts[5]); s2.shapes.add_picture(str(TMP / "b.png"), Inches(1), Inches(2), Inches(3))
    p = TMP / "t.pptx"; prs.save(p)
    ex = m.extract_pptx(p)
    assert "The BEST lamp" in ex.text and len(ex.images) == 2
    flagged = [d.excerpt for d in ex.drafts]
    assert flagged == ["[slide 2] image has no alt text"], flagged   # slide 1 has real alt text


def test_alt_rules():
    assert not m._alt_is_useful("") and not m._alt_is_useful("IMG_204.png") and not m._alt_is_useful("Picture 3")
    assert m._alt_is_useful("A red lamp on a wooden table")


def test_normalize_rejects_garbage_and_shrinks():
    assert m.normalize_image(b"not an image", "x") is None
    big = io.BytesIO(); Image.new("RGB", (3000, 2000), "white").save(big, "PNG")
    img = m.normalize_image(big.getvalue(), "x")
    assert img.width == 3000 and Image.open(io.BytesIO(img.data)).size[0] <= 1280


def test_palette_check_is_grounded():
    chunk = ai.Chunk("s1:0", "s1", "guideline", "Palette", "Our brand colours are #1A5FB4 and #FFFFFF. Never use red.")
    red = m.normalize_image(open(make_png(TMP / "r.png", (200, 30, 30)), "rb").read(), "image")
    blue = m.normalize_image(open(make_png(TMP / "bl.png", (26, 95, 180)), "rb").read(), "image")
    bad = m.image_checks(red, [chunk], standalone=False)
    assert len(bad) == 1 and bad[0].source_id == "s1" and "#1A5FB4" in bad[0].source_quote
    assert m.image_checks(blue, [chunk], standalone=False) == []         # on-brand colour: no finding
    assert m.image_checks(red, [], standalone=False) == []               # no palette known: stay silent


def test_resolution_only_for_standalone_images():
    small = m.normalize_image(open(make_png(TMP / "s.png", size=(300, 200)), "rb").read(), "image")
    assert len(m.image_checks(small, [], standalone=True)) == 1
    assert m.image_checks(small, [], standalone=False) == []


def test_parse_json_object_variants():
    obj = {"visible_text": "BEST LAMP", "findings": []}
    assert m.parse_json_object("<think>hmm {not json}</think>" + json.dumps(obj)) == obj
    assert m.parse_json_object("```json\n" + json.dumps(obj) + "\n```") == obj
    assert m.parse_json_object("Sure! " + json.dumps(obj) + " Hope that helps") == obj
    assert m.parse_json_object("garbage") == {}


def test_validate_visual_drops_ungrounded():
    ch = [ai.Chunk("s1:0", "s1", "guideline", "Logo", "Never place the logo on a busy photo background.")]
    items = [
        {"observation": "Logo sits on a crowded photo", "chunk_id": "s1:0", "rule_quote": "Never place the logo on a busy photo background.",
         "category": "visual", "severity": "high", "explanation": "x", "suggestion": "y"},
        {"observation": "Logo too small", "chunk_id": "s1:0", "rule_quote": "Logos must be 40px tall", "explanation": "x"},   # invented
        {"observation": "x", "chunk_id": "nope:1", "rule_quote": "Never place the logo", "explanation": "x"},                 # bad chunk
        {"observation": "", "chunk_id": "s1:0", "rule_quote": "Never place the logo", "explanation": "x"},                    # no observation
    ]
    out = m.validate_visual(items, ch, "page 2 image 1")
    assert len(out) == 1 and out[0].source_id == "s1" and out[0].excerpt.startswith("[page 2 image 1]")


def test_magic_bytes():
    png = io.BytesIO(); Image.new("RGB", (2, 2)).save(png, "PNG")
    assert m.magic_ok(".png", png.getvalue()) and not m.magic_ok(".jpg", png.getvalue())
    assert not m.magic_ok(".pdf", b"MZ\x90\x00 an exe") and m.magic_ok(".pdf", b"%PDF-1.7 ...")
    d = TMP / "t.docx"
    assert m.magic_ok(".docx", d.read_bytes()) and not m.magic_ok(".pptx", d.read_bytes())
    z = io.BytesIO()
    with zipfile.ZipFile(z, "w") as zf: zf.writestr("random.txt", "hi")
    assert not m.magic_ok(".docx", z.getvalue())                          # a zip that is not a docx


def test_safe_path_blocks_traversal():
    m.UPLOAD_DIR = TMP.resolve()
    ok = TMP / "ok.png"; make_png(ok)
    assert m._safe_path(str(ok)) == ok.resolve()
    for bad in ("/etc/passwd", str(TMP / ".." / "x.png")):
        try: m._safe_path(bad); assert False
        except ValueError: pass


def test_vision_payload_openai_compat():
    seen = {}
    class H(BaseHTTPRequestHandler):
        def do_POST(self):
            body = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
            seen.update(body); seen["auth"] = self.headers["Authorization"]
            self.send_response(200); self.end_headers()
            self.wfile.write(json.dumps({"choices": [{"message": {"content": "{\"findings\": []}"}}]}).encode())
        def log_message(self, *a): pass
    srv = HTTPServer(("127.0.0.1", 8766), H); threading.Thread(target=srv.serve_forever, daemon=True).start()
    os.environ.update(CLOUD_PROVIDER="groq", GROQ_API_KEY="k1", GROQ_BASE_URL="http://127.0.0.1:8766", GROQ_VISION_MODEL="qwen/qwen3.8-27b")
    p = ai.provider_for("cloud")
    out = p.complete_vision("sys", "look", [("image/jpeg", b"\xff\xd8\xffdata")])
    assert out == "{\"findings\": []}" and seen["model"] == "qwen/qwen3.8-27b" and seen["auth"] == "Bearer k1"
    parts = seen["messages"][1]["content"]
    assert parts[0]["type"] == "text" and parts[1]["type"] == "image_url"
    assert parts[1]["image_url"]["url"].startswith("data:image/jpeg;base64,")
    assert ai.provider_for("local").vision_model == "llama3.2-vision"
    os.environ["AI_DISABLED"] = "1"
    try: ai.provider_for("cloud").complete_vision("s", "p", []); assert False
    except ai.LLMUnavailable: pass
    del os.environ["AI_DISABLED"]


def test_pdf_if_available():
    try: import fitz
    except ImportError: print("   (skipped: PyMuPDF not installed here)"); return
    doc = fitz.open(); pg = doc.new_page(); pg.insert_text((72, 72), "Battery lasts 20 hours."); p = TMP / "t.pdf"; doc.save(p)
    assert "Battery lasts 20 hours." in m.extract_pdf(p).text


if __name__ == "__main__":
    for n, f in list(globals().items()):
        if n.startswith("test_"):
            f(); print("ok", n)
