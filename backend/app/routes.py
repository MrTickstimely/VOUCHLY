"""VOUCHLY workflow API (drop at backend/app/routes.py).

Everything except AI review (that lives in ai_layer.py): auth, users, knowledge sources,
content + versions, finding decisions, submit/approve, comments, audit log, insights.

Rules baked in (each is one small `if`, easy to change):
  * Every query is scoped to the caller's workspace (tenant isolation).
  * creator/agency users only ever see their own content.
  * A finding can only be decided on the LATEST version.
  * Disputing a finding requires a reason (it feeds the "unclear rules" insight).
  * Nobody approves their own content, and a version with pending HIGH findings cannot be approved.
  * Adding a new version sends the item back to draft.
"""
from datetime import datetime, timezone
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import case, desc, func, select
from sqlalchemy.orm import Session

from app import ai_layer
from app.core.ratelimit import client_ip, limiter, rate_limit
from app.core.security import (DUMMY_HASH, create_token, get_current_user, hash_password,
                               require_roles, verify_password)
from app.db.database import get_db
from app.db.models import (Approval, AuditLog, Comment, ContentItem, ContentVersion, Finding,
                           KnowledgeSource, User, Workspace)

router = APIRouter()

OWN_CONTENT_ONLY = ("creator", "agency")
EMAIL = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"


# =====================================================================================
# helpers
# =====================================================================================
def audit(db: Session, user: User, action: str, entity_type: str, entity_id: str) -> None:
    db.add(AuditLog(workspace_id=user.workspace_id, actor_id=user.id, action=action,
                    entity_type=entity_type, entity_id=entity_id))


def load_item(db: Session, user: User, content_id: str) -> ContentItem:
    """Fetch a content item the caller is allowed to see, else 404 (never reveal other tenants)."""
    item = db.get(ContentItem, content_id)
    if not item or item.workspace_id != user.workspace_id:
        raise HTTPException(404, "Content not found")
    if user.role in OWN_CONTENT_ONLY and item.created_by != user.id:
        raise HTTPException(404, "Content not found")
    return item


def latest_version(db: Session, content_id: str) -> Optional[ContentVersion]:
    return db.scalars(select(ContentVersion).where(ContentVersion.content_id == content_id)
                      .order_by(ContentVersion.version_no.desc())).first()


def item_dict(i: ContentItem) -> dict:
    return {"id": i.id, "title": i.title, "content_type": i.content_type, "status": i.status,
            "created_by": i.created_by, "created_at": i.created_at}


def version_dict(v: ContentVersion, with_body: bool = False) -> dict:
    d = {"id": v.id, "version_no": v.version_no, "created_by": v.created_by, "created_at": v.created_at}
    if with_body:
        d["body_text"] = v.body_text
    return d


def finding_dict(f: Finding) -> dict:
    return {"id": f.id, "version_id": f.version_id, "category": f.category, "severity": f.severity,
            "excerpt": f.excerpt, "explanation": f.explanation, "source_id": f.source_id,
            "source_quote": f.source_quote, "suggestion": f.suggestion, "decision": f.decision,
            "decided_by": f.decided_by, "decided_at": f.decided_at}


def source_dict(s: KnowledgeSource) -> dict:
    return {"id": s.id, "kind": s.kind, "title": s.title, "content_hash": s.content_hash,
            "uploaded_by": s.uploaded_by, "created_at": s.created_at}


# =====================================================================================
# auth + users
# =====================================================================================
class RegisterIn(BaseModel):
    workspace_name: str = Field(min_length=1, max_length=100)
    email: str = Field(pattern=EMAIL)
    password: str = Field(min_length=10, max_length=128)
    ai_mode: Literal["cloud", "local"] = "cloud"


class LoginIn(BaseModel):
    email: str = Field(max_length=254)
    password: str = Field(max_length=128)


