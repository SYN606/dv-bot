from __future__ import annotations

import logging
from typing import Optional, Tuple, Union

import discord
from discord import app_commands
from discord.ext import commands

from db.db_helpers.warnings import (
    add_warning,
    clear_all_warnings,
    delete_warning_by_id,
    get_warnings,
)
from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS
from utils.logging.mod_log import send_mod_log
from utils.permissions.base_admin import BaseAdminCog

logger = logging.getLogger("DigitalVigital")


class WarnSystem(BaseAdminCog):
    """Cog for managing server infraction warnings and moderation history."""

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    async def _reply(
        self,
        ctx: commands.Context,
        title: str,
        description: str,
        level: str = "WARNING",
        show_footer: bool = False,
    ) -> None:
        """Send a standardized response embed handling slash and prefix interactions."""
        try:
            embed = make_embed(
                title=title,
                description=description,
                level=level,
            )
            if show_footer and ctx.author:
                embed.set_footer(
                    text=f"Action by : {ctx.author}",
                    icon_url=ctx.author.display_avatar.url,
                )

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
            logger.error("Failed sending response embed in Warn system: %s",
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
        user_input: Union[discord.Member, discord.User, str, None],
    ) -> Union[discord.Member, discord.User, None]:
        """Resolve command target into a member or user object."""
        guild = ctx.guild
        if not guild:
            return None

        if isinstance(user_input, (discord.Member, discord.User)):
            return user_input

        # Reply message resolution fallback
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

        try:
            user_id = int(str(user_input))
        except (TypeError, ValueError):
            return None

        member = guild.get_member(user_id)
        if member:
            return member

        try:
            return await self.bot.fetch_user(user_id)
        except (discord.NotFound, discord.Forbidden, discord.HTTPException):
            return None

    async def validate_warn(
        self, ctx: commands.Context,
        target: Union[discord.Member,
                      discord.User]) -> Tuple[bool, Optional[str]]:
        """Validate whether the moderator can issue an infraction to the target user."""
        guild = ctx.guild
        if not guild or not guild.me:
            return False, f"{EMOJIS.get('fail', '❌')} Invalid server context."

        moderator = ctx.author
        if not isinstance(moderator, discord.Member):
            return False, f"{EMOJIS.get('fail', '❌')} Invalid moderator context."

        if target.id == moderator.id:
            return False, f"{EMOJIS.get('fail', '❌')} You cannot warn yourself."
        if target.id == guild.me.id:
            return False, f"{EMOJIS.get('fail', '❌')} You cannot warn me."

        if isinstance(target, discord.Member):
            if target.id == guild.owner_id:
                return False, f"{EMOJIS.get('fail', '❌')} You cannot warn the server owner."
            if moderator.id != guild.owner_id and target.guild_permissions.administrator:
                return False, f"{EMOJIS.get('fail', '❌')} You cannot warn another administrator."
            if moderator.id != guild.owner_id and target.top_role >= moderator.top_role:
                return (
                    False,
                    f"{EMOJIS.get('fail', '❌')} You cannot warn someone with an equal or higher role.",
                )

        return True, None

    @commands.hybrid_command(
        name="warn",
        description="Issue a formal text warning infraction to a member",
    )
    @app_commands.describe(
        user="The target user (Mention or ID)",
        reason="A specific reason text must be provided",
    )
    @commands.guild_only()
    @commands.cooldown(1, 3.0, commands.BucketType.guild)
    async def legacy_warn(
        self,
        ctx: commands.Context,
        user: Optional[discord.User] = None,
        *,
        reason: Optional[str] = None,
    ) -> None:
        """Warn a user and record the infraction in the database."""
        if not ctx.guild or not reason or not reason.strip():
            await self._reply(
                ctx,
                title="Missing Parameters",
                description=
                f"{EMOJIS.get('fail', '❌')} **A specific reason text must be provided.**",
                level="ERROR",
            )
            return

        target = await self.resolve_target(ctx, user)
        if not target:
            prefix = ctx.clean_prefix
            await self._reply(
                ctx,
                title="User Not Found",
                description=(
                    f"{EMOJIS.get('fail', '❌')} Provide a valid target.\n"
                    f"Usage: `{prefix}warn <user | id> <reason>`"),
                level="ERROR",
            )
            return

        valid, error = await self.validate_warn(ctx, target)
        if not valid:
            await self._reply(
                ctx,
                title="Infraction Blocked",
                description=error
                or f"{EMOJIS.get('fail', '❌')} Validation failed.",
                level="ERROR",
            )
            return

        try:
            _, total_warns = await add_warning(
                guild_id=ctx.guild.id,
                user_id=target.id,
                moderator_id=ctx.author.id,
                reason=reason.strip(),
            )
        except Exception as exc:
            logger.error("Database error while adding warning: %s", exc)
            await self._reply(
                ctx,
                title="Database Error",
                description=
                f"{EMOJIS.get('fail', '❌')} Failed to log warning safely.",
                level="ERROR",
            )
            return

        try:
            dm_desc = (
                f"{EMOJIS.get('warning', '⚠️')} You were warned in **{ctx.guild.name}**\n\n"
                f"{EMOJIS.get('arrow_point', '➡️')} **Reason:** {reason.strip()}\n"
                f"{EMOJIS.get('arrow_point', '➡️')} **Total Active Track:** {total_warns}"
            )
            await target.send(embed=make_embed(title="Infraction Notice",
                                               description=dm_desc,
                                               level="WARNING"))
        except (discord.Forbidden, discord.HTTPException):
            pass

        desc = (
            f"{EMOJIS.get('warning', '⚠️')} **{target}** penalization recorded.\n\n"
            f"{EMOJIS.get('arrow_point', '➡️')} **Reason:** {reason.strip()}\n"
            f"{EMOJIS.get('arrow_point', '➡️')} **Total Warnings:** {total_warns}"
        )
        await self._reply(
            ctx,
            title="User Warned",
            description=desc,
            level="WARNING",
            show_footer=True,
        )

        try:
            await send_mod_log(
                guild=ctx.guild,
                category="WARN",
                title="User Infraction",
                description=f"{target} warned.",
                level="WARNING",
                actor=ctx.author,
                target=target,
                extra_fields={
                    "Reason": reason.strip(),
                    "Total Warnings": str(total_warns),
                },
            )
        except Exception as exc:
            logger.error("Failed sending mod log for warn: %s", exc)

        await self._cleanup(ctx)

    @commands.hybrid_command(
        name="warnings",
        aliases=["warnlist", "warns"],
        description="Check tracking logs for a member",
    )
    @app_commands.describe(
        user="The target user to investigate logs for (defaults to yourself)")
    @commands.guild_only()
    @commands.cooldown(2, 5.0, commands.BucketType.user)
    async def legacy_warnings(
        self,
        ctx: commands.Context,
        user: Optional[discord.User] = None,
    ) -> None:
        """Display active warning records for a user."""
        if not ctx.guild:
            return

        target = await self.resolve_target(ctx, user) or ctx.author
        try:
            records = await get_warnings(guild_id=ctx.guild.id,
                                         user_id=target.id)
        except Exception as exc:
            logger.error("Failed retrieving warnings: %s", exc)
            await self._reply(
                ctx,
                title="Data Retrieval Fail",
                description=
                f"{EMOJIS.get('fail', '❌')} Could not query tracking records.",
                level="ERROR",
            )
            return

        if not records:
            await self._reply(
                ctx,
                title="Clean Slate",
                description=
                f"{EMOJIS.get('success', '✅')} **{target}** has no active records.",
                level="SUCCESS",
            )
            return

        desc = f"Historical infraction data tracking **{target}**:\n\n"
        for r in records:
            desc += (
                f"**ID:** `{r.warn_id}` | <@{r.moderator_id}> | <t:{int(r.created_at.timestamp())}:R>\n"
                f"{EMOJIS.get('curved_arrow', '┕')} `{r.reason}`\n\n")

        await self._reply(
            ctx,
            title=f"Infractions: {target}",
            description=desc,
            level="WARNING",
        )

    @commands.hybrid_command(
        name="delwarn",
        aliases=["dw"],
        description="Remove an infraction row by ID",
    )
    @app_commands.describe(
        warn_id="The uniquely indexed ID sequence key of the warning")
    @commands.guild_only()
    @commands.cooldown(2, 4.0, commands.BucketType.user)
    async def delwarn(self, ctx: commands.Context, warn_id: int) -> None:
        """Delete a specific warning by its ID."""
        if not ctx.guild:
            return

        try:
            success, user_id, _ = await delete_warning_by_id(
                guild_id=ctx.guild.id, warn_id=warn_id)
        except Exception as exc:
            logger.error("Failed deleting warning ID %s: %s", warn_id, exc)
            await self._reply(
                ctx,
                title="Database Error",
                description=
                f"{EMOJIS.get('fail', '❌')} An error occurred while processing the deletion.",
                level="ERROR",
            )
            return

        if not success:
            await self._reply(
                ctx,
                title="Not Found",
                description=
                f"{EMOJIS.get('fail', '❌')} No record matches ID `{warn_id}`.",
                level="ERROR",
            )
            return

        target = ctx.guild.get_member(user_id) or await self.bot.fetch_user(
            user_id)
        name = str(target) if target else f"Unknown ({user_id})"

        await self._reply(
            ctx,
            title="Infraction Purged",
            description=
            f"{EMOJIS.get('success', '✅')} Cleared row `{warn_id}` for **{name}**.",
            level="SUCCESS",
        )
        await self._cleanup(ctx)

    @commands.hybrid_command(
        name="clearwarnings",
        aliases=["clswarns"],
        description="Wipe a member's moderation index",
    )
    @app_commands.describe(
        user="The targeted user to clear all tracking rows for")
    @commands.guild_only()
    @commands.cooldown(1, 10.0, commands.BucketType.guild)
    async def clearwarnings(
        self,
        ctx: commands.Context,
        user: Optional[discord.User] = None,
    ) -> None:
        """Clear all active warnings for a member."""
        if not ctx.guild or not isinstance(ctx.author, discord.Member):
            return

        target = await self.resolve_target(ctx, user)
        if not target:
            prefix = ctx.clean_prefix
            await self._reply(
                ctx,
                title="User Not Found",
                description=(
                    f"{EMOJIS.get('fail', '❌')} Please specify a valid user.\n"
                    f"Usage: `{prefix}clearwarnings <user>`"),
                level="ERROR",
            )
            return

        try:
            was_cleared = await clear_all_warnings(guild_id=ctx.guild.id,
                                                   user_id=target.id)
        except Exception as exc:
            logger.error("Failed clearing warnings for user %s: %s", target.id,
                         exc)
            await self._reply(
                ctx,
                title="Database Error",
                description=
                f"{EMOJIS.get('fail', '❌')} An error occurred while wiping history.",
                level="ERROR",
            )
            return

        if not was_cleared:
            await self._reply(
                ctx,
                title="Skipped",
                description=
                f"{EMOJIS.get('warning', '⚠️')} **{target}**'s logs are already empty.",
                level="WARNING",
            )
            return

        await self._reply(
            ctx,
            title="History Wiped",
            description=
            f"{EMOJIS.get('success', '✅')} Erased all warning data for **{target}**.",
            level="SUCCESS",
        )
        await self._cleanup(ctx)

    async def cog_command_error(
            self, ctx: commands.Context, error: Exception
        ) -> None:
            """Handle cooldown and permission failures gracefully."""
            if isinstance(error, commands.CommandOnCooldown):
                await self._reply(
                    ctx,
                    title="Rate Limit Enforced",
                    description=f"{EMOJIS.get('fail', '❌')} Try again in **{error.retry_after:.1f}s**.",
                    level="ERROR",
                )
            elif isinstance(error, commands.CheckFailure):
                await self._reply(
                    ctx,
                    title="Permission Denied",
                    description=f"{EMOJIS.get('fail', '❌')} Missing Staff Authorization.",
                    level="ERROR",
                )


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(WarnSystem(bot))
