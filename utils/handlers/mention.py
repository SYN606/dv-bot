from __future__ import annotations

import discord
from discord import Message

from utils.embeds import make_embed
from utils.emojis import EMOJIS

__all__ = ("handle_bot_mention", )


async def handle_bot_mention(
    bot: discord.Client,
    message: Message,
) -> bool:

    # Hard guards
    if message.author.bot:
        return False

    if bot.user is None:
        return False

    # message.content requires Message Content Intent
    content = message.content.strip()
    if not content:
        return False

    # Pure mention check
    if content != bot.user.mention:
        return False

    # Build response
    latency_ms = round(bot.latency * 1000)

    embed = make_embed(
        title="Digital Vigital",
        description=(
            f"{EMOJIS['ping']} **Latency:** `{latency_ms} ms`\n"
            f"{EMOJIS['developer']} **Developer:** "
            f"[SYN](https://syn606.pages.dev)\n\n"
            f"{EMOJIS['arrow_point']} Use **/help** to explore commands\n"
            f"{EMOJIS['arrow_point']} Slash-first • Prefix-light"),
        level="SYSTEM",
        footer="Mention me anytime for quick status",
    )

    await message.channel.send(embed=embed)
    return True
