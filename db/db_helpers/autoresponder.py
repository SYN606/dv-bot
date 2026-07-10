from typing import List, Optional, Tuple, Any
from sqlalchemy import delete, select
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.dialects.postgresql import insert as postgres_insert
from db.engine import AsyncSessionLocal, DB_TYPE
from db.models import AutoResponder, AutoResponderReaction


def build_insert_stmt(model, values: dict):
    if DB_TYPE == "postgres":
        return postgres_insert(model).values(**values)
    return sqlite_insert(model).values(**values)


async def upsert_autoresponder(guild_id: int,
                               trigger_phrase: str,
                               responder_id: Optional[int] = None,
                               match_type: Optional[str] = None,
                               reply_content: Optional[str] = None,
                               is_embed: Optional[bool] = None,
                               embed_title: Optional[str] = None,
                               image_url: Optional[str] = None,
                               enabled: Optional[bool] = None,
                               ignore_bots: Optional[bool] = None,
                               delete_trigger: Optional[bool] = None,
                               cooldown: Optional[int] = None) -> int:
    async with AsyncSessionLocal() as session:
        payload: dict[str, Any] = {
            "guild_id": guild_id,
            "trigger_phrase": trigger_phrase
        }
        update_dict: dict[str, Any] = {"trigger_phrase": trigger_phrase}

        if responder_id is not None:
            payload["responder_id"] = responder_id

        fields = {
            "match_type": match_type,
            "reply_content": reply_content,
            "is_embed": is_embed,
            "embed_title": embed_title,
            "image_url": image_url,
            "enabled": enabled,
            "ignore_bots": ignore_bots,
            "delete_trigger": delete_trigger,
            "cooldown": cooldown
        }

        for key, value in fields.items():
            if value is not None:
                payload[key] = value
                update_dict[key] = value

        base_stmt = build_insert_stmt(AutoResponder, payload)
        stmt = base_stmt.on_conflict_do_update(
            index_elements=[AutoResponder.responder_id],
            set_=update_dict).returning(AutoResponder.responder_id)
        inserted_id = await session.scalar(stmt)
        await session.commit()
        if inserted_id is None:
            raise ValueError(
                "Upsert execution failed to return a valid primary key.")
        return inserted_id


async def add_responder_reaction(responder_id: int, emoji: str) -> None:
    async with AsyncSessionLocal() as session:
        stmt = build_insert_stmt(
            AutoResponderReaction,
            {
                "responder_id": responder_id,
                "emoji": emoji
            },
        ).on_conflict_do_nothing(index_elements=[
            AutoResponderReaction.responder_id, AutoResponderReaction.emoji
        ])
        await session.execute(stmt)
        await session.commit()


async def clear_responder_reactions(responder_id: int) -> None:
    async with AsyncSessionLocal() as session:
        await session.execute(
            delete(AutoResponderReaction).where(
                AutoResponderReaction.responder_id == responder_id))
        await session.commit()


async def get_guild_autoresponders(
        guild_id: int,
        enabled_only: bool = True) -> List[Tuple[AutoResponder, List[str]]]:
    async with AsyncSessionLocal() as session:
        query = select(AutoResponder).where(AutoResponder.guild_id == guild_id)
        if enabled_only:
            query = query.where(AutoResponder.enabled == True)

        responders = list(await session.scalars(query))
        output: List[Tuple[AutoResponder, List[str]]] = []

        for ar in responders:
            reactions = list(await session.scalars(
                select(AutoResponderReaction.emoji).where(
                    AutoResponderReaction.responder_id == ar.responder_id)))
            output.append((ar, reactions))

        return output


async def delete_autoresponder(guild_id: int, responder_id: int) -> bool:
    async with AsyncSessionLocal() as session:
        exists = await session.scalar(
            select(AutoResponder.responder_id).where(
                AutoResponder.responder_id == responder_id,
                AutoResponder.guild_id == guild_id))
        if not exists:
            return False

        await session.execute(
            delete(AutoResponderReaction).where(
                AutoResponderReaction.responder_id == responder_id))
        await session.execute(
            delete(AutoResponder).where(
                AutoResponder.responder_id == responder_id))

        await session.commit()
        return True



async def get_rule_by_id(rule_id: int) -> Optional[AutoResponder]:
    async with AsyncSessionLocal() as session:
        return await session.scalar(
            select(AutoResponder).where(AutoResponder.responder_id == rule_id))


async def update_autoresponder_rule(rule_id: int, guild_id: int,
                                    **kwargs) -> int:
    current_rule = await get_rule_by_id(rule_id)
    if not current_rule:
        raise ValueError(
            f"No autoresponder profile found tracking primary target key ID: {rule_id}"
        )

    trigger_phrase = kwargs.pop("trigger_phrase", current_rule.trigger_phrase)
    match_type = kwargs.pop("match_type", current_rule.match_type)

    return await upsert_autoresponder(
        guild_id=guild_id,
        responder_id=rule_id,
        trigger_phrase=trigger_phrase,
        match_type=match_type,
        reply_content=kwargs.get("reply_content", current_rule.reply_content),
        is_embed=kwargs.get("is_embed", current_rule.is_embed),
        embed_title=kwargs.get("embed_title", current_rule.embed_title),
        image_url=kwargs.get("image_url", current_rule.image_url),
        enabled=kwargs.get("enabled", current_rule.enabled),
        ignore_bots=kwargs.get("ignore_bots", current_rule.ignore_bots),
        delete_trigger=kwargs.get("delete_trigger",
                                  current_rule.delete_trigger),
        cooldown=kwargs.get("cooldown", current_rule.cooldown))
