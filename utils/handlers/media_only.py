import discord
from db.db_helpers.media_only import is_media_only

async def enforce_media_only(message: discord.Message) -> bool:
    """
    Returns True if message was deleted.
    """
    if message.author.bot:
        return False

    if not is_media_only(message.guild.id, message.channel.id): # type: ignore
        return False

    has_media = bool(message.attachments) or bool(message.embeds)
    if not has_media:
        try:
            await message.delete()
        except Exception:
            pass
        return True

    return False
