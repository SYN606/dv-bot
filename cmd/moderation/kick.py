from __future__ import annotations

import logging
from typing import Optional, Tuple, Union

import discord
from discord import app_commands
from discord.ext import commands

from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS
from utils.logging.mod_log import send_mod_log
from utils.permissions.base_admin import BaseAdminCog

logger = logging.getLogger("DigitalVigil")


class KickSystem(BaseAdminCog):
    """Cog for managing member kicks within guilds."""

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    async def has_kick_permission(self, ctx: commands.Context) -> bool:
        """Check if the context author has permission to kick members."""
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

        return perms.kick_members

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
                    await ctx.interaction.followup.send(
                        embed=embed,
                        ephemeral=True,
                    )
                else:
                    await ctx.interaction.response.send_message(
                        embed=embed,
                        ephemeral=True,
                    )
                return None

            try:
                return await ctx.reply(embed=embed, mention_author=False)
            except (discord.NotFound, discord.HTTPException):
                return await ctx.channel.send(embed=embed)
        except discord.HTTPException as exc:
            logger.error("Failed to send response embed in KickSystem: %s",
                         exc)
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

    async def resolve_member(
        self,
        ctx: commands.Context,
        user_input: Union[discord.Member, discord.User, str, None],
    ) -> Optional[discord.Member]:
        """Resolve command target to a guild member from parameter, reply, or user ID."""
        guild = ctx.guild
        if guild is None:
            return None

        if isinstance(user_input, discord.Member):
            return user_input

        if isinstance(user_input, discord.User):
            return guild.get_member(user_input.id)

        if not user_input:
            if (ctx.message and ctx.message.reference and isinstance(
                    ctx.message.reference.resolved, discord.Message)):
                resolved_author = ctx.message.reference.resolved.author
                if isinstance(resolved_author, discord.Member):
                    return resolved_author
                return guild.get_member(resolved_author.id)

        if ctx.message and ctx.message.mentions:
            first_mention = ctx.message.mentions[0]
            if isinstance(first_mention, discord.Member):
                return first_mention
            return guild.get_member(first_mention.id)

        try:
            user_id = int(user_input) if user_input else None
        except (TypeError, ValueError):
            return None

        if user_id is None:
            return None

        return guild.get_member(user_id)

    async def validate_target(
            self, ctx: commands.Context,
            member: discord.Member) -> Tuple[bool, Optional[str]]:
        """Validate if the moderator and bot can perform the kick operation."""
        guild = ctx.guild
        if guild is None:
            return False, "Invalid server configuration."

        moderator = ctx.author
        bot_member = guild.me
        if not isinstance(moderator, discord.Member) or bot_member is None:
            return False, "Invalid moderator context."

        if member.id == moderator.id:
            return False, "You cannot kick yourself."

        if member.id == guild.owner_id:
            return False, "You cannot kick the server owner."

        if member.id == bot_member.id:
            return False, "You cannot kick me."

        if not bot_member.guild_permissions.kick_members:
            return False, "I do not have permission to kick members."

        if moderator != guild.owner and member.guild_permissions.administrator:
            return False, "You cannot kick another administrator."

        if moderator != guild.owner and member.top_role >= moderator.top_role:
            return False, "You cannot kick someone with an equal or higher role."

        if bot_member.top_role <= member.top_role:
            return False, "I cannot manage this member due to role hierarchy."

        return True, None

    async def send_kick_dm(
        self,
        member: discord.Member,
        guild: discord.Guild,
        moderator: discord.Member,
        reason: str,
    ) -> None:
        """Attempt to send a direct message to the member being kicked."""
        try:
            if reason != "No reason provided":
                description = (
                    f"{EMOJIS.get('warning', '⚠️')} You were kicked from **{guild.name}**\n\n"
                    f"{EMOJIS.get('arrow_point', '➡️')} **Moderator:** {moderator}\n"
                    f"{EMOJIS.get('arrow_point', '➡️')} **Reason:** {reason}")
            else:
                description = (
                    f"{EMOJIS.get('warning', '⚠️')} You were kicked from **{guild.name}**."
                )

            embed = make_embed(
                title="You Were Kicked",
                description=description,
                level="WARNING",
            )
            await member.send(embed=embed)
        except (discord.Forbidden, discord.HTTPException):
            pass

    @commands.hybrid_command(name="kick",
                             description="Kick a member from the server.")
    @app_commands.describe(
        member="The member to kick (Mention, User ID, or Reply)",
        reason="The reason for kicking the member",
    )
    @commands.guild_only()
    async def kick(
        self,
        ctx: commands.Context,
        member: Optional[discord.User] = None,
        *,
        reason: Optional[str] = None,
    ) -> None:
        """Kick a member from the server with an optional reason."""
        guild = ctx.guild
        if guild is None:
            return

        moderator = ctx.author
        bot_member = guild.me
        if not isinstance(moderator, discord.Member) or bot_member is None:
            return

        if not await self.has_kick_permission(ctx):
            await self._reply(
                ctx,
                "Permission Denied",
                f"{EMOJIS.get('fail', '❌')} You do not have permission to use this command.",
            )
            return

        reason = reason or "No reason provided"

        target_member = await self.resolve_member(ctx, member)
        if not target_member:
            prefix = ctx.clean_prefix
            await self._reply(
                ctx,
                "Invalid User",
                f"Usage: `{prefix}kick <member | id | reply> [reason]`",
            )
            return

        valid, error = await self.validate_target(ctx, target_member)
        if not valid:
            await self._reply(
                ctx,
                "Permission Denied",
                error or "Invalid target.",
            )
            return

        await self.send_kick_dm(
            member=target_member,
            guild=guild,
            moderator=moderator,
            reason=reason,
        )

        try:
            await target_member.kick(reason=f"{reason} | Kicked by {moderator}"
                                     )
        except discord.Forbidden:
            await self._reply(
                ctx,
                "Action Failed",
                "I do not have permission to kick this user.",
            )
            return
        except discord.HTTPException:
            await self._reply(
                ctx, "Kick Failed",
                "An error occurred while trying to kick the user.")
            return

        await self._reply(
            ctx,
            "User Kicked",
            f"{EMOJIS.get('warning', '⚠️')} **{target_member}** has been kicked.\n\n"
            f"{EMOJIS.get('arrow_point', '➡️')} **Reason:** {reason}",
            level="WARNING",
            show_footer=True)

        await self._cleanup(ctx)

        try:
            await send_mod_log(guild=guild,
                               category="KICK",
                               title="User Kicked",
                               description=f"{target_member} was kicked.",
                               level="WARNING",
                               actor=moderator,
                               target=target_member,
                               extra_fields={"Reason": reason})
        except Exception as exc:
            logger.error("Failed to send mod log for kick: %s", exc)


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(KickSystem(bot))
