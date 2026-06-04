import os
import discord
from discord.ext import commands

PREFIX = (os.getenv("PREFIX", "dv").strip())
if not PREFIX:
    PREFIX = "dv"
PREFIX_LOWER = PREFIX.lower()


def normalize_prefix(content: str, ) -> str:
    if not content:
        return content
    stripped = content.lstrip()
    lowered = stripped.lower()
    if not lowered.startswith(PREFIX_LOWER):
        return content
    rest = stripped[len(PREFIX)::].lstrip()
    return (f"{PREFIX}{rest}")


def dynamic_prefix(bot: commands.Bot, message: discord.Message):
    if not message.content:
        return commands.when_mentioned_or(PREFIX)(bot, message)
    content = (message.content.lstrip())
    lowered = content.lower()

    # exact prefix match
    if lowered.startswith(PREFIX_LOWER):
        actual_prefix = content[:len(PREFIX)]
        return commands.when_mentioned_or(actual_prefix)(bot, message)

    return commands.when_mentioned_or(PREFIX)(bot, message)


async def preprocess_message(bot: commands.Bot,
                             message: discord.Message) -> discord.Message:

    if (not message.content or message.author.bot):
        return message

    normalized = normalize_prefix(message.content)
    if normalized == message.content:
        return message
    message.content = normalized
    return message
