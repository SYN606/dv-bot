from datetime import datetime
from sqlalchemy.orm import Session

from db.engine import SessionLocal
from db.models import TempbanConfig, TempbanRecord


# ───────────────────────────────
# CONFIG (TEMPBAN ROLE)
# ───────────────────────────────
def set_tempban_role(guild_id: int, role_id: int) -> None:
    db: Session = SessionLocal()
    try:
        row = db.query(TempbanConfig).filter_by(guild_id=guild_id).first()
        if row:
            row.role_id = role_id
        else:
            db.add(TempbanConfig(
                guild_id=guild_id,
                role_id=role_id,
            ))
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
    """
    Add or re-apply a tempban.

    Design:
    - ONE row per (guild_id, user_id)
    - Re-tempban = UPDATE existing row
    - Never violates primary key
    """
    db: Session = SessionLocal()
    try:
        record = db.query(TempbanRecord).filter_by(
            guild_id=guild_id,
            user_id=user_id,
        ).first()

        if record:
            # 🔁 Re-apply / extend existing tempban
            record.moderator_id = moderator_id
            record.reason = reason
            record.expires_at = expires_at
            record.active = True
            record.created_at = datetime.utcnow()
        else:
            # 🆕 First-time tempban
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
    """
    Deactivate an active tempban.
    """
    db: Session = SessionLocal()
    try:
        record = db.query(TempbanRecord).filter_by(
            guild_id=guild_id,
            user_id=user_id,
            active=True,
        ).first()

        if not record:
            return False

        record.active = False
        db.commit()
        return True
    finally:
        db.close()


def is_tempbanned(guild_id: int, user_id: int) -> bool:
    """
    Check if user is currently tempbanned.
    """
    db: Session = SessionLocal()
    try:
        return (db.query(TempbanRecord).filter_by(
            guild_id=guild_id,
            user_id=user_id,
            active=True,
        ).count() > 0)
    finally:
        db.close()


def get_active_tempbans(guild_id: int) -> list[TempbanRecord]:
    """
    Fetch all active tempbans for a guild.
    """
    db: Session = SessionLocal()
    try:
        return db.query(TempbanRecord).filter_by(
            guild_id=guild_id,
            active=True,
        ).all()
    finally:
        db.close()
