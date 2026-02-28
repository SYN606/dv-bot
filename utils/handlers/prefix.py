from discord.ext import commands
import discord
import os

# DO NOT load dotenv here.
# It should already be loaded in your main entrypoint.

PREFIX = os.getenv("PREFIX", "dv").strip()

if not PREFIX:
    PREFIX = "dv"


# region Normalize prefix usage
def normalize_prefix(content: str) -> str:
    """
    Normalizes:
    dv ping   -> dvping
    DV   ping -> dvping
    dVping    -> dvping
    """

    if not content:
        return content

    stripped = content.lstrip()

    if not stripped.lower().startswith(PREFIX.lower()):
        return content

    rest = stripped[len(PREFIX):].lstrip()
    return f"{PREFIX}{rest}"


# region Dynamic Prefix Resolver
def dynamic_prefix(bot: commands.Bot, message: discord.Message):
    """
    Case-insensitive prefix resolver.
    Supports:
    - dv
    - DV
    - dV
    - bot mention
    """

    base_prefix = PREFIX

    if not message.content:
        return commands.when_mentioned_or(base_prefix)(bot, message)

    content = message.content.lstrip()

    # Case-insensitive match
    if content.lower().startswith(base_prefix.lower()):
        actual = content[:len(base_prefix)]
        return commands.when_mentioned_or(actual)(bot, message)

    return commands.when_mentioned_or(base_prefix)(bot, message)
