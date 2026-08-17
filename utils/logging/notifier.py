import discord

from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS


class ModNotifier:
    """Helper class to send standardized Direct Message (DM) notifications for moderation actions."""

    @staticmethod
    async def _send(user: discord.User | discord.Member,
                    embed: discord.Embed) -> bool:
        """Helper method to handle sending embeds via direct message safely."""
        try:
            await user.send(embed=embed)
            return True
        except (discord.Forbidden, discord.HTTPException):
            return False

    @staticmethod
    async def notify_kick(
        member: discord.User | discord.Member,
        guild: discord.Guild,
        moderator: discord.Member | discord.User | discord.ClientUser,
        reason: str,
    ) -> bool:
        """Notify a user that they have been kicked from a guild."""
        embed = make_embed(
            title=f"{EMOJIS['fail']} You Have Been Kicked",
            description=(
                f"{EMOJIS['arrow_point']} **Server:** {guild.name}\n"
                f"{EMOJIS['arrow_point']} **Moderator:** {moderator.mention}\n"
                f"{EMOJIS['arrow_point']} **Reason:** {reason}"),
            level="ERROR",
        )
        return await ModNotifier._send(member, embed)

    @staticmethod
    async def notify_ban(
        member: discord.User | discord.Member,
        guild: discord.Guild,
        moderator: discord.Member | discord.User | discord.ClientUser,
        reason: str,
    ) -> bool:
        """Notify a user that they have been permanently banned from a guild."""
        embed = make_embed(
            title=f"{EMOJIS['ban']} You Have Been Banned",
            description=(
                f"{EMOJIS['arrow_point']} **Server:** {guild.name}\n"
                f"{EMOJIS['arrow_point']} **Moderator:** {moderator.mention}\n"
                f"{EMOJIS['arrow_point']} **Reason:** {reason}"),
            level="ERROR",
        )
        return await ModNotifier._send(member, embed)

    @staticmethod
    async def notify_timeout(
        member: discord.User | discord.Member,
        guild: discord.Guild,
        moderator: discord.Member | discord.User | discord.ClientUser,
        duration: str,
        reason: str,
    ) -> bool:
        """Notify a user that they have been timed out in a guild."""
        embed = make_embed(
            title=f"{EMOJIS['warning']} You Have Been Timed Out",
            description=(
                f"{EMOJIS['arrow_point']} **Server:** {guild.name}\n"
                f"{EMOJIS['arrow_point']} **Duration:** {duration}\n"
                f"{EMOJIS['arrow_point']} **Moderator:** {moderator.mention}\n"
                f"{EMOJIS['arrow_point']} **Reason:** {reason}"),
            level="WARNING",
        )
        return await ModNotifier._send(member, embed)

    @staticmethod
    async def notify_tempban(
        member: discord.User | discord.Member,
        guild: discord.Guild,
        moderator: discord.Member | discord.User | discord.ClientUser,
        duration: str,
        reason: str,
    ) -> bool:
        """Notify a user that they have been temporarily banned from a guild."""
        embed = make_embed(
            title=f"{EMOJIS['warning']} You Were Tempbanned",
            description=
            (f"{EMOJIS['warning']} You were tempbanned in **{guild.name}**\n\n"
             f"{EMOJIS['arrow_point']} **Moderator:** {moderator.mention}\n"
             f"{EMOJIS['arrow_point']} **Duration:** {duration}\n"
             f"{EMOJIS['arrow_point']} **Reason:** {reason}"),
            level="WARNING",
        )
        return await ModNotifier._send(member, embed)

    @staticmethod
    async def notify_untempban(
        member: discord.User | discord.Member,
        guild: discord.Guild,
        moderator: discord.Member | discord.User | discord.ClientUser,
        reason: str,
    ) -> bool:
        """Notify a user that their temporary ban has been lifted."""
        embed = make_embed(
            title=f"{EMOJIS['success']} Tempban Removed",
            description=
            (f"{EMOJIS['success']} Your active tempban status in **{guild.name}** has been lifted.\n\n"
             f"{EMOJIS['arrow_point']} **Moderator:** {moderator.mention}\n"
             f"{EMOJIS['arrow_point']} **Reason:** {reason}"),
            level="SUCCESS",
        )
        return await ModNotifier._send(member, embed)
