import discord
from discord.ext import commands
from datetime import timedelta
import re
from utils.permissions.base_admin import BaseAdminCog
from utils.permissions.check_perms import is_bot_admin_ctx
from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS
from utils.logging.mod_log import send_mod_log
from db.db_helpers.tempban import (set_tempban_role, get_tempban_role,
                                   add_tempban, remove_tempban, is_tempbanned)
from db.db_helpers.verification import get_verification_config

TIME_REGEX = re.compile(r"(\d+)([smhd])")
TIME_MULTIPLIERS = {"s": 1, "m": 60, "h": 3600, "d": 86400}
DEFAULT_DURATION = "10m"


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
    if days: parts.append(f"{days}d")  # noqa: E701
    if hours: parts.append(f"{hours}h")  # noqa: E701
    if minutes: parts.append(f"{minutes}m")  # noqa: E701
    if seconds: parts.append(f"{seconds}s")  # noqa: E701
    return " ".join(parts) or "0s"


class Tempban(BaseAdminCog):

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    async def has_tempban_permission(self, ctx: commands.Context) -> bool:
        guild = ctx.guild
        if guild is None:
            return True
        author = ctx.author
        if not isinstance(author, discord.Member):
            return False
        if author.id == guild.owner_id or author.guild_permissions.administrator:
            return True
        return await is_bot_admin_ctx(ctx)

    async def resolve_member(self, ctx: commands.Context,
                             user_input) -> discord.Member | None:
        if isinstance(user_input, discord.Member):
            return user_input
        if user_input:
            try:
                return await commands.MemberConverter().convert(
                    ctx, str(user_input))
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
        if target.bot:
            return False, "You cannot tempban bots."
        if target.id == moderator.id:
            return False, "You cannot tempban yourself."
        if target.id == guild.owner_id:
            return False, "You cannot tempban the server owner."
        if target.id == bot_member.id:
            return False, "You cannot tempban me."
        if not bot_member.guild_permissions.manage_roles:
            return False, "I need `Manage Roles` permission."
        if moderator != guild.owner and target.guild_permissions.administrator:
            return False, "You cannot tempban another administrator."
        if moderator != guild.owner and target.top_role >= moderator.top_role:
            return False, "Target has equal or higher role than you."
        if target.top_role >= bot_member.top_role:
            return False, "I cannot manage this user due to role hierarchy."
        return True, None

    async def _safe_send(self, ctx: commands.Context,
                         embed: discord.Embed) -> discord.Message | None:
        try:
            return await ctx.send(embed=embed)
        except discord.HTTPException:
            try:
                return await ctx.channel.send(embed=embed)
            except discord.HTTPException:
                return None

    async def _cleanup(self, ctx: commands.Context) -> None:
        try:
            if ctx.message:
                await ctx.message.delete()
        except (discord.Forbidden, discord.NotFound, discord.HTTPException):
            pass

    @commands.command(name="tempban-role")
    @commands.guild_only()
    async def set_role(self,
                       ctx: commands.Context,
                       role: discord.Role = None):  # type: ignore
        if not await self.has_tempban_permission(ctx):
            return await self._safe_send(
                ctx,
                embed=make_embed(
                    title="Permission Denied",
                    description=
                    f"{EMOJIS['fail']} Only Administrators can configure system roles.",
                    level="ERROR"))

        guild = ctx.guild
        if guild is None or guild.me is None:
            return

        if not role:
            return await self._safe_send(
                ctx,
                embed=make_embed(
                    title="Missing Argument",
                    description="Please specify a valid server role.",
                    level="ERROR"))

        if role >= guild.me.top_role:
            return await self._safe_send(
                ctx,
                embed=make_embed(
                    title="Hierarchy Error",
                    description=
                    "Role must be positioned safely below the bot's role hierarchy.",
                    level="ERROR"))

        await set_tempban_role(guild.id, role.id)
        await self._safe_send(
            ctx,
            embed=make_embed(
                title="Tempban Role Set",
                description=
                f"{EMOJIS['success']} {role.mention} successfully registered as the isolation role.",
                level="SUCCESS"))
        await self._cleanup(ctx)

    @commands.command(name="tempban", aliases=["tb", "jail"])
    @commands.guild_only()
    async def tempban(self,
                      ctx: commands.Context,
                      user=None,
                      duration: str = DEFAULT_DURATION,
                      *,
                      reason: str = "No reason provided"):
        if not await self.has_tempban_permission(ctx):
            return await self._safe_send(
                ctx,
                embed=make_embed(
                    title="Permission Denied",
                    description=
                    f"{EMOJIS['fail']} Missing required moderation overrides.",
                    level="ERROR"))

        guild = ctx.guild
        moderator = ctx.author
        if guild is None or guild.me is None or not isinstance(
                moderator, discord.Member):
            return

        user = await self.resolve_member(ctx, user)
        if not user:
            return await self._safe_send(
                ctx,
                embed=make_embed(
                    title="Invalid User",
                    description="Provide a valid user mention, ID, or name.",
                    level="ERROR"))

        valid, error = await self.validate_target(moderator=moderator,
                                                  target=user)
        if not valid:
            return await self._safe_send(
                ctx,
                embed=make_embed(title="Permission Denied",
                                 description=error
                                 or "Invalid target operations context.",
                                 level="ERROR"))

        seconds = parse_duration(duration)
        if seconds <= 0:
            full_reason = f"{duration} {reason}" if reason != "No reason provided" else duration
            seconds = parse_duration(DEFAULT_DURATION)
            human_duration = format_duration(seconds)
            reason = full_reason
        else:
            human_duration = format_duration(seconds)

        role_id = await get_tempban_role(guild.id)
        tempban_role = guild.get_role(role_id) if role_id else None
        if not tempban_role or tempban_role >= guild.me.top_role:
            return await self._safe_send(
                ctx,
                embed=make_embed(
                    title="Configuration Error",
                    description=
                    "Tempban isolation role is unconfigured or out-ranked.",
                    level="ERROR"))

        config = await get_verification_config(guild.id)
        verified_role = guild.get_role(
            config.verified_role_id
        ) if config and config.verified_role_id else None
        expiry_dt = discord.utils.utcnow() + timedelta(seconds=seconds)

        try:
            embed = make_embed(
                title="You Were Tempbanned",
                description=
                (f"{EMOJIS['warning']} You were tempbanned inside **{guild.name}**\n\n"
                 f"{EMOJIS['arrow_point']} **Moderator:** {moderator}\n"
                 f"{EMOJIS['arrow_point']} **Duration:** {human_duration}\n"
                 f"{EMOJIS['arrow_point']} **Reason:** {reason}"),
                level="WARNING",
            )
            await user.send(embed=embed)
        except (discord.Forbidden, discord.HTTPException):
            pass

        try:
            if verified_role and verified_role in user.roles:
                await user.remove_roles(
                    verified_role,
                    reason="Tempban tracking constraints applied.")
            await user.add_roles(
                tempban_role,
                reason=f"Tempban applied | Duration: {human_duration}")
        except discord.Forbidden:
            return await self._safe_send(
                ctx,
                embed=make_embed(
                    title="Permission Error",
                    description=
                    "Hierarchy allocation mismatch. Drag bot role higher.",
                    level="ERROR"))
        except discord.HTTPException:
            return await self._safe_send(
                ctx,
                embed=make_embed(
                    title="Discord Error",
                    description="Failed mutating target's role matrix.",
                    level="ERROR"))

        await add_tempban(guild_id=guild.id,
                          user_id=user.id,
                          moderator_id=moderator.id,
                          reason=reason,
                          expires_at=expiry_dt)

        await self._safe_send(
            ctx,
            embed=make_embed(
                title="User Tempbanned",
                description=(
                    f"{EMOJIS['ban']} {user.mention} isolated successfully.\n\n"
                    f"{EMOJIS['arrow_point']} **Duration:** {human_duration}\n"
                    f"{EMOJIS['arrow_point']} **Reason:** {reason}"),
                level="SUCCESS"
            ))

        await send_mod_log(
            guild=guild,
            category="MODERATION",
            title="User Tempbanned",
            description=f"{moderator.mention} tempbanned {user.mention}",
            level="WARNING",
            actor=moderator,
            target=user,
            extra_fields={
                "Duration": human_duration,
                "Reason": reason,
                "Expires At": f"<t:{int(expiry_dt.timestamp())}:F>"
            })
        await self._cleanup(ctx)

    @commands.command(name="untempban", aliases=["untb", "unjail"])
    @commands.guild_only()
    async def untempban(self,
                        ctx: commands.Context,
                        user=None,
                        *,
                        reason: str = "No reason provided"):
        if not await self.has_tempban_permission(ctx):
            return await self._safe_send(
                ctx,
                embed=make_embed(
                    title="Permission Denied",
                    description=
                    f"{EMOJIS['fail']} Missing required moderation overrides.",
                    level="ERROR"))

        guild = ctx.guild
        moderator = ctx.author
        if guild is None or not isinstance(moderator, discord.Member):
            return

        user = await self.resolve_member(ctx, user)
        if not user:
            return await self._safe_send(
                ctx,
                embed=make_embed(
                    title="Invalid User",
                    description="Provide a valid user identity reference.",
                    level="ERROR"))

        if not await is_tempbanned(guild.id, user.id):
            return await self._safe_send(
                ctx,
                embed=make_embed(
                    title="Not Tempbanned",
                    description=
                    f"{user.mention} holds no active isolation lock records.",
                    level="WARNING"))

        role_id = await get_tempban_role(guild.id)
        tempban_role = guild.get_role(role_id) if role_id else None
        if not tempban_role:
            return await self._safe_send(
                ctx,
                embed=make_embed(
                    title="Role Missing",
                    description=
                    "Tempban schema role identity could not be retrieved.",
                    level="ERROR"))

        try:
            await user.remove_roles(
                tempban_role, reason=f"Untempban manual lift by {moderator}")
            config = await get_verification_config(guild.id)
            if config and config.verified_role_id:
                verified_role = guild.get_role(config.verified_role_id)
                if verified_role:
                    await user.add_roles(
                        verified_role,
                        reason="Tempban recovery cycle completed.")
        except discord.Forbidden:
            return await self._safe_send(
                ctx,
                embed=make_embed(
                    title="Permission Error",
                    description=
                    "Failed dropping constraints due to hierarchy positioning layers.",
                    level="ERROR"))
        except discord.HTTPException:
            return await self._safe_send(
                ctx,
                embed=make_embed(
                    title="Discord Error",
                    description="Failed updating core member profiles.",
                    level="ERROR"))

        await remove_tempban(guild_id=guild.id,
                             user_id=user.id,
                             moderator_id=moderator.id)

        await self._safe_send(
            ctx,
            embed=make_embed(
                title="Tempban Removed",
                description=
                f"{EMOJIS['success']} Active tempban lifted cleanly from {user.mention}.",
                level="SUCCESS"))

        await send_mod_log(
            guild=guild,
            category="MODERATION",
            title="Tempban Removed",
            description=
            f"{moderator.mention} dropped active isolation metrics from {user.mention}",
            level="SUCCESS",
            actor=moderator,
            target=user,
            extra_fields={"Reason": reason})
        await self._cleanup(ctx)


async def setup(bot: commands.Bot):
    await bot.add_cog(Tempban(bot))
