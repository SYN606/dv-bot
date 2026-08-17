from __future__ import annotations

import logging
from typing import Optional, Tuple, Union

import discord
from discord.ext import commands

from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS
from utils.logging.mod_log import send_mod_log
from utils.permissions.base_admin import BaseAdminCog

logger = logging.getLogger("DigitalVigital")


class BanSystem(BaseAdminCog):
    """Cog for managing member bans and unbans within guilds."""

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    async def has_ban_permission(self, ctx: commands.Context) -> bool:
        """Check if the context author has permission to ban members."""
        guild = ctx.guild
        if guild is None:
            return False

        author = ctx.author
        if not isinstance(author, discord.Member):
            return False

        if author.id == guild.owner_id:
            return True

        perms = author.guild_permissions
        if perms.administrator:
            return True

        return perms.ban_members

    async def _reply(
        self,
        ctx: commands.Context,
        title: str,
        description: str,
        level: str = "ERROR",
        show_footer: bool = False,
    ) -> Optional[discord.Message]:
        """Send a standardized response embed to the command context."""
        embed = make_embed(title=title, description=description, level=level)

        if show_footer:
            embed.set_footer(
                text=f"Action by : {ctx.author}",
                icon_url=ctx.author.display_avatar.url,
            )

        try:
            if ctx.interaction:
                if ctx.interaction.response.is_done():
                    await ctx.interaction.followup.send(embed=embed,
                                                        ephemeral=True)
                else:
                    await ctx.interaction.response.send_message(embed=embed,
                                                                ephemeral=True)
                return None  # Interaction responses do not return a standard discord.Message

            try:
                return await ctx.reply(embed=embed, mention_author=False)
            except (discord.NotFound, discord.HTTPException):
                return await ctx.channel.send(embed=embed)
        except discord.HTTPException as exc:
            logger.error("Failed to send response embed in BanSystem: %s", exc)
            return None

    async def _cleanup(self, ctx: commands.Context) -> None:
        """Safely delete original text invocation message if applicable."""
        if ctx.interaction:
            return
        try:
            if ctx.message:
                await ctx.message.delete()
        except (discord.Forbidden, discord.NotFound, discord.HTTPException):
            pass

    async def resolve_target(
        self,
        ctx: commands.Context,
        user_input: Union[discord.Member, discord.User, str, None],
    ) -> Union[discord.Member, discord.User, None]:
        """Resolve command target from parameter, message reply, or user ID."""
        guild = ctx.guild
        if guild is None:
            return None

        if isinstance(user_input, (discord.Member, discord.User)):
            return user_input

        if not user_input:
            if (ctx.message and ctx.message.reference and isinstance(
                    ctx.message.reference.resolved, discord.Message)):
                resolved_author = ctx.message.reference.resolved.author
                if isinstance(resolved_author, discord.Member):
                    return resolved_author
                return guild.get_member(resolved_author.id)

        if ctx.message and ctx.message.mentions:
            return ctx.message.mentions[0]

        try:
            user_id = int(user_input) if user_input else None
        except (TypeError, ValueError):
            return None

        if user_id is None:
            return None

        member = guild.get_member(user_id)
        if member:
            return member

        try:
            return await self.bot.fetch_user(user_id)
        except (discord.NotFound, discord.Forbidden, discord.HTTPException):
            return None

    async def validate_ban(
        self,
        ctx: commands.Context,
        target: Union[discord.Member, discord.User],
    ) -> Tuple[bool, Optional[str]]:
        """Validate if the moderator and bot can perform the ban operation."""
        guild = ctx.guild
        if guild is None:
            return False, "Invalid server configuration."

        moderator = ctx.author
        bot_member = guild.me
        if not isinstance(moderator, discord.Member) or bot_member is None:
            return False, "Invalid moderator context."

        if not isinstance(target, discord.Member):
            return True, None

        if target.id == moderator.id:
            return False, "You cannot ban yourself."

        if target.id == guild.owner_id:
            return False, "You cannot ban the server owner."

        if target.id == bot_member.id:
            return False, "You cannot ban me."

        if moderator != guild.owner and target.guild_permissions.administrator:
            return False, "You cannot ban another administrator."

        if moderator != guild.owner and target.top_role >= moderator.top_role:
            return False, "You cannot ban someone with an equal or higher role."

        if bot_member.top_role <= target.top_role:
            return (
                False,
                "I cannot ban this user because their role is higher than mine.",
            )

        return True, None

    async def send_ban_dm(
        self,
        target: Union[discord.Member, discord.User],
        guild: discord.Guild,
        moderator: discord.Member,
        reason: str,
    ) -> None:
        """Attempt to send a notification direct message to the banned user."""
        try:
            if reason != "No reason provided":
                description = (
                    f"{EMOJIS.get('ban', '🔨')} You were banned from **{guild.name}**\n\n"
                    f"{EMOJIS.get('arrow_point', '➡️')} **Moderator:** {moderator}\n"
                    f"{EMOJIS.get('arrow_point', '➡️')} **Reason:** {reason}")
            else:
                description = (
                    f"{EMOJIS.get('ban', '🔨')} You were banned from **{guild.name}**."
                )

            embed = make_embed(
                title="You Were Banned",
                description=description,
                level="ERROR",
            )
            await target.send(embed=embed)
        except (discord.Forbidden, discord.HTTPException):
            pass

    @commands.hybrid_command(name="ban",
                             description="Ban a member from the server.")
    @commands.guild_only()
    async def ban(
        self,
        ctx: commands.Context,
        user: Optional[Union[discord.Member, discord.User]] = None,
        *,
        reason: Optional[str] = None,
    ) -> None:
        """Ban a target user from the guild with an optional reason."""
        guild = ctx.guild
        if guild is None:
            return

        moderator = ctx.author
        bot_member = guild.me
        if not isinstance(moderator, discord.Member) or bot_member is None:
            return

        if not await self.has_ban_permission(ctx):
            await self._reply(
                ctx,
                "Permission Denied",
                f"{EMOJIS.get('fail', '❌')} You do not have permission to use this command.",
            )
            return

        reason = reason or "No reason provided"

        if not bot_member.guild_permissions.ban_members:
            await self._reply(
                ctx,
                "Permission Error",
                "I do not have the required permissions to ban members.",
            )
            return

        target = await self.resolve_target(ctx, user)
        if not target:
            prefix = ctx.clean_prefix
            await self._reply(
                ctx,
                "User Not Found",
                f"Usage: `{prefix}ban <user | id | reply> [reason]`",
            )
            return

        valid, error = await self.validate_ban(ctx, target)
        if not valid:
            await self._reply(ctx, "Permission Denied", error
                              or "Invalid target user.")
            return

        await self.send_ban_dm(
            target=target,
            guild=guild,
            moderator=moderator,
            reason=reason,
        )

        try:
            await guild.ban(
                target,
                reason=f"{reason} | Banned by {moderator}",
                delete_message_seconds=0,
            )
        except discord.Forbidden:
            await self._reply(
                ctx,
                "Action Failed",
                "I do not have permission to ban this user.",
            )
            return
        except discord.HTTPException:
            await self._reply(
                ctx,
                "Ban Failed",
                "An error occurred while attempting to ban this user.",
            )
            return

        await self._reply(
            ctx,
            "User Banned",
            f"{EMOJIS.get('ban', '🔨')} **{target}** has been banned.\n\n"
            f"{EMOJIS.get('arrow_point', '➡️')} **Reason:** {reason}",
            level="ERROR",
            show_footer=True,
        )

        await self._cleanup(ctx)

        try:
            await send_mod_log(
                guild=guild,
                category="BAN",
                title="User Banned",
                description=f"{target} was banned.",
                level="ERROR",
                actor=moderator,
                target=target,
                extra_fields={"Reason": reason},
            )
        except Exception as exc:
            logger.error("Failed to send mod log for ban: %s", exc)

    @commands.hybrid_command(name="unban",
                             description="Unban a user from the server.")
    @commands.guild_only()
    async def unban(
        self,
        ctx: commands.Context,
        user: Optional[discord.User] = None,
        *,
        reason: Optional[str] = None,
    ) -> None:
        """Unban a previously banned user by ID or User picker."""
        guild = ctx.guild
        if guild is None:
            return

        moderator = ctx.author
        if not isinstance(moderator, discord.Member):
            return

        if not await self.has_ban_permission(ctx):
            await self._reply(
                ctx,
                "Permission Denied",
                f"{EMOJIS.get('fail', '❌')} You do not have permission to use this command.",
            )
            return

        reason = reason or "No reason provided"

        if not user:
            prefix = ctx.clean_prefix
            await self._reply(
                ctx,
                "Missing User",
                f"Usage: `{prefix}unban <user id> [reason]`",
            )
            return

        try:
            ban_entry = await guild.fetch_ban(discord.Object(id=user.id))
        except discord.NotFound:
            await self._reply(
                ctx,
                "Not Banned",
                "That user is not currently banned on this server.",
                level="WARNING",
            )
            return
        except discord.HTTPException:
            await self._reply(ctx, "Error",
                              "Failed to fetch the ban entry records.")
            return

        try:
            await guild.unban(
                ban_entry.user,
                reason=f"{reason} | Unbanned by {moderator}",
            )
        except discord.Forbidden:
            await self._reply(
                ctx,
                "Permission Error",
                "I do not have permission to unban users.",
            )
            return
        except discord.HTTPException:
            await self._reply(
                ctx,
                "Unban Failed",
                "An error occurred while attempting to unban this user.",
            )
            return

        await self._reply(
            ctx,
            "User Unbanned",
            f"{EMOJIS.get('success', '✅')} **{ban_entry.user}** has been unbanned.\n\n"
            f"{EMOJIS.get('arrow_point', '➡️')} **Reason:** {reason}",
            level="SUCCESS",
            show_footer=True,
        )

        await self._cleanup(ctx)

        try:
            await send_mod_log(
                guild=guild,
                category="BAN",
                title="User Unbanned",
                description=f"{ban_entry.user} was unbanned.",
                level="SUCCESS",
                actor=moderator,
                target=ban_entry.user,
                extra_fields={"Reason": reason},
            )
        except Exception as exc:
            logger.error("Failed to send mod log for unban: %s", exc)


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(BanSystem(bot))
