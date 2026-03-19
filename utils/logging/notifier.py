import discord
from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS


class ModNotifier:
    """
    Central moderation DM notification system.
    Safe, reusable, and consistent across commands.
    """

    # ─────────────────────────
    # BASE SEND METHOD
    # ─────────────────────────
    @staticmethod
    async def _send(member: discord.Member, embed: discord.Embed) -> bool:
        try:
            await member.send(embed=embed)
            return True
        except discord.Forbidden:
            return False  # DMs closed
        except discord.HTTPException:
            return False

    # ─────────────────────────
    # KICK
    # ─────────────────────────
    @staticmethod
    async def notify_kick(
        member: discord.Member,
        guild_name: str,
        moderator: discord.Member,
        reason: str,
    ) -> bool:

        embed = make_embed(
            title=f"{EMOJIS['fail']} You Have Been Kicked",
            description=(
                f"{EMOJIS['arrow_point']} **Server:** {guild_name}\n"
                f"{EMOJIS['arrow_point']} **Moderator:** {moderator}\n"
                f"{EMOJIS['arrow_point']} **Reason:** {reason}"
            ),
            level="ERROR",
        )

        return await ModNotifier._send(member, embed)

    # ─────────────────────────
    # BAN
    # ─────────────────────────
    @staticmethod
    async def notify_ban(
        member: discord.Member,
        guild_name: str,
        moderator: discord.Member,
        reason: str,
    ) -> bool:

        embed = make_embed(
            title=f"{EMOJIS['ban']} You Have Been Banned",
            description=(
                f"{EMOJIS['arrow_point']} **Server:** {guild_name}\n"
                f"{EMOJIS['arrow_point']} **Moderator:** {moderator}\n"
                f"{EMOJIS['arrow_point']} **Reason:** {reason}"
            ),
            level="ERROR",
        )

        return await ModNotifier._send(member, embed)

    # ─────────────────────────
    # TIMEOUT
    # ─────────────────────────
    @staticmethod
    async def notify_timeout(
        member: discord.Member,
        guild_name: str,
        moderator: discord.Member,
        duration: str,
        reason: str,
    ) -> bool:

        embed = make_embed(
            title=f"{EMOJIS['warning']} You Have Been Timed Out",
            description=(
                f"{EMOJIS['arrow_point']} **Server:** {guild_name}\n"
                f"{EMOJIS['arrow_point']} **Duration:** {duration}\n"
                f"{EMOJIS['arrow_point']} **Moderator:** {moderator}\n"
                f"{EMOJIS['arrow_point']} **Reason:** {reason}"
            ),
            level="WARNING",
        )

        return await ModNotifier._send(member, embed)
