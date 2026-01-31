import time
from typing import Optional

from db.engine import SessionLocal
from db.models import AFK


def set_afk(guild_id: int, user_id: int, reason: str) -> None:
    """
    Set or update AFK status for a user in a guild.
    """
    now = int(time.time())

    with SessionLocal() as session:
        afk = session.get(AFK, (guild_id, user_id))

        if afk:
            afk.reason = reason
            afk.since = now
        else:
            session.add(
                AFK(guild_id=guild_id,
                    user_id=user_id,
                    reason=reason,
                    since=now))

        session.commit()


def remove_afk(guild_id: int, user_id: int) -> Optional[AFK]:
    """
    Remove AFK status and return the AFK record if it existed.
    """
    with SessionLocal() as session:
        afk = session.get(AFK, (guild_id, user_id))

        if not afk:
            return None

        session.delete(afk)
        session.commit()
        return afk


def get_afk(guild_id: int, user_id: int) -> Optional[AFK]:
    """
    Get AFK status for a user in a guild.
    """
    with SessionLocal() as session:
        return session.get(AFK, (guild_id, user_id))
