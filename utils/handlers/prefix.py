# utils/prefix.py
from discord.ext import commands
import discord


def normalize_dv_prefix(content: str) -> str:
    """
    Normalizes:
    dv ping   -> dvping
    DV   ping -> dvping
    dVping    -> dvping
    """
    if not content:
        return content

    stripped = content.lstrip()

    if stripped[:2].lower() != "ts":
        return content

    rest = stripped[2:].lstrip()
    return f"ts{rest}"


def dv_prefix(bot: commands.Bot, message: discord.Message):
    """
    Prefix resolver for discord.py
    Allows: dv, DV, Dv, dV
    """
    if not message.content:
        return "ts"

    content = message.content.lstrip()

    if content[:2].lower() == "ts":
        return content[:2]

    return "ts"
