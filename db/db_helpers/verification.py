from sqlalchemy.orm import Session

from db.engine import SessionLocal
from db.models import VerificationConfig


# ─────────────────────────────────────
# CONFIG MANAGEMENT
# ─────────────────────────────────────
def set_verification_config(
    *,
    guild_id: int,
    verify_channel_id: int,
    log_channel_id: int,
    verified_role_id: int,
    unverified_role_id: int | None,
) -> None:
    db: Session = SessionLocal()
    try:
        row = db.query(VerificationConfig).filter_by(guild_id=guild_id).first()

        if row:
            row.verify_channel_id = verify_channel_id
            row.log_channel_id = log_channel_id
            row.verified_role_id = verified_role_id
            row.unverified_role_id = unverified_role_id
        else:
            db.add(
                VerificationConfig(
                    guild_id=guild_id,
                    verify_channel_id=verify_channel_id,
                    log_channel_id=log_channel_id,
                    verified_role_id=verified_role_id,
                    unverified_role_id=unverified_role_id,
                ))

        db.commit()
    finally:
        db.close()


def get_verification_config(guild_id: int) -> VerificationConfig | None:
    db: Session = SessionLocal()
    try:
        return db.query(VerificationConfig).filter_by(
            guild_id=guild_id).first()
    finally:
        db.close()


def is_verification_configured(guild_id: int) -> bool:
    db: Session = SessionLocal()
    try:
        return db.query(VerificationConfig).filter_by(
            guild_id=guild_id).count() > 0
    finally:
        db.close()


def delete_verification_config(guild_id: int) -> bool:
    db: Session = SessionLocal()
    try:
        row = db.query(VerificationConfig).filter_by(guild_id=guild_id).first()

        if not row:
            return False

        db.delete(row)
        db.commit()
        return True
    finally:
        db.close()
