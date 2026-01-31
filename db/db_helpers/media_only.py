from typing import Optional
from db.engine import SessionLocal
from db.models import MediaOnlyChannel


def enable_media_only(guild_id: int, channel_id: int) -> bool:
    with SessionLocal() as session:
        exists = session.get(MediaOnlyChannel, (guild_id, channel_id))
        if exists:
            return False

        session.add(
            MediaOnlyChannel(
                guild_id=guild_id,
                channel_id=channel_id,
            ))
        session.commit()
        return True


def disable_media_only(guild_id: int, channel_id: int) -> bool:
    with SessionLocal() as session:
        row = session.get(MediaOnlyChannel, (guild_id, channel_id))
        if not row:
            return False

        session.delete(row)
        session.commit()
        return True


def is_media_only(guild_id: int, channel_id: int) -> bool:
    with SessionLocal() as session:
        return session.get(
            MediaOnlyChannel,
            (guild_id, channel_id),
        ) is not None
