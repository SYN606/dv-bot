from discord import Message
from utils.embeds import make_embed
from db.db_helpers.afk import get_afk, remove_afk


async def handle_afk(message: Message):
    for user in message.mentions:
        afk = get_afk(message.guild.id, user.id)
        if afk:
            embed = make_embed(
                title="User is AFK",
                description=(f"{user.mention} is currently AFK.\n"
                             f"Reason: {afk.reason}\n"
                             f"Since: <t:{afk.since}:R>"),
                level="INFO",
            )
            await message.channel.send(embed=embed)

    removed = remove_afk(
        guild_id=message.guild.id,
        user_id=message.author.id,
    )

    if removed:
        embed = make_embed(
            title="AFK Removed",
            description=("Welcome back. You are no longer marked as AFK.\n"
                         f"AFK duration: <t:{removed.since}:R>"),
            level="INFO",
        )
        await message.channel.send(embed=embed)
