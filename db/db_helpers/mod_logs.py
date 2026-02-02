from sqlalchemy.orm import Session

from db.engine import SessionLocal
from db.models import ModerationLogConfig


def set_log_channel(guild_id: int, channel_id: int) -> None:
    db: Session = SessionLocal()
    try:
        row = db.query(ModerationLogConfig).filter_by(
            guild_id=guild_id).first()

        if row:
            row.channel_id = channel_id
        else:
            db.add(
                ModerationLogConfig(
                    guild_id=guild_id,
                    channel_id=channel_id,
                ))

        db.commit()
    finally:
        db.close()


def get_log_channel(guild_id: int) -> int | None:
    db: Session = SessionLocal()
    try:
        row = db.query(ModerationLogConfig).filter_by(
            guild_id=guild_id).first()
        return row.channel_id if row else None
    finally:
        db.close()
