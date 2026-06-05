import re
from datetime import timedelta
import discord
from discord import app_commands
from discord.ext import commands
from utils.permissions.base_admin import BaseAdminCog
from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS
from utils.logging.mod_log import send_mod_log

TIME_REGEX = re.compile(r"(\d+)([smhd])")
TIME_MULTIPLIERS = {"s": 1, "m": 60, "h": 3600, "d": 86400}

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

    async def has_timeout_permission(self, member: discord.Member) -> bool:
        guild = member.guild
        if member.id == guild.owner_id:
            return True

        perms = member.guild_permissions
        if perms.administrator:
            return True

        return perms.moderate_members

    async def _reply(self,
                     ctx: commands.Context,
                     *,
                     title: str,
                     description: str,
                     level: str = "ERROR") -> None:
        embed = make_embed(title=title, description=description, level=level)
        try:
            if ctx.interaction:
                interaction = ctx.interaction
                if interaction.response.is_done():
                    await interaction.followup.send(embed=embed,
                                                    ephemeral=True)
                else:
                    await interaction.response.send_message(embed=embed,
                                                            ephemeral=True)
            else:
                await ctx.reply(embed=embed, mention_author=False)
        except discord.HTTPException:
            pass

    async def _cleanup(self, ctx: commands.Context) -> None:
        if ctx.interaction:
            return
        try:
            await ctx.message.delete()
        except (discord.Forbidden, discord.NotFound, discord.HTTPException):
            pass

    async def resolve_member(self, ctx: commands.Context,
                             value) -> discord.Member | None:
        guild = ctx.guild
        if guild is None:
            return None

        if isinstance(value, discord.Member):
            return value

        if not value:
            reference = ctx.message.reference
            if reference and isinstance(reference.resolved, discord.Message):
                author = reference.resolved.author
                if isinstance(author, discord.Member):
                    return author
                return guild.get_member(author.id)

        if ctx.message.mentions:
            mention = ctx.message.mentions[0]
            if isinstance(mention, discord.Member):
                return mention

        if value:
            try:
                return await commands.MemberConverter().convert(
                    ctx, str(value))
            except commands.BadArgument:
                return None

        return None

    async def validate_target(
            self, *, moderator: discord.Member,
            target: discord.Member) -> tuple[bool, str | None]:
        guild = moderator.guild
        bot_member = guild.me

        if bot_member is None:
            return False, "Bot member unavailable."

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
            return False, "Target has equal or higher role than you."

        if target.top_role >= bot_member.top_role:
            return False, "I cannot manage this user due to role hierarchy."

        return True, None

    async def send_timeout_dm(self, *, target: discord.Member,
                              guild: discord.Guild, moderator: discord.Member,
                              duration: str, reason: str) -> None:
        try:
            description = (
                f"{EMOJIS['warning']} You were timed out in **{guild.name}**\n\n"
                f"{EMOJIS['arrow_point']} **Moderator:** {moderator}\n"
                f"{EMOJIS['arrow_point']} **Duration:** {duration}")
            if reason != "No reason provided":
                description += f"\n{EMOJIS['arrow_point']} **Reason:** {reason}"

            embed = make_embed(title="You Were Timed Out",
                               description=description,
                               level="WARNING")
            await target.send(embed=embed)
        except (discord.Forbidden, discord.HTTPException):
            pass

    @commands.hybrid_command(name="timeout",
                             aliases=["to", "mute"],
                             description="Timeout a member")
    @commands.guild_only()
    @app_commands.describe(member="User to timeout",
                           duration="Example: 10m, 2h, 1d",
                           reason="Reason for timeout")
    async def timeout_member(self,
                             ctx: commands.Context,
                             member: str | None = None,
                             duration: str = DEFAULT_DURATION,
                             *,
                             reason: str = "No reason provided"):
        guild = ctx.guild
        if guild is None:
            return

        moderator = ctx.author
        if not isinstance(moderator, discord.Member):
            return

        if not await self.has_timeout_permission(moderator):
            return await self._reply(
                ctx,
                title="Permission Denied",
                description=
                f"{EMOJIS['fail']} You do not have permission to use this command."
            )

        target = await self.resolve_member(ctx, member)
        if target is None:
            return await self._reply(
                ctx,
                title="Invalid Member",
                description="Provide a valid member or reply to a message.")

        valid, error = await self.validate_target(moderator=moderator,
                                                  target=target)
        if not valid:
            return await self._reply(ctx,
                                     title="Permission Denied",
                                     description=(error or "Invalid target."))

        seconds = parse_duration(duration)
        if seconds <= 0 or seconds > MAX_TIMEOUT_SECONDS:
            return await self._reply(
                ctx,
                title="Invalid Duration",
                description="Use a valid duration (max 28d).")

        # Command executes validation smoothly -> Clean up text invocation immediately
        await self._cleanup(ctx)

        human_duration = format_duration(seconds)
        until = discord.utils.utcnow() + timedelta(seconds=seconds)

        await self.send_timeout_dm(target=target,
                                   guild=guild,
                                   moderator=moderator,
                                   duration=human_duration,
                                   reason=reason)

        try:
            await target.timeout(until,
                                 reason=f"{reason} | Timed out by {moderator}")
        except discord.Forbidden:
            return await self._reply(ctx,
                                     title="Permission Error",
                                     description="I cannot timeout this user.")
        except discord.HTTPException:
            return await self._reply(ctx,
                                     title="Timeout Failed",
                                     description="Failed to timeout the user.")

        await self._reply(
            ctx,
            title="User Timed Out",
            description=(
                f"{EMOJIS['warning']} {target.mention}\n\n"
                f"{EMOJIS['arrow_point']} **Duration:** {human_duration}\n"
                f"{EMOJIS['arrow_point']} **Reason:** {reason}"),
            level="WARNING")

        try:
            await send_mod_log(guild=guild,
                               category="MODERATION",
                               title="User Timed Out",
                               description=f"{moderator} timed out {target}",
                               level="WARNING",
                               actor=moderator,
                               target=target,
                               extra_fields={
                                   "Duration": human_duration,
                                   "Reason": reason,
                               })
        except Exception:
            pass

    @commands.hybrid_command(name="untimeout",
                             aliases=["unto", "unmute"],
                             description="Remove timeout from a member")
    @commands.guild_only()
    async def untimeout_member(self,
                               ctx: commands.Context,
                               member: str | None = None,
                               *,
                               reason: str = "No reason provided"):
        guild = ctx.guild
        if guild is None:
            return

        moderator = ctx.author
        if not isinstance(moderator, discord.Member):
            return

        if not await self.has_timeout_permission(moderator):
            return await self._reply(
                ctx,
                title="Permission Denied",
                description=
                f"{EMOJIS['fail']} You do not have permission to use this command."
            )

        target = await self.resolve_member(ctx, member)
        if target is None:
            return await self._reply(ctx,
                                     title="Invalid Member",
                                     description="Provide a valid member.")

        if not target.is_timed_out():
            return await self._reply(ctx,
                                     title="Not Timed Out",
                                     description="This user is not timed out.")

        valid, error = await self.validate_target(moderator=moderator,
                                                  target=target)
        if not valid:
            return await self._reply(ctx,
                                     title="Permission Denied",
                                     description=(error or "Invalid target."))

        # Command executes validation smoothly -> Clean up text invocation immediately
        await self._cleanup(ctx)

        try:
            await target.timeout(
                None, reason=f"{reason} | Timeout removed by {moderator}")
        except discord.Forbidden:
            return await self._reply(
                ctx,
                title="Permission Error",
                description="Cannot remove timeout from this user.")
        except discord.HTTPException:
            return await self._reply(ctx,
                                     title="Timeout Removal Failed",
                                     description="Failed to remove timeout.")

        await self._reply(
            ctx,
            title="Timeout Removed",
            description=(f"{EMOJIS['success']} {target.mention}\n\n"
                         f"{EMOJIS['arrow_point']} **Reason:** {reason}"),
            level="SUCCESS")

        try:
            await send_mod_log(
                guild=guild,
                category="MODERATION",
                title="Timeout Removed",
                description=f"{moderator} removed timeout from {target}",
                level="SUCCESS",
                actor=moderator,
                target=target,
                extra_fields={"Reason": reason})
        except Exception:
            pass


async def setup(bot: commands.Bot):
    await bot.add_cog(TimeoutAdmin(bot))