class UserIn(BaseModel):
    email: str = Field(pattern=EMAIL)
    password: str = Field(min_length=10, max_length=128)
    role: Literal["admin", "manager", "creator", "reviewer", "agency"]


def user_dict(u: User) -> dict:
    return {"id": u.id, "email": u.email, "role": u.role, "workspace_id": u.workspace_id}


@router.post("/auth/register", status_code=201, dependencies=[Depends(rate_limit("register", 5, 3600))])
def register(body: RegisterIn, db: Session = Depends(get_db)):
    """Creates a NEW workspace and its first admin. Everyone else is added by that admin via /users."""
    email = body.email.strip().lower()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(409, "Email already registered")
    ws = Workspace(name=body.workspace_name, ai_mode=body.ai_mode)
    db.add(ws)
    db.flush()
    user = User(workspace_id=ws.id, email=email, password_hash=hash_password(body.password), role="admin")
    db.add(user)
    db.flush()
    audit(db, user, "workspace_created", "workspace", ws.id)
    db.commit()
    return {"token": create_token(user.id), "user": user_dict(user)}


@router.post("/auth/login")
def login(body: LoginIn, request: Request, db: Session = Depends(get_db)):
    email = body.email.strip().lower()
    ip = client_ip(request)
    limiter.check(f"login-ip:{ip}", 20, 900)          # one address can't spray many accounts
    limiter.check(f"login:{ip}:{email}", 5, 900)       # one address can't hammer one account
    user = db.scalar(select(User).where(User.email == email))
    password_ok = verify_password(body.password, user.password_hash if user else DUMMY_HASH)
    # same message for unknown email and wrong password: do not leak which accounts exist
    if not user or not password_ok:
        if user:  # failed attempts on real accounts are visible to admins in /audit
            audit(db, user, "login_failed", "user", user.id)
            db.commit()
        raise HTTPException(401, "Invalid email or password")
    limiter.reset(f"login:{ip}:{email}")
    audit(db, user, "login", "user", user.id)
    db.commit()
    return {"token": create_token(user.id), "user": user_dict(user)}


@router.get("/auth/me")
def me(user: User = Depends(get_current_user)):
    return user_dict(user)


@router.post("/users", status_code=201)
def create_user(body: UserIn, db: Session = Depends(get_db), admin: User = Depends(require_roles("admin"))):
    email = body.email.strip().lower()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(409, "Email already registered")
    u = User(workspace_id=admin.workspace_id, email=email, password_hash=hash_password(body.password),
             role=body.role)
    db.add(u)
    db.flush()
    audit(db, admin, f"user_created:{body.role}", "user", u.id)
    db.commit()
    return user_dict(u)


@router.get("/users")
def list_users(db: Session = Depends(get_db), user: User = Depends(require_roles("admin", "manager"))):
    rows = db.scalars(select(User).where(User.workspace_id == user.workspace_id)).all()
    return [user_dict(u) for u in rows]


# =====================================================================================
# knowledge base (managers/admins build it; the text lives in the retrieval index)
# =====================================================================================
class SourceIn(BaseModel):
    kind: Literal["guideline", "fact", "terminology", "asset"]
    title: str = Field(min_length=1, max_length=200)
    text: str = Field(min_length=1, max_length=500_000)


