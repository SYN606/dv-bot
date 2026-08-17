from __future__ import annotations

import logging
import re
from datetime import timedelta
from typing import Optional, Tuple, Union

import discord
from discord import app_commands
from discord.ext import commands

from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS
from utils.logging.mod_log import send_mod_log
from utils.permissions.base_admin import BaseAdminCog

logger = logging.getLogger("DigitalVigital")

TIME_REGEX = re.compile(r"(\d+)([smhd])")
TIME_MULTIPLIERS = {"s": 1, "m": 60, "h": 3600, "d": 86400}

DEFAULT_DURATION = "10m"
MAX_TIMEOUT_SECONDS = 28 * 24 * 3600


def parse_duration(duration: str) -> int:
    """Parse time string like '10m', '1h30m', '1d' into total seconds."""
    matches = TIME_REGEX.findall(duration.lower())
    if not matches:
        return 0
    return sum(int(value) * TIME_MULTIPLIERS[unit] for value, unit in matches)


def format_duration(seconds: int) -> str:
    """Format total seconds into human-readable duration strings."""
    parts = []
    days, seconds = divmod(seconds, 86400)
    hours, seconds = divmod(seconds, 3600)
    minutes, seconds = divmod(seconds, 60)

    if days:
        parts.append(f"{days}d")
    if hours:
        parts.append(f"{hours}h")
    if minutes:
        parts.append(f"{minutes}m")
    if seconds:
        parts.append(f"{seconds}s")

    return " ".join(parts) or "0s"


