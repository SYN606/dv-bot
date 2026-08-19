from __future__ import annotations

import logging
from typing import Optional
import discord

logger = logging.getLogger("bot")

WEBHOOK_NAME = "DV Sticky Manager"


async def get_or_create_sticky_webhook(
    channel: discord.TextChannel, ) -> Optional[discord.Webhook]:
    """Retrieves an existing sticky webhook or creates a new one for the channel."""
    bot_member = channel.guild.me
    if not channel.permissions_for(bot_member).manage_webhooks:
        return None

    try:
        webhooks = await channel.webhooks()
        for wh in webhooks:
            if wh.name == WEBHOOK_NAME and wh.user == channel.guild.me:
                return wh

        # Create new webhook if none exists
        avatar_bytes = None
        if channel.guild.me.display_avatar:
            try:
                avatar_bytes = await channel.guild.me.display_avatar.read()
            except Exception:
                pass

        return await channel.create_webhook(
            name=WEBHOOK_NAME,
            avatar=avatar_bytes,
            reason="Automated Sticky Message System")
    except (discord.Forbidden, discord.HTTPException) as exc:
        logger.warning("Failed to manage webhook in channel %s: %s",
                       channel.id, exc)
        return None


async def remove_sticky_webhook(channel: discord.TextChannel) -> None:
    """Deletes the sticky webhook for a channel when stickies are disabled."""
    bot_member = channel.guild.me
    if not channel.permissions_for(bot_member).manage_webhooks:
        return

    try:
        webhooks = await channel.webhooks()
        for wh in webhooks:
            if wh.name == WEBHOOK_NAME and wh.user == channel.guild.me:
                await wh.delete(reason="Sticky message feature disabled.")
                break
    except (discord.Forbidden, discord.HTTPException) as exc:
        logger.warning("Failed to delete sticky webhook in channel %s: %s",
                       channel.id, exc)
