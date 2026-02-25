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
    """
    Premium mention handler.

    - Responds only to pure mentions
    - Clean status panel
    - Zero spam behaviour
    """

    # ─────────────────────────
    # Hard guards
    # ─────────────────────────
    if message.author.bot:
        return False

    if bot.user is None:
        return False

    content = message.content.strip()
    if not content:
        return False

    # Support <@id> and <@!id>
    valid_mentions = {
        bot.user.mention,
        f"<@!{bot.user.id}>",
    }

    if content not in valid_mentions:
        return False

    # ─────────────────────────
    # Build status panel
    # ─────────────────────────
    latency_ms = round(bot.latency * 1000)

    embed = make_embed(
        title="Digital Vigital • Online",
        description=(
            f"{EMOJIS['green_dot']} **Status:** Operational\n"
            f"{EMOJIS['ping']} **Latency:** `{latency_ms} ms`\n"
            f"{EMOJIS['developer']} **Developer:** "
            f"[SYN](https://syn606.pages.dev)\n\n"
            f"{EMOJIS['arrow_point']} Use **/help** to explore commands\n"
            f"{EMOJIS['arrow_point']} Modern slash architecture\n"
            f"{EMOJIS['arrow_point']} Optimized async core"),
        level="SYSTEM",
        footer="Mention me anytime for quick system status",
    )

    try:
        await message.reply(
            embed=embed,
            mention_author=False,
        )
    except discord.HTTPException:
        pass

    return True