class TimeoutAdmin(BaseAdminCog):
    """Cog for managing Discord member timeouts (mutes)."""

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    async def has_timeout_permission(self, member: discord.Member) -> bool:
        """Check if the executing member has permissions to issue timeouts."""
        guild = member.guild
        if member.id == guild.owner_id:
            return True

        perms = member.guild_permissions
        if perms.administrator:
            return True

        return perms.moderate_members

    async def _reply(
        self,
        ctx: commands.Context,
        *,
        title: str,
        description: str,
        level: str = "ERROR",
        show_footer: bool = False,
    ) -> Optional[discord.Message]:
        """Send a standardized response embed handling slash and prefix interactions."""
        embed = make_embed(title=title, description=description, level=level)

        if show_footer:
            embed.set_footer(
                text=f"Action by : {ctx.author}",
                icon_url=ctx.author.display_avatar.url,
            )

        try:
            if ctx.interaction:
                interaction = ctx.interaction
                if interaction.response.is_done():
                    await interaction.followup.send(
                        embed=embed,
                        ephemeral=True,
                    )
                else:
                    await interaction.response.send_message(
                        embed=embed,
                        ephemeral=True,
                    )
                return None

            try:
                return await ctx.reply(embed=embed, mention_author=False)
            except (discord.NotFound, discord.HTTPException):
                return await ctx.channel.send(embed=embed)
        except discord.HTTPException as exc:
            logger.error("Failed sending response embed in Timeout system: %s",
                         exc)
            return None

    async def _cleanup(self, ctx: commands.Context) -> None:
        """Safely delete command invocation message where applicable."""
        if ctx.interaction:
            return
        try:
            if ctx.message:
                await ctx.message.delete()
        except (discord.Forbidden, discord.NotFound, discord.HTTPException):
            pass

    async def resolve_member(
        self,
        ctx: commands.Context,
        value: Union[discord.Member, discord.User, str, None],
    ) -> Optional[discord.Member]:
        """Resolve command target into a guild member."""
        guild = ctx.guild
        if guild is None:
            return None

        if isinstance(value, discord.Member):
            return value

        if isinstance(value, discord.User):
            return guild.get_member(value.id)

        if not value:
            if (ctx.message and ctx.message.reference and isinstance(
                    ctx.message.reference.resolved, discord.Message)):
                author = ctx.message.reference.resolved.author
                if isinstance(author, discord.Member):
                    return author
                return guild.get_member(author.id)

        if ctx.message and ctx.message.mentions:
            mention = ctx.message.mentions[0]
            if isinstance(mention, discord.Member):
                return mention
            return guild.get_member(mention.id)

        if value:
            try:
                return await commands.MemberConverter().convert(
                    ctx, str(value))
            except commands.BadArgument:
                return None

        return None

    async def validate_target(
        self,
        *,
        moderator: discord.Member,
        target: discord.Member,
    ) -> Tuple[bool, Optional[str]]:
        """Validate if the moderator and bot can apply timeout restrictions on the target."""
        guild = moderator.guild
        bot_member = guild.me

        if bot_member is None:
            return False, "Bot member unavailable."
        if target.bot:
            return False, "You cannot timeout bots."
        if target.id == moderator.id:
            return False, "You cannot timeout yourself."
        if target.id == guild.owner_id:
            return False, "You cannot timeout the server owner."
        if target.id == bot_member.id:
            return False, "You cannot timeout me."
        if not bot_member.guild_permissions.moderate_members:
            return False, "I need `Moderate Members` permission."
        if moderator != guild.owner and target.guild_permissions.administrator:
            return False, "You cannot timeout another administrator."
        if moderator != guild.owner and target.top_role >= moderator.top_role:
            return False, "Target has an equal or higher role than you."
        if target.top_role >= bot_member.top_role:
            return False, "I cannot manage this user due to role hierarchy."

        return True, None

    async def send_timeout_dm(
        self,
        *,
        target: discord.Member,
        guild: discord.Guild,
        moderator: discord.Member,
        duration: str,
        reason: str,
    ) -> None:
        """Send DM notification to the timed-out user."""
        try:
            description = (
                f"{EMOJIS.get('warning', '⚠️')} You were timed out in **{guild.name}**\n\n"
                f"{EMOJIS.get('arrow_point', '➡️')} **Moderator:** {moderator}\n"
                f"{EMOJIS.get('arrow_point', '➡️')} **Duration:** {duration}")
            if reason != "No reason provided":
                description += (
                    f"\n{EMOJIS.get('arrow_point', '➡️')} **Reason:** {reason}"
                )

            embed = make_embed(
                title="You Were Timed Out",
                description=description,
                level="WARNING",
            )
            await target.send(embed=embed)
        except (discord.Forbidden, discord.HTTPException):
            pass

    @commands.hybrid_command(
        name="timeout",
        aliases=["to", "mute"],
        description="Timeout a member in the server.",
    )
    @commands.guild_only()
    @app_commands.describe(
        member="User to timeout (Mention, ID, or Reply)",
        duration="Example: 10m, 2h, 1d (Max 28d)",
        reason="Reason for the timeout",
    )
    async def timeout_member(
        self,
        ctx: commands.Context,
        member: Optional[discord.User] = None,
        duration: str = DEFAULT_DURATION,
        *,
        reason: str = "No reason provided",
    ) -> None:
        """Timeout a member for a given duration."""
        guild = ctx.guild
        if guild is None:
            return

        moderator = ctx.author
        if not isinstance(moderator, discord.Member):
            return

        if not await self.has_timeout_permission(moderator):
            await self._reply(
                ctx,
                title="Permission Denied",
                description=
                f"{EMOJIS.get('fail', '❌')} You do not have permission to use this command.",
            )
            return

        target = await self.resolve_member(ctx, member)
        if target is None:
            prefix = ctx.clean_prefix
            await self._reply(
                ctx,
                title="Invalid Member",
                description=
                f"Provide a valid member or reply to a message.\nUsage: `{prefix}timeout <member> [duration] [reason]`",
            )
            return

        valid, error = await self.validate_target(moderator=moderator,
                                                  target=target)
        if not valid:
            await self._reply(
                ctx,
                title="Permission Denied",
                description=error or "Invalid target.",
            )
            return

        seconds = parse_duration(duration)
        if seconds <= 0 or seconds > MAX_TIMEOUT_SECONDS:
            await self._reply(
                ctx,
                title="Invalid Duration",
                description=
                "Use a valid duration (max 28d). Example: `10m`, `2h`, `1d`.",
            )
            return

        human_duration = format_duration(seconds)
        until = discord.utils.utcnow() + timedelta(seconds=seconds)

        await self.send_timeout_dm(
            target=target,
            guild=guild,
            moderator=moderator,
            duration=human_duration,
            reason=reason,
        )

        try:
            await target.timeout(until,
                                 reason=f"{reason} | Timed out by {moderator}")
        except discord.Forbidden:
            await self._reply(
                ctx,
                title="Permission Error",
                description=
                "I cannot timeout this user due to hierarchy permissions.",
            )
            return
        except discord.HTTPException:
            await self._reply(
                ctx,
                title="Timeout Failed",
                description="Failed to timeout the user.",
            )
            return

        await self._reply(
            ctx,
            title="User Timed Out",
            description=
            (f"{EMOJIS.get('warning', '⚠️')} {target.mention}\n\n"
             f"{EMOJIS.get('arrow_point', '➡️')} **Duration:** {human_duration}\n"
             f"{EMOJIS.get('arrow_point', '➡️')} **Reason:** {reason}"),
            level="WARNING",
            show_footer=True,
        )

        await self._cleanup(ctx)

        try:
            await send_mod_log(
                guild=guild,
                category="MODERATION",
                title="User Timed Out",
                description=f"{moderator.mention} timed out {target.mention}",
                level="WARNING",
                actor=moderator,
                target=target,
                extra_fields={
                    "Duration": human_duration,
                    "Reason": reason,
                    "Expires At": f"<t:{int(until.timestamp())}:F>",
                },
            )
        except Exception as exc:
            logger.error("Failed sending mod log for timeout: %s", exc)

    @commands.hybrid_command(
        name="untimeout",
        aliases=["unto", "unmute"],
        description="Remove timeout from a member.",
    )
    @commands.guild_only()
    @app_commands.describe(
        member="User to untimeout (Mention, ID, or Reply)",
        reason="Reason for removing timeout",
    )
    async def untimeout_member(
        self,
        ctx: commands.Context,
        member: Optional[discord.User] = None,
        *,
        reason: str = "No reason provided",
    ) -> None:
        """Remove an active timeout from a member."""
        guild = ctx.guild
        if guild is None:
            return

        moderator = ctx.author
        if not isinstance(moderator, discord.Member):
            return

        if not await self.has_timeout_permission(moderator):
            await self._reply(
                ctx,
                title="Permission Denied",
                description=
                f"{EMOJIS.get('fail', '❌')} You do not have permission to use this command.",
            )
            return

        target = await self.resolve_member(ctx, member)
        if target is None:
            prefix = ctx.clean_prefix
            await self._reply(
                ctx,
                title="Invalid Member",
                description=
                f"Provide a valid member.\nUsage: `{prefix}untimeout <member> [reason]`",
            )
            return

        if not target.is_timed_out():
            await self._reply(
                ctx,
                title="Not Timed Out",
                description="This user is not currently timed out.",
            )
            return

        valid, error = await self.validate_target(moderator=moderator,
                                                  target=target)
        if not valid:
            await self._reply(
                ctx,
                title="Permission Denied",
                description=error or "Invalid target.",
            )
            return

        try:
            await target.timeout(
                None, reason=f"{reason} | Timeout removed by {moderator}")
        except discord.Forbidden:
            await self._reply(
                ctx,
                title="Permission Error",
                description=
                "Cannot remove timeout from this user due to role hierarchy.",
            )
            return
        except discord.HTTPException:
            await self._reply(
                ctx,
                title="Timeout Removal Failed",
                description="Failed to remove timeout from the user.",
            )
            return

        await self._reply(
            ctx,
            title="Timeout Removed",
            description=(
                f"{EMOJIS.get('success', '✅')} {target.mention}\n\n"
                f"{EMOJIS.get('arrow_point', '➡️')} **Reason:** {reason}"),
            level="SUCCESS",
            show_footer=True,
        )

        await self._cleanup(ctx)

        try:
            await send_mod_log(
                guild=guild,
                category="MODERATION",
                title="Timeout Removed",
                description=
                f"{moderator.mention} removed timeout from {target.mention}",
                level="SUCCESS",
                actor=moderator,
                target=target,
                extra_fields={"Reason": reason},
            )
        except Exception as exc:
            logger.error("Failed sending mod log for untimeout: %s", exc)


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(TimeoutAdmin(bot))
