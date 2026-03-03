from discord.ext import commands
import discord
from datetime import timedelta
import re

from utils.base_admin import BaseAdminCog
from utils.embeds import make_embed
from utils.logging.mod_log import send_mod_log

# ============================================================
# Duration Parser
# ============================================================

TIME_REGEX = re.compile(r"(\d+)([smhd])")

TIME_MULTIPLIERS = {
    "s": 1,
    "m": 60,
    "h": 3600,
    "d": 86400,
}

DEFAULT_DURATION = "10m"
MAX_TIMEOUT_SECONDS = 28 * 24 * 3600


def parse_duration(duration: str) -> int:
    matches = TIME_REGEX.findall(duration.lower())
    if not matches:
        return 0

    return sum(int(value) * TIME_MULTIPLIERS[unit] for value, unit in matches)


def format_duration(seconds: int) -> str:
    parts = []
    days, seconds = divmod(seconds, 86400)
    hours, seconds = divmod(seconds, 3600)
    minutes, seconds = divmod(seconds, 60)

    if days:
        parts.append(f"{days} day{'s' if days != 1 else ''}")
    if hours:
        parts.append(f"{hours} hour{'s' if hours != 1 else ''}")
    if minutes:
        parts.append(f"{minutes} minute{'s' if minutes != 1 else ''}")
    if seconds:
        parts.append(f"{seconds} second{'s' if seconds != 1 else ''}")

    return ", ".join(parts)


# Timeout System


class TimeoutAdmin(BaseAdminCog):

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    # Internal Helpers

    async def _cleanup(self, ctx: commands.Context):
        try:
            await ctx.message.delete()
        except (discord.Forbidden, discord.NotFound):
            pass

    async def _validate_target(self, ctx: commands.Context,
                               member: discord.Member):
        guild = ctx.guild
        moderator: discord.Member = ctx.author
        bot_member = guild.me

        if member == moderator:
            return "You cannot timeout yourself."

        if member == guild.owner:
            return "You cannot timeout the server owner."

        if moderator != guild.owner:
            if member.guild_permissions.administrator:
                return "You cannot timeout another administrator."

            if member.top_role >= moderator.top_role:
                return "You cannot timeout someone with equal or higher role."

        if bot_member is None or member.top_role >= bot_member.top_role:
            return "I cannot manage this member due to role hierarchy."

        return None

    def _validate_duration(self, duration: str) -> tuple[int, str | None]:
        seconds = parse_duration(duration)

        if seconds <= 0:
            return 0, "Use format like: 10m, 2h, 1d, 30s"

        if seconds > MAX_TIMEOUT_SECONDS:
            return 0, "Maximum timeout is 28 days."

        return seconds, None

    async def _dm_user(self, member: discord.Member, title: str,
                       description: str, level: str):
        try:
            await member.send(embed=make_embed(
                title=title,
                description=description,
                level=level,
            ))
        except discord.Forbidden:
            pass

    # TIMEOUT

    @commands.command(name="timeout")
    async def timeout_member(
        self,
        ctx: commands.Context,
        member: discord.Member = None,
        duration: str = None,
        *,
        reason: str = None,
    ):

        await self._cleanup(ctx)

        if not member:
            return await ctx.send(
                embed=make_embed(
                    title="Missing Member",
                    description="Usage: ts timeout @user [duration] [reason]",
                    level="ERROR",
                ),
                delete_after=5,
            )

        duration = duration or DEFAULT_DURATION
        reason = reason or "No reason provided"

        error = await self._validate_target(ctx, member)
        if error:
            return await ctx.send(
                embed=make_embed(
                    title="Permission Denied",
                    description=error,
                    level="ERROR",
                ),
                delete_after=5,
            )

        seconds, duration_error = self._validate_duration(duration)
        if duration_error:
            return await ctx.send(
                embed=make_embed(
                    title="Invalid Duration",
                    description=duration_error,
                    level="ERROR",
                ),
                delete_after=5,
            )

        until = discord.utils.utcnow() + timedelta(seconds=seconds)
        await member.timeout(until, reason=reason)

        human_time = format_duration(seconds)

        await self._dm_user(
            member,
            "You Have Been Timed Out",
            f"Server: {ctx.guild.name}\nDuration: {human_time}\nReason: {reason}",
            "WARNING",
        )

        await ctx.send(
            embed=make_embed(
                title="User Timed Out",
                description=
                f"{member.mention}\nDuration: {human_time}\nReason: {reason}",
                level="WARNING",
            ),
            delete_after=5,
        )

        await send_mod_log(
            guild=ctx.guild,
            category="BAN",
            title="User Timed Out",
            description=f"{member} was timed out.",
            level="WARNING",
            actor=ctx.author,
            target=member,
            extra_fields={
                "Duration": human_time,
                "Reason": reason,
            },
        )

    # UNTIMEOUT

    @commands.command(name="untimeout")
    async def untimeout_member(
        self,
        ctx: commands.Context,
        member: discord.Member = None,
        *,
        reason: str = None,
    ):

        await self._cleanup(ctx)

        if not member:
            return await ctx.send(
                embed=make_embed(
                    title="Missing Member",
                    description="Usage: ts untimeout @user [reason]",
                    level="ERROR",
                ),
                delete_after=5,
            )

        reason = reason or "No reason provided"

        if member == ctx.guild.owner:
            return await ctx.send(
                embed=make_embed(
                    title="Permission Denied",
                    description="You cannot modify the server owner.",
                    level="ERROR",
                ),
                delete_after=5,
            )

        if not member.is_timed_out():
            return await ctx.send(
                embed=make_embed(
                    title="User Not Timed Out",
                    description="This user is not currently timed out.",
                    level="ERROR",
                ),
                delete_after=5,
            )

        await member.timeout(None, reason=reason)

        await self._dm_user(
            member,
            "Your Timeout Has Been Removed",
            f"Server: {ctx.guild.name}\nReason: {reason}",
            "SUCCESS",
        )

        await ctx.send(
            embed=make_embed(
                title="Timeout Removed",
                description=f"{member.mention} has been unmuted.",
                level="SUCCESS",
            ),
            delete_after=5,
        )

        await send_mod_log(
            guild=ctx.guild,
            category="BAN",
            title="Timeout Removed",
            description=f"Timeout removed for {member}.",
            level="SUCCESS",
            actor=ctx.author,
            target=member,
            extra_fields={
                "Reason": reason,
            },
        )


async def setup(bot: commands.Bot):
    await bot.add_cog(TimeoutAdmin(bot))
