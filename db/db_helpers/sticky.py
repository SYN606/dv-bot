from typing import Optional
from db.engine import SessionLocal
from db.models import StickyMessage

THRESHOLD = 1


def set_sticky(guild_id: int, channel_id: int, content: str):
    with SessionLocal() as session:
        sticky = session.get(StickyMessage, (guild_id, channel_id))

        if sticky:
            sticky.content = content
            sticky.counter = 0
            sticky.last_message_id = None
        else:
            session.add(
                StickyMessage(
                    guild_id=guild_id,
                    channel_id=channel_id,
                    content=content,
                    counter=0,
                    last_message_id=None,
                ))

        session.commit()


def remove_sticky(guild_id: int, channel_id: int) -> bool:
    with SessionLocal() as session:
        sticky = session.get(StickyMessage, (guild_id, channel_id))
        if not sticky:
            return False

        session.delete(sticky)
        session.commit()
        return True


def get_sticky(guild_id: int, channel_id: int) -> Optional[str]:
    with SessionLocal() as session:
        sticky = session.get(StickyMessage, (guild_id, channel_id))
        return sticky.content if sticky else None


def increment_and_check(
    guild_id: int,
    channel_id: int,
) -> tuple[bool, int | None]:
    """
    Increments counter and returns:
    (should_repost, last_message_id)
    """
    with SessionLocal() as session:
        sticky = session.get(StickyMessage, (guild_id, channel_id))
        if not sticky:
            return False, None

        sticky.counter += 1

        if sticky.counter < THRESHOLD:
            session.commit()
            return False, sticky.last_message_id

        sticky.counter = 0
        last_id = sticky.last_message_id
        sticky.last_message_id = None
        session.commit()
        return True, last_id


def update_last_message(
    guild_id: int,
    channel_id: int,
    message_id: int,
):
    with SessionLocal() as session:
        sticky = session.get(StickyMessage, (guild_id, channel_id))
        if sticky:
            sticky.last_message_id = message_id
            session.commit()
