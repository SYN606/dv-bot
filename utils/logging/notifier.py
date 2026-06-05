import discord
from typing import Union
from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS


class ModNotifier:

    @staticmethod
    async def _send(member: discord.Member, embed: discord.Embed) -> bool:
        try:
            await member.send(embed=embed)
            return True
        except (discord.Forbidden, discord.HTTPException):
            return False

    @staticmethod
    async def notify_kick(member: discord.Member, guild: discord.Guild,
                          moderator: Union[discord.Member, discord.User,
                                           discord.ClientUser],
                          reason: str) -> bool:
        embed = make_embed(
            title=f"{EMOJIS['fail']} You Have Been Kicked",
            description=(
                f"{EMOJIS['arrow_point']} **Server:** {guild.name}\n"
                f"{EMOJIS['arrow_point']} **Moderator:** {moderator.mention}\n"
                f"{EMOJIS['arrow_point']} **Reason:** {reason}"),
            level="ERROR")
        return await ModNotifier._send(member, embed)

    @staticmethod
    async def notify_ban(member: discord.Member, guild: discord.Guild,
                         moderator: Union[discord.Member, discord.User,
                                          discord.ClientUser],
                         reason: str) -> bool:
        embed = make_embed(
            title=f"{EMOJIS['ban']} You Have Been Banned",
            description=(
                f"{EMOJIS['arrow_point']} **Server:** {guild.name}\n"
                f"{EMOJIS['arrow_point']} **Moderator:** {moderator.mention}\n"
                f"{EMOJIS['arrow_point']} **Reason:** {reason}"),
            level="ERROR")
        return await ModNotifier._send(member, embed)

    @staticmethod
    async def notify_timeout(member: discord.Member, guild: discord.Guild,
                             moderator: Union[discord.Member, discord.User,
                                              discord.ClientUser],
                             duration: str, reason: str) -> bool:
        embed = make_embed(
            title=f"{EMOJIS['warning']} You Have Been Timed Out",
            description=(
                f"{EMOJIS['arrow_point']} **Server:** {guild.name}\n"
                f"{EMOJIS['arrow_point']} **Duration:** {duration}\n"
                f"{EMOJIS['arrow_point']} **Moderator:** {moderator.mention}\n"
                f"{EMOJIS['arrow_point']} **Reason:** {reason}"),
            level="WARNING")
        return await ModNotifier._send(member, embed)

    @staticmethod
    async def notify_tempban(member: discord.Member, guild: discord.Guild,
                             moderator: Union[discord.Member, discord.User,
                                              discord.ClientUser],
                             duration: str, reason: str) -> bool:
        embed = make_embed(
            title=f"{EMOJIS['warning']} You Were Tempbanned",
            description=
            (f"{EMOJIS['warning']} You were tempbanned in **{guild.name}**\n\n"
             f"{EMOJIS['arrow_point']} **Moderator:** {moderator.mention}\n"
             f"{EMOJIS['arrow_point']} **Duration:** {duration}\n"
             f"{EMOJIS['arrow_point']} **Reason:** {reason}"),
            level="WARNING")
        return await ModNotifier._send(member, embed)

    # GREEN SIDEBAR EMBEDS (level="SUCCESS")

    @staticmethod
    async def notify_untempban(member: discord.Member, guild: discord.Guild,
                               moderator: Union[discord.Member, discord.User,
                                                discord.ClientUser],
                               reason: str) -> bool:
        embed = make_embed(
            title=f"{EMOJIS['success']} Tempban Removed",
            description=
            (f"{EMOJIS['success']} Your active tempban status in **{guild.name}** has been lifted.\n\n"
             f"{EMOJIS['arrow_point']} **Moderator:** {moderator.mention}\n"
             f"{EMOJIS['arrow_point']} **Reason:** {reason}"),
            level="SUCCESS")
        return await ModNotifier._send(member, embed)
