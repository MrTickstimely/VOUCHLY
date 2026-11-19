def run_media_review(db, version_id: str, actor_id: str):
    from app.db.models import ContentItem, ContentVersion, Workspace

    v = db.get(ContentVersion, version_id)
    item = db.get(ContentItem, v.content_id)
    ws = db.get(Workspace, item.workspace_id)
    path = _safe_path(v.file_path)
    ex = extract(path)
    if not ex.text and not ex.images:
        raise ValueError("Nothing reviewable found in this file")

    provider = ai.provider_for(ws.ai_mode)
    idx = ai.get_index()
    drafts = list(ex.drafts)
    notes = list(ex.notes)
    ai_ran, vision_used, error = False, False, None

    palette_chunks = [c for c in idx.search(ws.id, PALETTE_QUERY, k=6) if HEX.search(c.text)]
    standalone = path.suffix.lower() in IMAGE_EXTS
    for img in ex.images:
        drafts += image_checks(img, palette_chunks, standalone)

    visible = []
    visual_chunks = idx.search(
        ws.id,
        "brand visual identity logo colour imagery typography accessibility contrast",
        k=8,
    )
    for img in ex.images[:MAX_VISION_IMAGES]:
        try:
            raw = provider.complete_vision(
                VISION_SYSTEM,
                vision_prompt(img.label, visual_chunks),
                [("image/jpeg", img.data)],
            )
        except LLMUnavailable as e:
            error = str(e)
            break

        obj = parse_json_object(raw)
        drafts += validate_visual(obj.get("findings", []), visual_chunks, img.label)
        visible_text = str(obj.get("visible_text", "")).strip()
        if visible_text:
            visible.append(f"[{img.label}] {visible_text}")
        ai_ran = vision_used = True

    if len(ex.images) > MAX_VISION_IMAGES:
        notes.append(
            f"Only the first {MAX_VISION_IMAGES} of {len(ex.images)} images were "
            "checked by the vision model."
        )

    text = "\n\n".join(t for t in [ex.text, *visible] if t)
    if text:
        drafts += ai.run_rules(text)
        chunks = ai._retrieve(ws.id, text)

        try:
            raw = provider.complete(
                ai.GENERAL_SYSTEM_PROMPT,
                f"<content>\n{text}\n</content>",
            )
            drafts += ai.validate_general(ai.parse_llm_json(raw), text)
            ai_ran = True
        except LLMUnavailable as e:
            error = error or str(e)

        if chunks:
            try:
                raw = provider.complete(
                    ai.SYSTEM_PROMPT,
                    ai.build_prompt(text, chunks),
                )
                drafts += ai.validate(ai.parse_llm_json(raw), text, chunks)
                ai_ran = True
            except LLMUnavailable as e:
                error = error or str(e)

    drafts = ai.merge(
        [d for d in drafts if d.origin != "ai"],
        [d for d in drafts if d.origin == "ai"],
    )

    if ai_ran:
        disclosure = provider.disclosure()
        if vision_used and disclosure.leaves_your_network:
            disclosure.message += (
                " Images and scanned pages from your file are sent too."
            )
        vision_model = getattr(provider, "vision_model", None)
        if vision_used and vision_model:
            disclosure.message += f" Vision model: {vision_model}."
    else:
        disclosure = Disclosure(
            "none",
            None,
            False,
            "AI review did not run"
            + (f" ({error})" if error else "")
            + ". Only rule-based checks ran.",
        )

    if notes:
        disclosure.message += " " + " ".join(notes)

    created = ai.persist_findings(
        db,
        v,
        ws,
        actor_id,
        drafts,
        disclosure,
        action="review_run_media",
    )
    return ai.ReviewResult(created, disclosure, ai_ran, error)
