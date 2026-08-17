from __future__ import annotations

import logging
import re
from datetime import timedelta
from typing import Optional, Tuple

import discord
from discord.ext import commands

from db.db_helpers.tempban import (
    add_tempban,
    get_tempban_role,
    is_tempbanned,
    remove_tempban,
    set_tempban_role,
)
from db.db_helpers.verification import get_verification_config
from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS
from utils.logging.mod_log import send_mod_log
from utils.permissions.base_admin import BaseAdminCog
from utils.permissions.check_perms import is_bot_admin_ctx

logger = logging.getLogger("DigitalVigital")

TIME_REGEX = re.compile(r"(\d+)([smhd])")
TIME_MULTIPLIERS = {"s": 1, "m": 60, "h": 3600, "d": 86400}
DEFAULT_DURATION = "10m"


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


class Tempban(BaseAdminCog):
    """Cog for managing temporary isolation roles (jail/tempban)."""

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    async def has_tempban_permission(self, ctx: commands.Context) -> bool:
        """Check if the execution author has permission to issue tempbans."""
        guild = ctx.guild
        if guild is None:
            return True

        author = ctx.author
        if not isinstance(author, discord.Member):
            return False

        if author.id == guild.owner_id or author.guild_permissions.administrator:
            return True

        return await is_bot_admin_ctx(ctx)

    async def validate_target(
        self,
        *,
        moderator: discord.Member,
        target: discord.Member,
    ) -> Tuple[bool, Optional[str]]:
        """Validate if the moderator and bot can apply tempban restrictions on the target."""
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
            return False, "Target has an equal or higher role than you."
        if target.top_role >= bot_member.top_role:
            return False, "I cannot manage this user due to role hierarchy."

        return True, None

    async def _safe_send(
        self,
        ctx: commands.Context,
        embed: discord.Embed,
    ) -> Optional[discord.Message]:
        """Send a standardized response embed handling slash and prefix interactions."""
        try:
            if ctx.interaction:
                if ctx.interaction.response.is_done():
                    await ctx.interaction.followup.send(embed=embed,
                                                        ephemeral=True)
                else:
                    await ctx.interaction.response.send_message(embed=embed,
                                                                ephemeral=True)
                return None

            try:
                return await ctx.reply(embed=embed, mention_author=False)
            except (discord.NotFound, discord.HTTPException):
                return await ctx.channel.send(embed=embed)
        except discord.HTTPException as exc:
            logger.error("Failed sending response embed in Tempban system: %s",
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

    @commands.hybrid_command(
        name="tempban-role",
        description="Sets the server tempban isolation role.",
        aliases=["tbr"],
    )
    @commands.guild_only()
    async def set_role(
        self,
        ctx: commands.Context,
        role: Optional[discord.Role] = None,
    ) -> None:
        """Configure the tempban isolation role for the guild."""
        if not await self.has_tempban_permission(ctx):
            await self._safe_send(
                ctx,
                embed=make_embed(
                    title="Permission Denied",
                    description=
                    f"{EMOJIS.get('fail', '❌')} Only Administrators can configure system roles.",
                    level="ERROR",
                ),
            )
            return

        guild = ctx.guild
        if guild is None or guild.me is None:
            return

        if not role:
            prefix = ctx.clean_prefix
            await self._safe_send(
                ctx,
                embed=make_embed(
                    title="Missing Argument",
                    description=
                    f"Please specify a valid server role.\nUsage: `{prefix}tempban-role <role>`",
                    level="ERROR",
                ),
            )
            return

        if role >= guild.me.top_role:
            await self._safe_send(
                ctx,
                embed=make_embed(
                    title="Hierarchy Error",
                    description=
                    "Role must be positioned safely below the bot's role hierarchy.",
                    level="ERROR",
                ),
            )
            return

        await set_tempban_role(guild.id, role.id)
        await self._safe_send(
            ctx,
            embed=make_embed(
                title="Tempban Role Set",
                description=
                f"{EMOJIS.get('success', '✅')} {role.mention} successfully registered as the isolation role.",
                level="SUCCESS",
            ),
        )
        await self._cleanup(ctx)

    @commands.hybrid_command(
        name="tempban",
        description="Temporarily restricts a member using an isolation role.",
        aliases=["tb", "jail"],
    )
    @commands.guild_only()
    async def tempban(
        self,
        ctx: commands.Context,
        member: Optional[discord.Member] = None,
        duration: str = DEFAULT_DURATION,
        *,
        reason: Optional[str] = None,
    ) -> None:
        """Temporarily restrict a guild member for a given duration."""
        if not await self.has_tempban_permission(ctx):
            await self._safe_send(
                ctx,
                embed=make_embed(
                    title="Permission Denied",
                    description=
                    f"{EMOJIS.get('fail', '❌')} Missing required moderation overrides.",
                    level="ERROR",
                ),
            )
            return

        guild = ctx.guild
        moderator = ctx.author
        if guild is None or guild.me is None or not isinstance(
                moderator, discord.Member):
            return

        # Fallback target resolution for message replies in text channels
        if not member and ctx.message and ctx.message.reference:
            resolved = ctx.message.reference.resolved
            if isinstance(resolved, discord.Message) and isinstance(
                    resolved.author, discord.Member):
                member = resolved.author

        if not member:
            prefix = ctx.clean_prefix
            await self._safe_send(
                ctx,
                embed=make_embed(
                    title="Invalid User",
                    description=
                    f"Provide a valid user mention, ID, or reply.\nUsage: `{prefix}tempban <member> [duration] [reason]`",
                    level="ERROR",
                ),
            )
            return

        valid, error = await self.validate_target(moderator=moderator,
                                                  target=member)
        if not valid:
            await self._safe_send(
                ctx,
                embed=make_embed(
                    title="Permission Denied",
                    description=error or "Invalid target operations context.",
                    level="ERROR",
                ),
            )
            return

        reason_str = reason or "No reason provided"
        seconds = parse_duration(duration)
        if seconds <= 0:
            full_reason = f"{duration} {reason_str}" if reason else duration
            seconds = parse_duration(DEFAULT_DURATION)
            human_duration = format_duration(seconds)
            reason_str = full_reason
        else:
            human_duration = format_duration(seconds)

        role_id = await get_tempban_role(guild.id)
        tempban_role = guild.get_role(role_id) if role_id else None
        if not tempban_role or tempban_role >= guild.me.top_role:
            await self._safe_send(
                ctx,
                embed=make_embed(
                    title="Configuration Error",
                    description=
                    "Tempban isolation role is unconfigured or out-ranked.",
                    level="ERROR",
                ),
            )
            return

        config = await get_verification_config(guild.id)
        verified_role = (guild.get_role(config.verified_role_id)
                         if config and config.verified_role_id else None)
        expiry_dt = discord.utils.utcnow() + timedelta(seconds=seconds)

        try:
            embed = make_embed(
                title="You Were Tempbanned",
                description=
                (f"{EMOJIS.get('warning', '⚠️')} You were tempbanned inside **{guild.name}**\n\n"
                 f"{EMOJIS.get('arrow_point', '➡️')} **Moderator:** {moderator}\n"
                 f"{EMOJIS.get('arrow_point', '➡️')} **Duration:** {human_duration}\n"
                 f"{EMOJIS.get('arrow_point', '➡️')} **Reason:** {reason_str}"
                 ),
                level="WARNING",
            )
            await member.send(embed=embed)
        except (discord.Forbidden, discord.HTTPException):
            pass

        try:
            if verified_role and verified_role in member.roles:
                await member.remove_roles(
                    verified_role,
                    reason="Tempban tracking constraints applied.",
                )
            await member.add_roles(
                tempban_role,
                reason=f"Tempban applied | Duration: {human_duration}",
            )
        except discord.Forbidden:
            await self._safe_send(
                ctx,
                embed=make_embed(
                    title="Permission Error",
                    description=
                    "Hierarchy allocation mismatch. Drag bot role higher.",
                    level="ERROR",
                ),
            )
            return
        except discord.HTTPException:
            await self._safe_send(
                ctx,
                embed=make_embed(
                    title="Discord Error",
                    description="Failed mutating target's role matrix.",
                    level="ERROR",
                ),
            )
            return

        await add_tempban(
            guild_id=guild.id,
            user_id=member.id,
            moderator_id=moderator.id,
            reason=reason_str,
            expires_at=expiry_dt,
        )

        await self._safe_send(
            ctx,
            embed=make_embed(
                title="User Tempbanned",
                description=
                (f"{EMOJIS.get('ban', '🔨')} {member.mention} isolated successfully.\n\n"
                 f"{EMOJIS.get('arrow_point', '➡️')} **Duration:** {human_duration}\n"
                 f"{EMOJIS.get('arrow_point', '➡️')} **Reason:** {reason_str}"
                 ),
                level="SUCCESS",
            ),
        )

        try:
            await send_mod_log(
                guild=guild,
                category="MODERATION",
                title="User Tempbanned",
                description=f"{moderator.mention} tempbanned {member.mention}",
                level="WARNING",
                actor=moderator,
                target=member,
                extra_fields={
                    "Duration": human_duration,
                    "Reason": reason_str,
                    "Expires At": f"<t:{int(expiry_dt.timestamp())}:F>",
                },
            )
        except Exception as exc:
            logger.error("Failed sending mod log for tempban: %s", exc)

        await self._cleanup(ctx)

    @commands.hybrid_command(
        name="untempban",
        description="Lifts an active tempban/jail isolation role from a user.",
        aliases=["untb", "unjail"],
    )
    @commands.guild_only()
    async def untempban(
        self,
        ctx: commands.Context,
        member: Optional[discord.Member] = None,
        *,
        reason: Optional[str] = None,
    ) -> None:
        """Manually lift a tempban from a member."""
        if not await self.has_tempban_permission(ctx):
            await self._safe_send(
                ctx,
                embed=make_embed(
                    title="Permission Denied",
                    description=
                    f"{EMOJIS.get('fail', '❌')} Missing required moderation overrides.",
                    level="ERROR",
                ),
            )
            return

        guild = ctx.guild
        moderator = ctx.author
        if guild is None or not isinstance(moderator, discord.Member):
            return

        # Fallback target resolution for message replies in text channels
        if not member and ctx.message and ctx.message.reference:
            resolved = ctx.message.reference.resolved
            if isinstance(resolved, discord.Message) and isinstance(
                    resolved.author, discord.Member):
                member = resolved.author

        if not member:
            prefix = ctx.clean_prefix
            await self._safe_send(
                ctx,
                embed=make_embed(
                    title="Invalid User",
                    description=
                    f"Provide a valid user identity reference.\nUsage: `{prefix}untempban <member> [reason]`",
                    level="ERROR",
                ),
            )
            return

        reason_str = reason or "No reason provided"

        if not await is_tempbanned(guild.id, member.id):
            await self._safe_send(
                ctx,
                embed=make_embed(
                    title="Not Tempbanned",
                    description=
                    f"{member.mention} holds no active isolation lock records.",
                    level="WARNING",
                ),
            )
            return

        role_id = await get_tempban_role(guild.id)
        tempban_role = guild.get_role(role_id) if role_id else None
        if not tempban_role:
            await self._safe_send(
                ctx,
                embed=make_embed(
                    title="Role Missing",
                    description=
                    "Tempban schema role identity could not be retrieved.",
                    level="ERROR",
                ),
            )
            return

        try:
            await member.remove_roles(
                tempban_role,
                reason=f"Untempban manual lift by {moderator}",
            )
            config = await get_verification_config(guild.id)
            if config and config.verified_role_id:
                verified_role = guild.get_role(config.verified_role_id)
                if verified_role:
                    await member.add_roles(
                        verified_role,
                        reason="Tempban recovery cycle completed.",
                    )
        except discord.Forbidden:
            await self._safe_send(
                ctx,
                embed=make_embed(
                    title="Permission Error",
                    description=
                    "Failed dropping constraints due to hierarchy positioning layers.",
                    level="ERROR",
                ),
            )
            return
        except discord.HTTPException:
            await self._safe_send(
                ctx,
                embed=make_embed(
                    title="Discord Error",
                    description="Failed updating core member profiles.",
                    level="ERROR",
                ),
            )
            return

        await remove_tempban(
            guild_id=guild.id,
            user_id=member.id,
            moderator_id=moderator.id,
        )

        await self._safe_send(
            ctx,
            embed=make_embed(
                title="Tempban Removed",
                description=
                f"{EMOJIS.get('success', '✅')} Active tempban lifted cleanly from {member.mention}.",
                level="SUCCESS",
            ),
        )

        try:
            await send_mod_log(
                guild=guild,
                category="MODERATION",
                title="Tempban Removed",
                description=
                f"{moderator.mention} dropped active isolation metrics from {member.mention}",
                level="SUCCESS",
                actor=moderator,
                target=member,
                extra_fields={"Reason": reason_str},
            )
        except Exception as exc:
            logger.error("Failed sending mod log for untempban: %s", exc)

        await self._cleanup(ctx)


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(Tempban(bot))
