from discord.ext import commands
import discord
import os
from dotenv import load_dotenv

# Load .env file
load_dotenv()

# Get prefix (fallback to "dv" if missing)
PREFIX = os.getenv("PREFIX", "dv").strip()


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


def dynamic_prefix(bot: commands.Bot, message: discord.Message):
    """
    Case-insensitive prefix resolver.
    Allows: dv, DV, Dv, dV (or whatever is in .env)
    """

    if not message.content:
        return PREFIX

    content = message.content.lstrip()

    if content.lower().startswith(PREFIX.lower()):
        return content[:len(PREFIX)]

    return PREFIX
