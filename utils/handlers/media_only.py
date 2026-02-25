import discord
import re

from db.db_helpers.media_only import is_media_only
from utils.views.media_only_views import build_media_only_sticky_embed

STICKY_TAG = "MEDIA_ONLY_STICKY_NOTICE"

MEDIA_LINK_REGEX = re.compile(
    r"(tenor\.com|giphy\.com|imgur\.com|cdn\.discordapp\.com)",
    re.IGNORECASE,
)


# ─────────────────────────────────────
# Media detection
# ─────────────────────────────────────
def is_valid_media(message: discord.Message) -> bool:
    if message.attachments:
        return True

    for embed in message.embeds:
        if embed.type in ("image", "video", "gifv", "rich"):
            return True

    if message.content and MEDIA_LINK_REGEX.search(message.content):
        return True

    return False


# ─────────────────────────────────────
# Sticky helpers
# ─────────────────────────────────────
async def remove_existing_sticky(channel: discord.TextChannel) -> None:
    """
    Removes the last sticky message if present.
    Searches only recent messages for efficiency.
    """
    async for msg in channel.history(limit=15):
        if not msg.embeds:
            continue

        embed = msg.embeds[0]
        footer = embed.footer.text if embed.footer else ""

        if footer and STICKY_TAG in footer:
            try:
                await msg.delete()
            except (discord.Forbidden, discord.NotFound):
                pass
            return


async def repost_sticky(channel: discord.TextChannel) -> None:
    """
    Reposts sticky so it stays at bottom.
    """
    await remove_existing_sticky(channel)

    try:
        await channel.send(embed=build_media_only_sticky_embed())
    except discord.Forbidden:
        pass


# ─────────────────────────────────────
# MAIN ENFORCER
# ─────────────────────────────────────
async def enforce_media_only(message: discord.Message) -> bool:
    """
    Fully async media-only enforcement.
    No thread wrappers.
    """

    # Guild only
    if message.guild is None:
        return False

    # Allow bots (including sticky itself)
    if message.author.bot:
        return False

    # Proper async DB check
    media_only = await is_media_only(
        message.guild.id,
        message.channel.id,
    )

    if not media_only:
        return False

    channel = message.channel
    if not isinstance(channel, discord.TextChannel):
        return False

    # Allow Discord embed generation (GIF links)
    await discord.utils.sleep_until(discord.utils.utcnow())  # minimal yield

    try:
        refreshed = await channel.fetch_message(message.id)
    except (discord.NotFound, discord.Forbidden):
        return False

    # VALID MEDIA
    if is_valid_media(refreshed):
        await repost_sticky(channel)
        return False

    # INVALID (text-only)
    try:
        await refreshed.delete()
    except (discord.Forbidden, discord.NotFound):
        pass

    await repost_sticky(channel)
    return True
