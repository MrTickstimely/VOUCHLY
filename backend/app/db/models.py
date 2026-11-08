from datetime import datetime

from sqlalchemy import CheckConstraint, ForeignKey, Index, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column
from uuid_utils import uuid7

from app.db.database import Base


def new_id() -> str:
    return str(uuid7())  # time-ordered, non-enumerable public ID


def one_of(col: str, values: tuple[str, ...]) -> CheckConstraint:
    return CheckConstraint(f"{col} IN ({', '.join(repr(v) for v in values)})", name=col)


def fk(target: str, ondelete: str = "RESTRICT", index: bool = True, **kw):
    return mapped_column(ForeignKey(target, ondelete=ondelete), index=index, **kw)


def pk():
    return mapped_column(primary_key=True, default=new_id)


def created():
    return mapped_column(server_default=func.now())


class Workspace(Base):
    __tablename__ = "workspaces"
    __table_args__ = (one_of("ai_mode", ("cloud", "local")),)
    id: Mapped[str] = pk()
    name: Mapped[str]
    ai_mode: Mapped[str] = mapped_column(server_default="cloud")
    created_at: Mapped[datetime] = created()


class User(Base):
    __tablename__ = "users"
    __table_args__ = (one_of("role", ("admin", "manager", "creator", "reviewer", "agency")),)
    id: Mapped[str] = pk()
    workspace_id: Mapped[str] = fk("workspaces.id")
    email: Mapped[str] = mapped_column(unique=True)
    password_hash: Mapped[str]
    role: Mapped[str]
    created_at: Mapped[datetime] = created()


class KnowledgeSource(Base):
    __tablename__ = "knowledge_sources"
    __table_args__ = (one_of("kind", ("guideline", "fact", "terminology", "asset")),)
    id: Mapped[str] = pk()
    workspace_id: Mapped[str] = fk("workspaces.id")
    uploaded_by: Mapped[str] = fk("users.id")
    kind: Mapped[str]
    title: Mapped[str]
    content_hash: Mapped[str]  # detects when a source document changes
    created_at: Mapped[datetime] = created()


class ContentItem(Base):
    __tablename__ = "content_items"
    __table_args__ = (
        one_of("content_type", ("text", "image", "document", "deck")),
        one_of("status", ("draft", "in_review", "approved", "changes_requested")),
        Index("ix_content_items_workspace_status", "workspace_id", "status"),
    )
    id: Mapped[str] = pk()
    workspace_id: Mapped[str] = fk("workspaces.id", index=False)
    created_by: Mapped[str] = fk("users.id")
    title: Mapped[str]
    content_type: Mapped[str]
    status: Mapped[str] = mapped_column(server_default="draft")
    created_at: Mapped[datetime] = created()


class ContentVersion(Base):  # append-only: every edit is a new row
    __tablename__ = "content_versions"
    __table_args__ = (
        UniqueConstraint("content_id", "version_no"),
        CheckConstraint("body_text IS NOT NULL OR file_path IS NOT NULL", name="has_content"),
    )
    id: Mapped[str] = pk()
    content_id: Mapped[str] = fk("content_items.id", "CASCADE", index=False)
    created_by: Mapped[str] = fk("users.id")
    version_no: Mapped[int]
    body_text: Mapped[str | None] = mapped_column(Text)
    file_path: Mapped[str | None]
    created_at: Mapped[datetime] = created()


class Finding(Base):
    __tablename__ = "findings"
    __table_args__ = (
        one_of("category", ("tone", "terminology", "factual", "claim", "visual", "accessibility")),
        one_of("severity", ("low", "medium", "high")),
        one_of("decision", ("pending", "accepted", "edited", "disputed")),
        CheckConstraint("(source_id IS NULL) = (source_quote IS NULL)", name="source_pair"),
        CheckConstraint("(decision = 'pending') = (decided_by IS NULL)", name="decision_pair"),
    )
    id: Mapped[str] = pk()
    version_id: Mapped[str] = fk("content_versions.id", "CASCADE")
    source_id: Mapped[str | None] = fk("knowledge_sources.id")  # NULL = no supporting source
    decided_by: Mapped[str | None] = fk("users.id")
    category: Mapped[str]
    severity: Mapped[str]
    excerpt: Mapped[str] = mapped_column(Text)
    explanation: Mapped[str] = mapped_column(Text)
    source_quote: Mapped[str | None] = mapped_column(Text)
    suggestion: Mapped[str | None] = mapped_column(Text)
    decision: Mapped[str] = mapped_column(server_default="pending")
    decided_at: Mapped[datetime | None]
    created_at: Mapped[datetime] = created()


class Comment(Base):
    __tablename__ = "comments"
    id: Mapped[str] = pk()
    content_id: Mapped[str] = fk("content_items.id", "CASCADE")
    author_id: Mapped[str] = fk("users.id")
    body: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = created()


class Approval(Base):
    __tablename__ = "approvals"
    __table_args__ = (
        one_of("decision", ("approved", "changes_requested")),
        UniqueConstraint("version_id", "reviewer_id"),
    )
    id: Mapped[str] = pk()
    version_id: Mapped[str] = fk("content_versions.id", "CASCADE", index=False)
    reviewer_id: Mapped[str] = fk("users.id")
    decision: Mapped[str]
    note: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = created()


class AuditLog(Base):  # no FKs on entity_id on purpose: the log must outlive deleted rows
    __tablename__ = "audit_log"
    __table_args__ = (Index("ix_audit_log_workspace_created", "workspace_id", "created_at"),)
    id: Mapped[str] = pk()
    workspace_id: Mapped[str] = fk("workspaces.id", index=False)
    actor_id: Mapped[str] = fk("users.id")
    action: Mapped[str]
    entity_type: Mapped[str]
    entity_id: Mapped[str]
    created_at: Mapped[datetime] = created()