class SourceUpdateIn(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    text: Optional[str] = Field(None, min_length=1, max_length=500_000)


@router.post("/sources", status_code=201)
def create_source(body: SourceIn, db: Session = Depends(get_db),
                  user: User = Depends(require_roles("admin", "manager"))):
    src = KnowledgeSource(workspace_id=user.workspace_id, uploaded_by=user.id, kind=body.kind,
                          title=body.title, content_hash=ai_layer.content_hash(body.text))
    db.add(src)
    db.flush()  # need src.id before indexing
    ai_layer.get_index().index_source(user.workspace_id, src.id, src.kind, src.title, body.text)
    audit(db, user, "source_created", "knowledge_source", src.id)
    db.commit()
    return source_dict(src)


@router.get("/sources")
def list_sources(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows = db.scalars(select(KnowledgeSource).where(KnowledgeSource.workspace_id == user.workspace_id)
                      .order_by(KnowledgeSource.created_at.desc())).all()
    return [source_dict(s) for s in rows]


@router.put("/sources/{source_id}")
def update_source(source_id: str, body: SourceUpdateIn, db: Session = Depends(get_db),
                  user: User = Depends(require_roles("admin", "manager"))):
    src = db.get(KnowledgeSource, source_id)
    if not src or src.workspace_id != user.workspace_id:
        raise HTTPException(404, "Source not found")
    if body.title:
        src.title = body.title
    if body.text:
        new_hash = ai_layer.content_hash(body.text)
        if new_hash != src.content_hash:  # only re-index when the document really changed
            src.content_hash = new_hash
            ai_layer.get_index().index_source(user.workspace_id, src.id, src.kind, src.title, body.text)
    audit(db, user, "source_updated", "knowledge_source", src.id)
    db.commit()
    return source_dict(src)


# =====================================================================================
# content + versions
# =====================================================================================
class ContentIn(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    content_type: Literal["text", "image", "document", "deck"] = "text"
    body_text: str = Field(min_length=1, max_length=200_000)  # file uploads + parsing come later; text first


class VersionIn(BaseModel):
    body_text: str = Field(min_length=1, max_length=200_000)


@router.post("/content", status_code=201)
def create_content(body: ContentIn, db: Session = Depends(get_db),
                   user: User = Depends(require_roles("admin", "manager", "creator", "agency"))):
    item = ContentItem(workspace_id=user.workspace_id, created_by=user.id, title=body.title,
                       content_type=body.content_type)
    db.add(item)
    db.flush()
    v = ContentVersion(content_id=item.id, created_by=user.id, version_no=1, body_text=body.body_text)
    db.add(v)
    db.flush()
    audit(db, user, "content_created", "content_item", item.id)
    db.commit()
    return {**item_dict(item), "version": version_dict(v)}


@router.get("/content")
def list_content(status: Optional[str] = None, db: Session = Depends(get_db),
                 user: User = Depends(get_current_user)):
    q = select(ContentItem).where(ContentItem.workspace_id == user.workspace_id)
    if user.role in OWN_CONTENT_ONLY:
        q = q.where(ContentItem.created_by == user.id)
    if status:
        q = q.where(ContentItem.status == status)
    return [item_dict(i) for i in db.scalars(q.order_by(ContentItem.created_at.desc())).all()]


@router.get("/content/{content_id}")
def get_content(content_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    item = load_item(db, user, content_id)
    versions = db.scalars(select(ContentVersion).where(ContentVersion.content_id == item.id)
                          .order_by(ContentVersion.version_no)).all()
    latest = versions[-1] if versions else None
    findings, approvals = [], []
    if latest:
        findings = db.scalars(select(Finding).where(Finding.version_id == latest.id)).all()
        approvals = db.scalars(select(Approval).where(Approval.version_id == latest.id)).all()
    return {**item_dict(item),
            "versions": [version_dict(v) for v in versions],
            "latest": version_dict(latest, with_body=True) if latest else None,
            "findings": [finding_dict(f) for f in findings],
            "approvals": [{"reviewer_id": a.reviewer_id, "decision": a.decision, "note": a.note,
                           "created_at": a.created_at} for a in approvals]}


@router.post("/content/{content_id}/versions", status_code=201)
def add_version(content_id: str, body: VersionIn, db: Session = Depends(get_db),
                user: User = Depends(require_roles("admin", "manager", "creator", "agency"))):
    item = load_item(db, user, content_id)
    last = latest_version(db, item.id)
    v = ContentVersion(content_id=item.id, created_by=user.id,
                       version_no=(last.version_no + 1) if last else 1, body_text=body.body_text)
    db.add(v)
    item.status = "draft"  # any edit invalidates earlier approvals
    db.flush()
    audit(db, user, "version_added", "content_version", v.id)
    db.commit()
    return {**item_dict(item), "version": version_dict(v)}


@router.post("/content/{content_id}/submit")
def submit_for_review(content_id: str, db: Session = Depends(get_db),
                      user: User = Depends(require_roles("admin", "manager", "creator", "agency"))):
    item = load_item(db, user, content_id)
    if item.status not in ("draft", "changes_requested"):
        raise HTTPException(409, f"Cannot submit content that is '{item.status}'")
    if not latest_version(db, item.id):
        raise HTTPException(409, "No versions yet")
    item.status = "in_review"
    audit(db, user, "submitted_for_review", "content_item", item.id)
    db.commit()
    return item_dict(item)


# =====================================================================================
# findings: the human decision on every AI/rule suggestion
# =====================================================================================
class FindingDecisionIn(BaseModel):
    decision: Literal["accepted", "edited", "disputed"]
    note: Optional[str] = Field(None, max_length=1000)  # required when disputing


@router.get("/content/{content_id}/findings")
def list_findings(content_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    item = load_item(db, user, content_id)
    latest = latest_version(db, item.id)
    if not latest:
        return []
    rows = db.scalars(select(Finding).where(Finding.version_id == latest.id)).all()
    return [finding_dict(f) for f in rows]


@router.post("/findings/{finding_id}/decision")
def decide_finding(finding_id: str, body: FindingDecisionIn, db: Session = Depends(get_db),
                   user: User = Depends(get_current_user)):
    f = db.get(Finding, finding_id)
    version = db.get(ContentVersion, f.version_id) if f else None
    if not f or not version:
        raise HTTPException(404, "Finding not found")
    item = load_item(db, user, version.content_id)  # also enforces workspace + ownership
    latest = latest_version(db, item.id)
    if latest.id != version.id:
        raise HTTPException(409, "This finding belongs to an older version")
    if body.decision == "disputed" and not (body.note and body.note.strip()):
        raise HTTPException(422, "Explain why you are disputing this finding")

    f.decision = body.decision
    f.decided_by = user.id  # decision_pair constraint: set together with decided_at
    f.decided_at = datetime.now(timezone.utc)
    if body.note and body.note.strip():  # the reason is kept as a comment on the content
        db.add(Comment(content_id=item.id, author_id=user.id,
                       body=f"[{body.decision} {f.category} finding on \"{f.excerpt[:80]}\"] {body.note.strip()}"))
    audit(db, user, f"finding_{body.decision}", "finding", f.id)
    db.commit()
    db.refresh(f)
    return finding_dict(f)


# =====================================================================================
# approval workflow
# =====================================================================================
class ApprovalIn(BaseModel):
    decision: Literal["approved", "changes_requested"]
    note: Optional[str] = Field(None, max_length=1000)


@router.post("/content/{content_id}/approval")
def approve_or_request_changes(content_id: str, body: ApprovalIn, db: Session = Depends(get_db),
                               user: User = Depends(require_roles("admin", "manager", "reviewer"))):
    item = load_item(db, user, content_id)
    if item.status != "in_review":
        raise HTTPException(409, "Content is not in review")
    if item.created_by == user.id:
        raise HTTPException(403, "You cannot review your own content")
    v = latest_version(db, item.id)

    if body.decision == "approved":
        pending_high = db.scalar(select(func.count(Finding.id)).where(
            Finding.version_id == v.id, Finding.severity == "high", Finding.decision == "pending"))
        if pending_high:
            raise HTTPException(409, f"{pending_high} high-severity finding(s) still need a decision")
    if body.decision == "changes_requested" and not (body.note and body.note.strip()):
        raise HTTPException(422, "Say what needs to change")

    existing = db.scalar(select(Approval).where(Approval.version_id == v.id, Approval.reviewer_id == user.id))
    if existing:  # unique(version, reviewer): a reviewer can change their mind
        existing.decision, existing.note = body.decision, body.note
    else:
        db.add(Approval(version_id=v.id, reviewer_id=user.id, decision=body.decision, note=body.note))
    item.status = body.decision
    audit(db, user, f"approval:{body.decision}", "content_version", v.id)
    db.commit()
    return item_dict(item)


# =====================================================================================
# comments + audit
# =====================================================================================
class CommentIn(BaseModel):
    body: str = Field(min_length=1, max_length=2000)


@router.post("/content/{content_id}/comments", status_code=201)
def add_comment(content_id: str, body: CommentIn, db: Session = Depends(get_db),
                user: User = Depends(get_current_user)):
    item = load_item(db, user, content_id)
    c = Comment(content_id=item.id, author_id=user.id, body=body.body.strip())
    db.add(c)
    db.flush()
    audit(db, user, "comment_added", "comment", c.id)
    db.commit()
    return {"id": c.id, "author_id": c.author_id, "body": c.body, "created_at": c.created_at}


@router.get("/content/{content_id}/comments")
def list_comments(content_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    item = load_item(db, user, content_id)
    rows = db.scalars(select(Comment).where(Comment.content_id == item.id)
                      .order_by(Comment.created_at)).all()
    return [{"id": c.id, "author_id": c.author_id, "body": c.body, "created_at": c.created_at} for c in rows]


@router.get("/audit")
def audit_log(limit: int = 50, db: Session = Depends(get_db),
              user: User = Depends(require_roles("admin", "manager", "reviewer"))):
    rows = db.scalars(select(AuditLog).where(AuditLog.workspace_id == user.workspace_id)
                      .order_by(AuditLog.created_at.desc()).limit(min(limit, 200))).all()
    return [{"actor_id": a.actor_id, "action": a.action, "entity_type": a.entity_type,
             "entity_id": a.entity_id, "created_at": a.created_at} for a in rows]


# =====================================================================================
# insights: recurring violations + rules people keep disputing
# =====================================================================================
def _scoped(ws_id: str, *cols):
    """SELECT <cols> FROM findings, limited to this workspace."""
    return (select(*cols).select_from(Finding)
            .join(ContentVersion, Finding.version_id == ContentVersion.id)
            .join(ContentItem, ContentVersion.content_id == ContentItem.id)
            .where(ContentItem.workspace_id == ws_id))


@router.get("/insights")
def insights(db: Session = Depends(get_db), user: User = Depends(require_roles("admin", "manager"))):
    ws = user.workspace_id
    total = func.count(Finding.id)
    disputed = func.sum(case((Finding.decision == "disputed", 1), else_=0))

    by_category = db.execute(_scoped(ws, Finding.category, total).group_by(Finding.category)
                             .order_by(desc(total))).all()
    by_source = db.execute(
        _scoped(ws, KnowledgeSource.id, KnowledgeSource.title, total, disputed)
        .join(KnowledgeSource, Finding.source_id == KnowledgeSource.id)
        .group_by(KnowledgeSource.id, KnowledgeSource.title)
        .order_by(desc(disputed), desc(total)).limit(10)).all()
    unsupported = db.execute(
        _scoped(ws, func.lower(Finding.excerpt), total).where(Finding.source_id.is_(None))
        .group_by(func.lower(Finding.excerpt)).order_by(desc(total)).limit(10)).all()

    return {
        "recurring_categories": [{"category": c, "count": n} for c, n in by_category],
        # high dispute rate on a source = the rule is probably unclear or outdated
        "most_disputed_sources": [
            {"source_id": sid, "title": title, "findings": n, "disputed": int(d or 0),
             "dispute_rate": round(int(d or 0) / n, 2) if n else 0}
            for sid, title, n, d in by_source],
        # flagged with no supporting source = a gap in the guidelines
        "claims_without_a_source": [{"excerpt": e, "count": n} for e, n in unsupported],
    }