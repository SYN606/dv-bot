import discord


def basic_embed(title: str, description: str, color: int = 0x2B2D31):
    return discord.Embed(title=title, description=description, color=color)
