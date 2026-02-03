from discord import Message
import discord

from utils.embeds import make_embed
from utils.emojis import EMOJIS


async def handle_bot_mention(bot: discord.Client, message: Message) -> bool:
    """
    Handles direct bot mentions like:
    @DigitalVigital

    Returns True if the message was handled
    and the pipeline should stop.
    """

    # ── Safety checks
    if message.author.bot:
        return False

    if not bot.user:
        return False

    # ── Only respond to pure mention (no extra text)
    if message.content.strip() != bot.user.mention:
        return False

    latency = round(bot.latency * 1000)

    embed = make_embed(
        title="Digital Vigital",
        description=(
            f"{EMOJIS['ping']} **Latency:** {latency} ms\n"
            f"{EMOJIS['developer']} **Developer:** "
            f"[SYN](https://syn606.pages.dev)\n\n"
            f"{EMOJIS['arrow_point']} Use **/help** to explore commands\n"
            f"{EMOJIS['arrow_point']} Most features work via "
            f"**slash commands (`/`)**"),
        level="SYSTEM",
        footer="Mention me anytime for quick status",
    )

    await message.channel.send(embed=embed)
    return True
