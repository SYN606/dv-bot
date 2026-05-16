import re
from datetime import timedelta
import discord
from discord.ext import commands
from discord import app_commands
from utils.permissions.base_admin import (
    BaseAdminCog, )
from utils.core.embeds import (
    make_embed, )
from utils.core.emojis import (
    EMOJIS, )
from utils.logging.mod_log import (
    send_mod_log, )

TIME_REGEX = re.compile(r"(\d+)([smhd])")
TIME_MULTIPLIERS = {
    "s": 1,
    "m": 60,
    "h": 3600,
    "d": 86400,
}

DEFAULT_DURATION = "10m"
MAX_TIMEOUT_SECONDS = (28 * 24 * 3600)


def parse_duration(duration: str, ) -> int:

    matches = TIME_REGEX.findall(duration.lower(), )

    if not matches:
        return 0

    return sum(int(value) * TIME_MULTIPLIERS[unit] for value, unit in matches)


def format_duration(seconds: int, ) -> str:

    parts = []

    days, seconds = divmod(
        seconds,
        86400,
    )

    hours, seconds = divmod(
        seconds,
        3600,
    )

    minutes, seconds = divmod(
        seconds,
        60,
    )

    if days:
        parts.append(f"{days}d")

    if hours:
        parts.append(f"{hours}h")

    if minutes:
        parts.append(f"{minutes}m")

    if seconds:
        parts.append(f"{seconds}s")

    return " ".join(parts)


