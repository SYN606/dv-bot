from discord.ext import commands

def is_admin(ctx) -> bool:
    return ctx.author.guild_permissions.administrator
