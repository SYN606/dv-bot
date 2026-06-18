import discord
from discord.ext import commands
from utils.permissions.base_admin import BaseAdminCog, admin_command
from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS
from utils.logging.mod_log import send_mod_log
from typing import Union, List, Optional
from db.db_helpers.warnings import (
    add_warning,
    get_warnings,
    delete_warning_by_id,
    clear_all_warnings,
    WarningRecord,
)


class WarnSystem(BaseAdminCog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    async def _reply(
        self,
        ctx: commands.Context,
        title: str,
        description: str,
        level: str = "WARNING",
        show_footer: bool = False,
    ):
        try:
            embed = make_embed(title=title, description=description, level=level)
            if show_footer and ctx.author:
                embed.set_footer(
                    text=f"Action by : {ctx.author}",
                    icon_url=ctx.author.display_avatar.url,
                )
            try:
                return await ctx.reply(embed=embed, mention_author=False)
            except (discord.NotFound, discord.HTTPException):  # FIXED: Wrapped in parentheses
                return await ctx.channel.send(embed=embed)
        except discord.HTTPException:
            return None

    async def _cleanup(self, ctx: commands.Context):
        try:
            if ctx.message:
                await ctx.message.delete()
        except (discord.Forbidden, discord.NotFound, discord.HTTPException):  # FIXED: Wrapped in parentheses
            pass

    async def resolve_target(
        self, ctx: commands.Context, user_input: Optional[str]
    ) -> Union[discord.Member, discord.User, None]:
        try:
            guild = ctx.guild
            if guild is None:
                return None
            if isinstance(user_input, discord.Member):
                return user_input
            if not user_input:
                if (
                    ctx.message
                    and ctx.message.reference
                    and isinstance(ctx.message.reference.resolved, discord.Message)
                ):
                    resolved_author = ctx.message.reference.resolved.author
                    if isinstance(resolved_author, discord.Member):
                        return resolved_author
                    return guild.get_member(resolved_author.id)
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
        except Exception:
            return None

    async def validate_warn(
        self, ctx: commands.Context, target: Union[discord.Member, discord.User]
    ):
        guild = ctx.guild
        if guild is None:
            return False, "Invalid server configuration."
        moderator = ctx.author
        bot_member = guild.me
        if not isinstance(moderator, discord.Member) or bot_member is None:
            return False, "Invalid moderator context."
        if target.id == moderator.id:
            return False, "You cannot warn yourself."
        if target.id == bot_member.id:
            return False, "You cannot warn me."

        if isinstance(target, discord.Member):
            if target.id == guild.owner_id:
                return False, "You cannot warn the server owner."
            if moderator != guild.owner and target.guild_permissions.administrator:
                return False, "You cannot warn another administrator."
            if moderator != guild.owner and target.top_role >= moderator.top_role:
                return False, "You cannot warn someone with an equal or higher role."
        return True, None

    # PURE PREFIX MODERATION ENGINE WITH COOLDOWNS
    @admin_command(
        name="warn", description="Issue a formal text warning infraction to a member"
    )
    @commands.guild_only()
    @commands.cooldown(1, 3.0, commands.BucketType.guild)
    async def legacy_warn(
        self,
        ctx: commands.Context,
        user: Optional[str] = None,
        *,
        reason: Optional[str] = None,
    ):
        try:
            if ctx.guild is None or ctx.guild.id is None:
                return

            if not reason or reason.strip() == "":
                return await self._reply(
                    ctx,
                    "Missing Parameters",
                    f"{EMOJIS.get('fail', '❌')} **A specific reason text must be provided.**",
                    level="ERROR",
                )

            assert reason is not None
            safe_reason: str = reason

            target = await self.resolve_target(ctx, user)
            if not target:
                return await self._reply(
                    ctx, "User Not Found", "Usage: `warn <user | id> <reason>`"
                )

            valid, error = await self.validate_warn(ctx, target)
            if not valid:
                return await self._reply(
                    ctx, "Infraction Blocked", error or "Validation failed."
                )

            try:
                _, total_warns = await add_warning(
                    guild_id=int(ctx.guild.id),
                    user_id=int(target.id),
                    moderator_id=int(ctx.author.id),
                    reason=safe_reason,
                )
            except Exception:
                return await self._reply(
                    ctx,
                    "Database Error",
                    f"{EMOJIS.get('fail', '❌')} Failed to log warning safely.",
                    level="ERROR",
                )

            try:
                dm_desc = (
                    f"{EMOJIS.get('warning', '⚠️')} You were warned in **{ctx.guild.name}**\n\n"
                    f"{EMOJIS.get('arrow_point', '➡️')} **Reason:** {safe_reason}\n"
                    f"{EMOJIS.get('arrow_point', '➡️')} **Total Active Track:** {total_warns}"
                )
                await target.send(
                    embed=make_embed(
                        title="Infraction Notice", description=dm_desc, level="WARNING"
                    )
                )
            except Exception:
                pass

            description_text = (
                f"{EMOJIS.get('warning', '⚠️')} **{target}** penalization recorded.\n\n"
                f"{EMOJIS.get('arrow_point', '➡️')} **Reason:** {safe_reason}\n"
                f"{EMOJIS.get('arrow_point', '➡️')} **Total Warnings:** {total_warns}"
            )

            await self._reply(
                ctx, "User Warned", description_text, level="WARNING", show_footer=True
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
                    extra_fields={"Reason": safe_reason},
                )
            except Exception:
                pass

            await self._cleanup(ctx)
        except Exception:
            pass

    @admin_command(
        name="warnings",
        aliases=["warnlist", "warns"],
        description="Check tracking logs for a member",
    )
    @commands.guild_only()
    @commands.cooldown(2, 5.0, commands.BucketType.user)
    async def legacy_warnings(self, ctx: commands.Context, user: Optional[str] = None):
        try:
            if ctx.guild is None:
                return

            resolved_target = await self.resolve_target(ctx, user)
            target = resolved_target if resolved_target is not None else ctx.author

            try:
                records: List[WarningRecord] = await get_warnings(
                    guild_id=int(ctx.guild.id), user_id=int(target.id)
                )
            except Exception:
                return await self._reply(
                    ctx,
                    "Data Retrieval Fail",
                    "Could not query tracking records at this time.",
                    level="ERROR",
                )

            if not records:
                return await self._reply(
                    ctx,
                    "Clean Slate",
                    f"{EMOJIS.get('success', '✅')} **{target}** has no active history records.",
                    level="SUCCESS",
                )

            description = (
                f"Historical infrastructure infraction data tracking **{target}**:\n\n"
            )
            for r in records:
                description += f"**ID:** `{r.warn_id}` | <@{r.moderator_id}> | <t:{int(r.created_at.timestamp())}:R>\n{EMOJIS.get('curved_arrow', '┕')} `{r.reason}`\n\n"

            embed = make_embed(
                title=f"Infractions: {target}", description=description, level="WARNING"
            )
            await ctx.reply(embed=embed, mention_author=False)
        except Exception:
            pass

    @admin_command(
        name="delwarn",
        description="Remove an infraction tracking row sequence by numerical ID key",
        aliases=["dw"],
    )
    @commands.guild_only()
    @commands.cooldown(2, 4.0, commands.BucketType.user)
    async def delwarn(self, ctx: commands.Context, warn_id: int):
        try:
            if ctx.guild is None or ctx.guild.id is None:
                return

            try:
                success, user_id, reason = await delete_warning_by_id(
                    guild_id=int(ctx.guild.id), warn_id=warn_id
                )
            except Exception:
                return await self._reply(
                    ctx,
                    "Database Error",
                    "Failed to alter rows on index.",
                    level="ERROR",
                )

            if not success:
                return await self._reply(
                    ctx,
                    "Not Found",
                    f"{EMOJIS.get('fail', '❌')} No warning record matches the ID key `{warn_id}`.",
                )

            resolved_target = ctx.guild.get_member(user_id)
            if not resolved_target:
                try:
                    resolved_target = await self.bot.fetch_user(user_id)
                except discord.HTTPException:
                    resolved_target = None

            target_name = (
                f"Unknown User ({user_id})"
                if resolved_target is None
                else str(resolved_target)
            )
            reply_text = f"{EMOJIS.get('success', '✅')} Cleared warning sequence row `{warn_id}` for **{target_name}**."

            await self._reply(ctx, "Infraction Purged", reply_text, level="SUCCESS")
            await self._cleanup(ctx)
        except Exception:
            pass

    @admin_command(
        name="clearwarnings",
        description="Wipe a member's moderation warning index completely clean",
        aliases=["clswarns"],
    )
    @commands.guild_only()
    @commands.cooldown(1, 10.0, commands.BucketType.guild)
    async def clearwarnings(self, ctx: commands.Context, user: Optional[str] = None):
        try:
            if (
                ctx.guild is None
                or ctx.guild.id is None
                or not isinstance(ctx.author, discord.Member)
            ):
                return

            target = await self.resolve_target(ctx, user)
            if target is None:
                return await self._reply(
                    ctx, "User Not Found", "Please specify a valid user to clear."
                )

            safe_user_id: int = int(target.id)

            try:
                was_cleared = await clear_all_warnings(
                    guild_id=int(ctx.guild.id), user_id=safe_user_id
                )
            except Exception:
                return await self._reply(
                    ctx,
                    "Clearance Failure",
                    "Database table drops aborted unexpectedly.",
                    level="ERROR",
                )

            if not was_cleared:
                return await self._reply(
                    ctx,
                    "Skipped",
                    f"{EMOJIS.get('warning', '⚠️')} **{target}**'s history logs are already empty.",
                    level="WARNING",
                )

            success_text = f"{EMOJIS.get('success', '✅')} Erased all logged tracking data for **{target}**."
            await self._reply(ctx, "History Wiped", success_text, level="SUCCESS")
            await self._cleanup(ctx)
        except Exception:
            pass

    # SYSTEM COOLDOWN RATE ERROR HANDLER
    @legacy_warn.error
    @legacy_warnings.error
    @delwarn.error
    @clearwarnings.error
    async def cog_command_error(
        self, ctx: commands.Context, error: commands.CommandError
    ):
        if isinstance(error, commands.CommandOnCooldown):
            await self._reply(
                ctx,
                "Rate Limit Enforced",
                f"{EMOJIS.get('fail', '❌')} System cooling down. Try again in **{error.retry_after:.1f}s**.",
                level="ERROR",
            )
        elif isinstance(error, commands.CheckFailure):
            await self._reply(
                ctx,
                "Permission Denied",
                f"{EMOJIS.get('fail', '❌')} Missing Staff Authorization.",
                level="ERROR",
            )
        elif isinstance(error, commands.NoPrivateMessage):
            pass


async def setup(bot: commands.Bot):
    await bot.add_cog(WarnSystem(bot))