class TimeoutAdmin(
        BaseAdminCog, ):

    def __init__(
        self,
        bot: commands.Bot,
    ):
        self.bot = bot

    async def has_timeout_permission(
        self,
        member: discord.Member,
    ) -> bool:
        """
        REAL moderation permission check.

        Allowed:
        - Server Owner
        - Administrator
        - Moderate Members
        """

        guild = member.guild

        if member.id == guild.owner_id:
            return True

        perms = (member.guild_permissions)

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
    ) -> None:

        embed = make_embed(
            title=title,
            description=description,
            level=level,
        )

        try:

            if ctx.interaction:

                interaction = (ctx.interaction)

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

            else:

                await ctx.reply(
                    embed=embed,
                    mention_author=False,
                )

        except discord.HTTPException:
            pass

    async def _cleanup(
        self,
        ctx: commands.Context,
    ) -> None:

        if ctx.interaction:
            return

        try:
            await ctx.message.delete()

        except (
                discord.Forbidden,
                discord.NotFound,
                discord.HTTPException,
        ):
            pass

    async def resolve_member(
        self,
        ctx: commands.Context,
        value,
    ) -> discord.Member | None:

        guild = ctx.guild

        if guild is None:
            return None

        # DIRECT MEMBER
        if isinstance(
                value,
                discord.Member,
        ):
            return value

        # REPLY TARGET
        if not value:

            reference = (ctx.message.reference)

            if (reference and isinstance(
                    reference.resolved,
                    discord.Message,
            )):

                author = (reference.resolved.author)

                if isinstance(
                        author,
                        discord.Member,
                ):
                    return author

                return guild.get_member(author.id, )

        # MENTION
        if ctx.message.mentions:

            mention = (ctx.message.mentions[0])

            if isinstance(
                    mention,
                    discord.Member,
            ):
                return mention

        # CONVERTER
        if value:

            try:

                return await commands.MemberConverter().convert(
                    ctx,
                    str(value),
                )

            except commands.BadArgument:
                return None

        return None

    async def validate_target(
        self,
        *,
        moderator: discord.Member,
        target: discord.Member,
    ) -> tuple[bool, str | None]:

        guild = moderator.guild
        bot_member = guild.me

        if bot_member is None:

            return (
                False,
                "Bot member unavailable.",
            )

        # SELF
        if target.id == moderator.id:

            return (
                False,
                "You cannot timeout yourself.",
            )

        # OWNER
        if target.id == guild.owner_id:

            return (
                False,
                "You cannot timeout the server owner.",
            )

        # BOT
        if target.id == bot_member.id:

            return (
                False,
                "You cannot timeout me.",
            )

        # BOT PERMISSIONS
        if (not bot_member.guild_permissions.moderate_members):

            return (
                False,
                "I need `Moderate Members` permission.",
            )

        # ADMIN PROTECTION
        if (moderator != guild.owner
                and target.guild_permissions.administrator):

            return (
                False,
                "You cannot timeout another administrator.",
            )

        # USER HIERARCHY
        if (moderator != guild.owner
                and target.top_role >= moderator.top_role):

            return (
                False,
                "Target has equal or higher role than you.",
            )

        # BOT HIERARCHY
        if (target.top_role >= bot_member.top_role):

            return (
                False,
                "I cannot manage this user due to role hierarchy.",
            )

        return (
            True,
            None,
        )

    async def send_timeout_dm(
        self,
        *,
        target: discord.Member,
        guild: discord.Guild,
        moderator: discord.Member,
        duration: str,
        reason: str,
    ) -> None:
        try:
            description = (f"{EMOJIS['warning']} "
                           f"You were timed out in "
                           f"**{guild.name}**\n\n"
                           f"{EMOJIS['arrow_point']} "
                           f"Moderator: {moderator}\n"
                           f"{EMOJIS['arrow_point']} "
                           f"Duration: {duration}")
            if reason != "No reason provided":
                description += (f"\n{EMOJIS['arrow_point']} "
                                f"Reason: {reason}")
            embed = make_embed(
                title="You Were Timed Out",
                description=description,
                level="WARNING",
            )
            await target.send(embed=embed, )

        except (
                discord.Forbidden,
                discord.HTTPException,
        ):
            pass

    @commands.hybrid_command(
        name="timeout",
        description="Timeout a member",
    )
    @commands.guild_only()
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
        guild = ctx.guild
        if guild is None:
            return
        moderator = ctx.author
        if not isinstance(
                moderator,
                discord.Member,
        ):
            return
        # PERMISSION CHECK
        if not await self.has_timeout_permission(moderator, ):
            await self._reply(
                ctx,
                title="Permission Denied",
                description=(f"{EMOJIS['fail']} "
                             "You do not have permission "
                             "to use this command."),
            )

            return
        # TARGET
        target = await self.resolve_member(
            ctx,
            member,
        )

        if target is None:
            await self._reply(
                ctx,
                title="Invalid Member",
                description=("Provide a valid member "
                             "or reply to a message."),
            )

            return
        # VALIDATION
        valid, error = await self.validate_target(
            moderator=moderator,
            target=target,
        )

        if not valid:
            await self._reply(
                ctx,
                title="Permission Denied",
                description=(error or "Invalid target."),
            )

            return

        # PARSE DURATION
        seconds = parse_duration(duration, )
        if (seconds <= 0 or seconds > MAX_TIMEOUT_SECONDS):
            await self._reply(
                ctx,
                title="Invalid Duration",
                description=("Use a valid duration "
                             "(max 28d)."),
            )

            return

        human_duration = format_duration(seconds, )
        until = (discord.utils.utcnow() + timedelta(seconds=seconds, ))
        # DM
        await self.send_timeout_dm(
            target=target,
            guild=guild,
            moderator=moderator,
            duration=human_duration,
            reason=reason,
        )

        # EXECUTE
        try:
            await target.timeout(
                until,
                reason=(f"{reason} | "
                        f"Timed out by {moderator}"),
            )

        except discord.Forbidden:
            await self._reply(
                ctx,
                title="Permission Error",
                description=("I cannot timeout this user."),
            )

            return
        except discord.HTTPException:
            await self._reply(
                ctx,
                title="Timeout Failed",
                description=("Failed to timeout the user."),
            )

            return
        # SUCCESS
        await self._reply(
            ctx,
            title="User Timed Out",
            description=(f"{EMOJIS['warning']} "
                         f"{target.mention}\n\n"
                         f"{EMOJIS['arrow_point']} "
                         f"Duration: {human_duration}\n"
                         f"{EMOJIS['arrow_point']} "
                         f"Reason: {reason}"),
            level="WARNING",
        )

        # LOGGING
        try:
            await send_mod_log(
                guild=guild,
                category="MODERATION",
                title="User Timed Out",
                description=(f"{moderator} timed out "
                             f"{target}"),
                level="WARNING",
                actor=moderator,
                target=target,
                extra_fields={
                    "Duration": human_duration,
                    "Reason": reason,
                },
            )
        except Exception:
            pass
        await self._cleanup(ctx, )

    @commands.hybrid_command(
        name="untimeout",
        description="Remove timeout",
    )
    @commands.guild_only()
    async def untimeout_member(
        self,
        ctx: commands.Context,
        member: str | None = None,
        *,
        reason: str = "No reason provided",
    ):
        guild = ctx.guild
        if guild is None:
            return
        moderator = ctx.author
        if not isinstance(
                moderator,
                discord.Member,
        ):
            return
        # PERMISSION CHECK
        if not await self.has_timeout_permission(moderator, ):
            await self._reply(
                ctx,
                title="Permission Denied",
                description=(f"{EMOJIS['fail']} "
                             "You do not have permission "
                             "to use this command."),
            )

            return
        # TARGET
        target = await self.resolve_member(
            ctx,
            member,
        )
        if target is None:
            await self._reply(
                ctx,
                title="Invalid Member",
                description=("Provide a valid member."),
            )
            return
        if not target.is_timed_out():

            await self._reply(
                ctx,
                title="Not Timed Out",
                description=("This user is not timed out."),
            )
            return
        # VALIDATE
        valid, error = await self.validate_target(
            moderator=moderator,
            target=target,
        )
        if not valid:
            await self._reply(
                ctx,
                title="Permission Denied",
                description=(error or "Invalid target."),
            )

            return

        # EXECUTE
        try:
            await target.timeout(
                None,
                reason=(f"{reason} | "
                        f"Timeout removed by {moderator}"),
            )

        except discord.Forbidden:
            await self._reply(
                ctx,
                title="Permission Error",
                description=("Cannot remove timeout "
                             "from this user."),
            )
            return

        except discord.HTTPException:
            await self._reply(
                ctx,
                title="Timeout Removal Failed",
                description=("Failed to remove timeout."),
            )
            return

        # SUCCESS
        await self._reply(
            ctx,
            title="Timeout Removed",
            description=(f"{EMOJIS['success']} "
                         f"{target.mention}\n\n"
                         f"{EMOJIS['arrow_point']} "
                         f"Reason: {reason}"),
            level="SUCCESS",
        )

        # LOGGING
        try:
            await send_mod_log(
                guild=guild,
                category="MODERATION",
                title="Timeout Removed",
                description=(f"{moderator} removed timeout from "
                             f"{target}"),
                level="SUCCESS",
                actor=moderator,
                target=target,
                extra_fields={
                    "Reason": reason,
                },
            )
        except Exception:
            pass
        await self._cleanup(ctx, )


async def setup(bot: commands.Bot, ):
    await bot.add_cog(TimeoutAdmin(bot), )
