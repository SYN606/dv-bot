import discord
from discord.ext import commands
from discord import app_commands
from datetime import timedelta
import re

from utils.permissions.base_admin import BaseAdminCog
from utils.core.embeds import make_embed
from utils.logging.mod_log import send_mod_log
from utils.logging.notifier import ModNotifier

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
    return sum(int(v) * TIME_MULTIPLIERS[u] for v, u in matches)


def format_duration(seconds: int) -> str:
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

    return " ".join(parts)


class TimeoutAdmin(BaseAdminCog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    # =========================================================
    # MEMBER RESOLVER (ID / mention / reply)
    # =========================================================
    async def resolve_member(self, ctx, member_input):
        if isinstance(member_input, discord.Member):
            return member_input

        # reply support
        ref = ctx.message.reference
        if not member_input and ref:
            if isinstance(ref.resolved, discord.Message):
                return ctx.guild.get_member(ref.resolved.author.id)

        # try converter
        if member_input:
            try:
                return await commands.MemberConverter().convert(ctx, member_input)
            except commands.BadArgument:
                return None

        return None

    async def _cleanup(self, ctx):
        try:
            await ctx.message.delete()
        except Exception:
            pass

    async def _validate_target(self, ctx, member):
        guild = ctx.guild
        moderator = ctx.author
        bot_member = guild.me

        if not member:
            return "Invalid member."

        if member == moderator:
            return "You cannot timeout yourself."

        if member == guild.owner:
            return "You cannot timeout the server owner."

        if not bot_member.guild_permissions.moderate_members:
            return "I do not have permission to timeout members."

        if moderator != guild.owner:
            if member.guild_permissions.administrator:
                return "You cannot timeout another administrator."

            if member.top_role >= moderator.top_role:
                return "You cannot timeout someone with equal or higher role."

        if bot_member.top_role <= member.top_role:
            return "I cannot manage this member due to role hierarchy."

        return None

    def _validate_duration(self, duration: str):
        seconds = parse_duration(duration)

        if seconds <= 0:
            return 0, "Use format like: 10m, 2h, 1d"

        if seconds > MAX_TIMEOUT_SECONDS:
            return 0, "Maximum timeout is 28 days."

        return seconds, None

    # =========================================================
    # HYBRID COMMAND (prefix + slash)
    # =========================================================
    @commands.hybrid_command(name="timeout", description="Timeout a member")
    @app_commands.describe(
        member="User to timeout",
        duration="Example: 10m, 2h, 1d",
        reason="Reason for timeout"
    )
    async def timeout_member(
        self,
        ctx: commands.Context,
        member: str = None,
        duration: str = DEFAULT_DURATION,
        *,
        reason: str = "No reason provided"
    ):
        if ctx.interaction is None:
            await self._cleanup(ctx)

        member = await self.resolve_member(ctx, member)

        if not member:
            return await ctx.send(
                embed=make_embed(
                    title="Invalid Member",
                    description="Provide a valid user or reply to a message.",
                    level="ERROR",
                ),
                ephemeral=True if ctx.interaction else False,
                delete_after=5 if not ctx.interaction else None,
            )

        error = await self._validate_target(ctx, member)
        if error:
            return await ctx.send(
                embed=make_embed(
                    title="Permission Denied",
                    description=error,
                    level="ERROR",
                ),
                ephemeral=True if ctx.interaction else False,
            )

        seconds, err = self._validate_duration(duration)
        if err:
            return await ctx.send(
                embed=make_embed(
                    title="Invalid Duration",
                    description=err,
                    level="ERROR",
                ),
                ephemeral=True if ctx.interaction else False,
            )

        until = discord.utils.utcnow() + timedelta(seconds=seconds)

        try:
            await member.timeout(until, reason=reason)
        except discord.Forbidden:
            return await ctx.send(
                embed=make_embed(
                    title="Action Failed",
                    description="Missing permissions.",
                    level="ERROR",
                ),
                ephemeral=True if ctx.interaction else False,
            )
        except discord.HTTPException:
            return await ctx.send(
                embed=make_embed(
                    title="Error",
                    description="Failed to apply timeout.",
                    level="ERROR",
                ),
                ephemeral=True if ctx.interaction else False,
            )

        human_time = format_duration(seconds)

        # notify
        try:
            await ModNotifier.notify_timeout(
                member=member,
                guild_name=ctx.guild.name,
                moderator=ctx.author,
                duration=human_time,
                reason=reason,
            )
        except Exception:
            pass

        # response
        await ctx.send(
            embed=make_embed(
                title="User Timed Out",
                description=f"{member.mention}\nDuration: {human_time}\nReason: {reason}",
                level="WARNING",
            )
        )

        # log
        try:
            await send_mod_log(
                guild=ctx.guild,
                category="TIMEOUT",
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
        except Exception:
            pass

    # =========================================================
    # UNTIMEOUT
    # =========================================================
    @commands.hybrid_command(name="untimeout", description="Remove timeout")
    async def untimeout_member(
        self,
        ctx: commands.Context,
        member: str = None,
        *,
        reason: str = "No reason provided"
    ):
        if ctx.interaction is None:
            await self._cleanup(ctx)

        member = await self.resolve_member(ctx, member)

        if not member:
            return await ctx.send(
                embed=make_embed(
                    title="Invalid Member",
                    description="Provide a valid user or reply.",
                    level="ERROR",
                ),
                ephemeral=True if ctx.interaction else False,
            )

        if not member.is_timed_out():
            return await ctx.send(
                embed=make_embed(
                    title="Not Timed Out",
                    description="User is not timed out.",
                    level="ERROR",
                ),
                ephemeral=True if ctx.interaction else False,
            )

        try:
            await member.timeout(None, reason=reason)
        except discord.Forbidden:
            return await ctx.send(
                embed=make_embed(
                    title="Permission Error",
                    description="Cannot remove timeout.",
                    level="ERROR",
                ),
                ephemeral=True if ctx.interaction else False,
            )

        await ctx.send(
            embed=make_embed(
                title="Timeout Removed",
                description=f"{member.mention} is now free.",
                level="SUCCESS",
            )
        )


async def setup(bot: commands.Bot):
    await bot.add_cog(TimeoutAdmin(bot))