from typing import Any, List, Optional, Tuple
from db.models import AutoResponder, AutoResponderReaction, Guild, MatchType
from tortoise.transactions import in_transaction


async def upsert_autoresponder(
    guild_id: int,
    trigger_phrase: str,
    responder_id: Optional[int] = None,
    match_type: Optional[str | MatchType] = None,
    reply_content: Optional[str] = None,
    is_embed: Optional[bool] = None,
    embed_title: Optional[str] = None,
    image_url: Optional[str] = None,
    enabled: Optional[bool] = None,
    ignore_bots: Optional[bool] = None,
    delete_trigger: Optional[bool] = None,
    cooldown: Optional[int] = None,
) -> int:
    """Creates or updates an AutoResponder entry.

    Returns the primary key (`responder_id`).
    """
    # Ensure foreign key record exists in the 'guilds' table
    await Guild.get_or_create(guild_id=guild_id)

    fields_map: dict[str, Any] = {
        "match_type": match_type,
        "reply_content": reply_content,
        "is_embed": is_embed,
        "embed_title": embed_title,
        "image_url": image_url,
        "enabled": enabled,
        "ignore_bots": ignore_bots,
        "delete_trigger": delete_trigger,
        "cooldown": cooldown,
    }

    # Filter out None values so existing fields aren't overwritten on update
    update_data = {
        key: val
        for key, val in fields_map.items() if val is not None
    }
    update_data["trigger_phrase"] = trigger_phrase

    if responder_id is not None:
        # Update existing record
        responder = await AutoResponder.get_or_none(responder_id=responder_id,
                                                    guild_id=guild_id)
        if not responder:
            raise ValueError(
                f"No autoresponder profile found tracking ID: {responder_id}")

        await responder.update_from_dict(update_data).save()
        return responder.responder_id

    # Create new record
    responder = await AutoResponder.create(guild_id=guild_id, **update_data)
    return responder.responder_id


async def add_responder_reaction(responder_id: int, emoji: str) -> None:
    """Adds a reaction emoji to an autoresponder if it doesn't already exist."""
    await AutoResponderReaction.get_or_create(responder_id=responder_id,
                                              emoji=emoji)


async def clear_responder_reactions(responder_id: int) -> None:
    """Clears all reaction emojis for a given responder ID."""
    await AutoResponderReaction.filter(responder_id=responder_id).delete()


async def get_guild_autoresponders(
        guild_id: int,
        enabled_only: bool = True) -> List[Tuple[AutoResponder, List[str]]]:
    """Fetches all autoresponders for a guild, prefetching reactions to eliminate N+1 queries."""
    query = AutoResponder.filter(guild_id=guild_id)
    if enabled_only:
        query = query.filter(enabled=True)

    # Use prefetch_related to load reactions in a single batched query
    responders = await query.prefetch_related("reactions").all()

    output: List[Tuple[AutoResponder, List[str]]] = []
    for ar in responders:
        # Access the preloaded related manager directly
        reactions = [str(r.emoji) for r in ar.reactions]
        output.append((ar, reactions))

    return output


async def delete_autoresponder(guild_id: int, responder_id: int) -> bool:
    """Deletes an autoresponder and its associated reactions within an atomic transaction."""
    responder = await AutoResponder.get_or_none(responder_id=responder_id,
                                                guild_id=guild_id)
    if not responder:
        return False

    async with in_transaction():
        await AutoResponderReaction.filter(responder_id=responder_id).delete()
        await responder.delete()

    return True


async def get_rule_by_id(rule_id: int) -> Optional[AutoResponder]:
    """Fetches a specific AutoResponder rule by its primary key ID."""
    return await AutoResponder.get_or_none(responder_id=rule_id)


async def update_autoresponder_rule(rule_id: int, guild_id: int,
                                    **kwargs) -> int:
    """Partial update helper that accepts variable kwargs and passes them to `upsert_autoresponder`."""
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
        cooldown=kwargs.get("cooldown", current_rule.cooldown),
    )
