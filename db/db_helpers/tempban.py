from datetime import datetime
from sqlalchemy.orm import Session

from db.engine import SessionLocal
from db.models import TempbanConfig, TempbanRecord


# ───────────────────────────────
# CONFIG
# ───────────────────────────────
def set_tempban_role(guild_id: int, role_id: int) -> None:
    db: Session = SessionLocal()
    try:
        row = db.query(TempbanConfig).filter_by(guild_id=guild_id).first()
        if row:
            row.role_id = role_id
        else:
            db.add(TempbanConfig(guild_id=guild_id, role_id=role_id))
        db.commit()
    finally:
        db.close()


def get_tempban_role(guild_id: int) -> int | None:
    db: Session = SessionLocal()
    try:
        row = db.query(TempbanConfig).filter_by(guild_id=guild_id).first()
        return row.role_id if row else None
    finally:
        db.close()


# ───────────────────────────────
# TEMPBAN ACTIONS
# ───────────────────────────────
def add_tempban(
    *,
    guild_id: int,
    user_id: int,
    moderator_id: int,
    reason: str | None = None,
    expires_at: datetime | None = None,
) -> None:
    db: Session = SessionLocal()
    try:
        # deactivate old tempban if exists
        old = db.query(TempbanRecord).filter_by(
            guild_id=guild_id,
            user_id=user_id,
            active=True,
        ).first()

        if old:
            old.active = False

        db.add(
            TempbanRecord(
                guild_id=guild_id,
                user_id=user_id,
                moderator_id=moderator_id,
                reason=reason,
                expires_at=expires_at,
                active=True,
            ))
        db.commit()
    finally:
        db.close()


def remove_tempban(
    *,
    guild_id: int,
    user_id: int,
    moderator_id: int,
) -> bool:
    db: Session = SessionLocal()
    try:
        row = db.query(TempbanRecord).filter_by(
            guild_id=guild_id,
            user_id=user_id,
            active=True,
        ).first()

        if not row:
            return False

        row.active = False
        db.commit()
        return True
    finally:
        db.close()


def is_tempbanned(guild_id: int, user_id: int) -> bool:
    db: Session = SessionLocal()
    try:
        return db.query(TempbanRecord).filter_by(
            guild_id=guild_id,
            user_id=user_id,
            active=True,
        ).count() > 0
    finally:
        db.close()


def get_active_tempbans(guild_id: int) -> list[TempbanRecord]:
    db: Session = SessionLocal()
    try:
        return db.query(TempbanRecord).filter_by(
            guild_id=guild_id,
            active=True,
        ).all()
    finally:
        db.close()
