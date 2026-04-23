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

    async def cog_check(self, ctx: commands.Context) -> bool:
        if ctx.guild is None:
            return True

        if not isinstance(ctx.author, discord.Member):
            return False

        # Owner bypass
        if ctx.author.id == ctx.guild.owner_id:
            return True

        perms = ctx.author.guild_permissions

        if perms.moderate_members:
            return True

        return await super().cog_check(ctx)

    # MEMBER RESOLUTION
    async def resolve_member(self, ctx, member_input) -> discord.Member | None:
        if isinstance(member_input, discord.Member):
            return member_input

        if member_input:
            try:
                return await commands.MemberConverter().convert(
                    ctx, member_input)
            except commands.BadArgument:
                return None

        ref = ctx.message.reference
        if ref and isinstance(ref.resolved, discord.Message):
            return ctx.guild.get_member(ref.resolved.author.id)

        return None

    async def _cleanup(self, ctx):
        try:
            await ctx.message.delete()
        except Exception:
            pass

    # TIMEOUT
    @commands.hybrid_command(name="timeout", description="Timeout a member")
    @app_commands.describe(
        member="User to timeout",
        duration="Example: 10m, 2h, 1d",
        reason="Reason for timeout",
    )
    async def timeout_member(
        self,
        ctx: commands.Context,
        member: str | None = None,
        duration: str = DEFAULT_DURATION,
        *,
        reason: str = "No reason provided",
    ):

        if ctx.interaction is None:
            await self._cleanup(ctx)

        guild = ctx.guild
        moderator = ctx.author

        if guild is None or not isinstance(moderator, discord.Member):
            return

        target = await self.resolve_member(ctx, member)

        if not target:
            await ctx.send(embed=make_embed(
                title="Invalid Member",
                description="Provide a valid user or reply to a message.",
                level="ERROR",
            ))
            return

        if target == moderator:
            await ctx.send(embed=make_embed(
                title="Invalid Action",
                description="You cannot timeout yourself.",
                level="ERROR",
            ))
            return

        if not guild.me.guild_permissions.moderate_members:
            await ctx.send(embed=make_embed(
                title="Missing Permissions",
                description="I cannot timeout members.",
                level="ERROR",
            ))
            return

        seconds = parse_duration(duration)
        if seconds <= 0 or seconds > MAX_TIMEOUT_SECONDS:
            await ctx.send(embed=make_embed(
                title="Invalid Duration",
                description="Use valid duration (max 28d).",
                level="ERROR",
            ))
            return

        until = discord.utils.utcnow() + timedelta(seconds=seconds)

        try:
            await target.timeout(until, reason=reason)
        except discord.Forbidden:
            await ctx.send(embed=make_embed(
                title="Permission Error",
                description="Cannot timeout this user.",
                level="ERROR",
            ))
            return

        human_time = format_duration(seconds)

        # Notify user
        try:
            await ModNotifier.notify_timeout(
                member=target,
                guild_name=guild.name,
                moderator=moderator,
                duration=human_time,
                reason=reason,
            )
        except Exception:
            pass

        await ctx.send(embed=make_embed(
            title="User Timed Out",
            description=
            f"{target.mention}\nDuration: {human_time}\nReason: {reason}",
            level="WARNING",
        ))

        # Logging
        try:
            await send_mod_log(
                guild=guild,
                category="MODERATION",
                title="User Timed Out",
                description=f"{moderator} timed out {target.mention}",
                level="WARNING",
                actor=moderator,
                target=target,
                extra_fields={
                    "Duration": human_time,
                    "Reason": reason,
                },
            )
        except Exception as e:
            print(f"[Timeout Log Failed] {e}")

    # UNTIMEOUT
    @commands.hybrid_command(name="untimeout", description="Remove timeout")
    async def untimeout_member(
        self,
        ctx: commands.Context,
        member: str | None = None,
        *,
        reason: str = "No reason provided",
    ):

        if ctx.interaction is None:
            await self._cleanup(ctx)

        guild = ctx.guild
        moderator = ctx.author

        if guild is None or not isinstance(moderator, discord.Member):
            return

        target = await self.resolve_member(ctx, member)

        if not target:
            await ctx.send(embed=make_embed(
                title="Invalid Member",
                description="Provide a valid user.",
                level="ERROR",
            ))
            return

        if not target.is_timed_out():
            await ctx.send(embed=make_embed(
                title="Not Timed Out",
                description="User is not timed out.",
                level="ERROR",
            ))
            return

        try:
            await target.timeout(None, reason=reason)
        except discord.Forbidden:
            await ctx.send(embed=make_embed(
                title="Permission Error",
                description="Cannot remove timeout.",
                level="ERROR",
            ))
            return

        await ctx.send(embed=make_embed(
            title="Timeout Removed",
            description=f"{target.mention} is now free.",
            level="SUCCESS",
        ))

        # Logging
        try:
            await send_mod_log(
                guild=guild,
                category="MODERATION",
                title="Timeout Removed",
                description=
                f"{moderator} removed timeout from {target.mention}",
                level="SUCCESS",
                actor=moderator,
                target=target,
                extra_fields={
                    "Reason": reason,
                },
            )
        except Exception as e:
            print(f"[Timeout Log Failed] {e}")


async def setup(bot: commands.Bot):
    await bot.add_cog(TimeoutAdmin(bot))
