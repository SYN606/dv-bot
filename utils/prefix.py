from discord.ext import commands
import discord

def dv_prefix(bot: commands.Bot, message: discord.Message):
    if not message.content:
        return "dv"

    content = message.content.lstrip()
    if content[:2].lower() == "dv":
        return content[:2]  # preserves DV / dV / Dv

    return "dv"
