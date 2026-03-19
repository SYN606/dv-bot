import discord
from discord.ext import commands
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
    # Reply resolver
    # =========================================================
    def _resolve_from_reply(self, ctx):
        ref = ctx.message.reference
        if ref and isinstance(ref.resolved, discord.Message):
            return ctx.guild.get_member(ref.resolved.author.id)
        return None

    async def _cleanup(self, ctx):
        try:
            await ctx.message.delete()
        except discord.Forbidden, discord.NotFound:
            pass

    async def _validate_target(self, ctx, member):
        guild = ctx.guild
        moderator = ctx.author
        bot_member = guild.me

        if member == moderator:
            return "You cannot timeout yourself."

        if member == guild.owner:
            return "You cannot timeout the server owner."

        # missing permission check (important)
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
    # TIMEOUT
    # =========================================================
    @commands.command(name="timeout")
    async def timeout_member(self, ctx, member=None, arg1=None, *, arg2=None):

        await self._cleanup(ctx)

        if not member:
            member = self._resolve_from_reply(ctx)

        if not member:
            return await ctx.send(
                embed=make_embed(
                    title="Missing Member",
                    description="Usage: timeout <user/reply> [duration] [reason]",
                    level="ERROR",
                ),
                delete_after=5,
            )

        duration = DEFAULT_DURATION
        reason = "No reason provided"

        if arg1:
            if parse_duration(arg1) > 0:
                duration = arg1
                if arg2:
                    reason = arg2
            else:
                reason = f"{arg1} {arg2 or ''}".strip()

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

        seconds, err = self._validate_duration(duration)
        if err:
            return await ctx.send(
                embed=make_embed(
                    title="Invalid Duration",
                    description=err,
                    level="ERROR",
                ),
                delete_after=5,
            )

        until = discord.utils.utcnow() + timedelta(seconds=seconds)

        # SAFE timeout execution
        try:
            await member.timeout(until, reason=reason)
        except discord.Forbidden:
            return await ctx.send(
                embed=make_embed(
                    title="Action Failed",
                    description="I do not have permission to timeout this user.",
                    level="ERROR",
                ),
                delete_after=5,
            )
        except discord.HTTPException:
            return await ctx.send(
                embed=make_embed(
                    title="Timeout Failed",
                    description="An error occurred while applying timeout.",
                    level="ERROR",
                ),
                delete_after=5,
            )

        human_time = format_duration(seconds)

        # notifier (safe)
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
        try:
            await ctx.send(
                embed=make_embed(
                    title="User Timed Out",
                    description=f"{member.mention}\nDuration: {human_time}\nReason: {reason}",
                    level="WARNING",
                ),
                delete_after=5,
            )
        except Exception:
            pass

        # logging (safe)
        try:
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
        except Exception:
            pass

    # =========================================================
    # UNTIMEOUT
    # =========================================================
    @commands.command(name="untimeout")
    async def untimeout_member(self, ctx, member=None, *, reason=None):

        await self._cleanup(ctx)

        if not member:
            member = self._resolve_from_reply(ctx)

        if not member:
            return await ctx.send(
                embed=make_embed(
                    title="Missing Member",
                    description="Usage: untimeout <user/reply> [reason]",
                    level="ERROR",
                ),
                delete_after=5,
            )

        reason = reason or "No reason provided"

        if not member.is_timed_out():
            return await ctx.send(
                embed=make_embed(
                    title="User Not Timed Out",
                    description="This user is not currently timed out.",
                    level="ERROR",
                ),
                delete_after=5,
            )

        try:
            await member.timeout(None, reason=reason)
        except discord.Forbidden:
            return await ctx.send(
                embed=make_embed(
                    title="Action Failed",
                    description="I do not have permission to remove timeout.",
                    level="ERROR",
                ),
                delete_after=5,
            )
        except discord.HTTPException:
            return await ctx.send(
                embed=make_embed(
                    title="Error",
                    description="Failed to remove timeout.",
                    level="ERROR",
                ),
                delete_after=5,
            )

        try:
            await ModNotifier.notify_timeout(
                member=member,
                guild_name=ctx.guild.name,
                moderator=ctx.author,
                duration="Removed",
                reason=reason,
            )
        except Exception:
            pass

        try:
            await ctx.send(
                embed=make_embed(
                    title="Timeout Removed",
                    description=f"{member.mention} has been unmuted.",
                    level="SUCCESS",
                ),
                delete_after=5,
            )
        except Exception:
            pass

        try:
            await send_mod_log(
                guild=ctx.guild,
                category="BAN",
                title="Timeout Removed",
                description=f"Timeout removed for {member}.",
                level="SUCCESS",
                actor=ctx.author,
                target=member,
                extra_fields={"Reason": reason},
            )
        except Exception:
            pass


async def setup(bot: commands.Bot):
    await bot.add_cog(TimeoutAdmin(bot))
