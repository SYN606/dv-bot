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


class FakeBanSystem(BaseAdminCog):
    """Cog for simulating user bans with direct messaging and mock moderation logs."""

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    async def has_fake_ban_permission(self, ctx: commands.Context) -> bool:
        """Check if the author has required permissions to execute simulated ban commands."""
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

        return perms.ban_members or perms.manage_messages

    async def _reply(
        self,
        ctx: commands.Context,
        title: str,
        description: str,
        level: str = "ERROR",
        show_footer: bool = False,
    ) -> None:
        """Send a standardized response embed handling slash and prefix interactions."""
        embed = make_embed(title=title, description=description, level=level)

        if show_footer and ctx.author:
            embed.set_footer(
                text=f"Action by : {ctx.author}",
                icon_url=ctx.author.display_avatar.url,
            )

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
                try:
                    await ctx.reply(embed=embed, mention_author=False)
                except (discord.NotFound, discord.HTTPException):
                    await ctx.channel.send(embed=embed)
        except discord.HTTPException as exc:
            logger.error("Failed sending response embed in FakeBan system: %s",
                         exc)

    async def _cleanup(self, ctx: commands.Context) -> None:
        """Safely delete command invocation message where applicable."""
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
        user_input: discord.User | discord.Member | None,
    ) -> discord.Member | discord.User | None:
        """Resolve command target into a member or user object."""
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
                return guild.get_member(resolved_author.id) or resolved_author
            return None

        if ctx.message and ctx.message.mentions:
            return ctx.message.mentions[0]

        return None

    async def validate_fake_ban(
        self,
        ctx: commands.Context,
        target: discord.Member | discord.User,
    ) -> Tuple[bool, Optional[str]]:
        """Validate if the moderator can execute a fake ban on the target."""
        guild = ctx.guild
        if guild is None:
            return False, f"{EMOJIS.get('fail', '❌')} Invalid server configuration."

        moderator = ctx.author
        if not isinstance(moderator, discord.Member):
            return False, f"{EMOJIS.get('fail', '❌')} Invalid moderator context."

        if not isinstance(target, discord.Member):
            return True, None

        if target.id == moderator.id:
            return False, f"{EMOJIS.get('fail', '❌')} You cannot fake ban yourself."

        if target.id == guild.owner_id:
            return False, f"{EMOJIS.get('fail', '❌')} You cannot fake ban the server owner."

        # Security Check: Standard staff cannot fake ban administrators or higher ranks
        if (moderator != guild.owner and target.guild_permissions.administrator
                and not moderator.guild_permissions.administrator):
            return (
                False,
                f"{EMOJIS.get('fail', '❌')} You do not have permission to fake ban an administrator.",
            )

        if (moderator != guild.owner and target.top_role >= moderator.top_role
                and not moderator.guild_permissions.administrator):
            return (
                False,
                f"{EMOJIS.get('fail', '❌')} You cannot fake ban someone with an equal or higher role.",
            )

        return True, None

    async def send_ban_dm(
        self,
        target: discord.Member | discord.User,
        guild: discord.Guild,
        moderator: discord.Member,
        reason: str,
    ) -> None:
        """Send simulated ban direct message notice to target."""
        try:
            if reason != "No reason provided":
                description = (
                    f"{EMOJIS.get('ban', '🔨')} You were banned from **{guild.name}**\n\n"
                    f"{EMOJIS.get('arrow_point', '➡️')} **Moderator:** {moderator}\n"
                    f"{EMOJIS.get('arrow_point', '➡️')} **Reason:** {reason}")
            else:
                description = f"{EMOJIS.get('ban', '🔨')} You were banned from **{guild.name}**."

            embed = make_embed(
                title="You Were Banned",
                description=description,
                level="ERROR",
            )
            await target.send(embed=embed)
        except (discord.Forbidden, discord.HTTPException):
            pass

    @commands.hybrid_command(
        name="fakeban",
        description=
        "Simulate a user ban completely (Sends DM and custom channel warnings)",
        aliases=["fban", "fb"],
    )
    @commands.guild_only()
    @app_commands.describe(
        user="The target member to fake ban (Mention or ID)",
        reason="The mock reason for the ban logs",
    )
    async def fakeban(
        self,
        ctx: commands.Context,
        user: Optional[discord.User] = None,
        *,
        reason: Optional[str] = None,
    ) -> None:
        """Execute mock ban action."""
        guild = ctx.guild
        if guild is None:
            return

        moderator = ctx.author
        if not isinstance(moderator, discord.Member):
            return

        if not await self.has_fake_ban_permission(ctx):
            await self._reply(
                ctx,
                title="Permission Denied",
                description=
                f"{EMOJIS.get('fail', '❌')} You do not have permission to use mock operations.",
                level="ERROR",
            )
            return

        actual_reason = reason.strip(
        ) if reason and reason.strip() else "No reason provided"

        target = await self.resolve_target(ctx, user)
        if not target:
            prefix = ctx.clean_prefix
            await self._reply(
                ctx,
                title="User Not Found",
                description=
                f"{EMOJIS.get('fail', '❌')} Provide a valid user.\nUsage: `{prefix}fakeban <user | id | reply> [reason]`",
                level="ERROR",
            )
            return

        valid, error = await self.validate_fake_ban(ctx, target)
        if not valid:
            await self._reply(
                ctx,
                title="Permission Denied",
                description=error
                or f"{EMOJIS.get('fail', '❌')} Invalid target user.",
                level="ERROR",
            )
            return

        await self.send_ban_dm(
            target=target,
            guild=guild,
            moderator=moderator,
            reason=actual_reason,
        )

        await self._reply(
            ctx,
            title="User Banned",
            description=(
                f"{EMOJIS.get('ban', '🔨')} **{target}** has been banned.\n\n"
                f"{EMOJIS.get('arrow_point', '➡️')} **Reason:** {actual_reason}"
            ),
            level="ERROR",
            show_footer=True,
        )

        await self._cleanup(ctx)

        try:
            await send_mod_log(
                guild=guild,
                category="BAN",
                title="User Banned",
                description=f"{target} was banned by administrative controls.",
                level="ERROR",
                actor=moderator,
                target=target,
                extra_fields={
                    "Reason": actual_reason,
                    "Type": "Simulated Action",
                },
            )
        except Exception as exc:
            logger.error("Failed sending mod log for fakeban: %s", exc)


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(FakeBanSystem(bot))
