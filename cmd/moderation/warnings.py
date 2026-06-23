import discord
from discord.ext import commands
from typing import Union, Optional
from utils.permissions.base_admin import BaseAdminCog, admin_command
from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS
from utils.logging.mod_log import send_mod_log
from db.db_helpers.warnings import (
    add_warning,
    get_warnings,
    delete_warning_by_id,
    clear_all_warnings,
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
            embed = make_embed(title=title,
                               description=description,
                               level=level)
            if show_footer and ctx.author:
                embed.set_footer(
                    text=f"Action by : {ctx.author}",
                    icon_url=ctx.author.display_avatar.url,
                )
            try:
                return await ctx.reply(embed=embed, mention_author=False)
            except (discord.NotFound, discord.HTTPException):
                return await ctx.channel.send(embed=embed)
        except discord.HTTPException:
            return None

    async def _cleanup(self, ctx: commands.Context):
        try:
            if ctx.message:
                await ctx.message.delete()
        except (discord.Forbidden, discord.NotFound, discord.HTTPException):
            pass

    async def resolve_target(
        self, ctx: commands.Context, user_input: Optional[str]
    ) -> Union[discord.Member, discord.User, None]:
        guild = ctx.guild
        if not guild:
            return None

        if isinstance(user_input, discord.Member):
            return user_input

        if not user_input:
            if (ctx.message and ctx.message.reference and isinstance(
                    ctx.message.reference.resolved, discord.Message)):
                resolved_author = ctx.message.reference.resolved.author
                if isinstance(resolved_author, discord.Member):
                    return resolved_author
                return guild.get_member(resolved_author.id)
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

    async def validate_warn(self, ctx: commands.Context,
                            target: Union[discord.Member, discord.User]):
        guild = ctx.guild
        if not guild:
            return False, "Invalid server configuration."

        moderator = ctx.author
        if not isinstance(moderator, discord.Member):
            return False, "Invalid moderator context."

        if target.id == moderator.id:
            return False, "You cannot warn yourself."
        if target.id == guild.me.id:
            return False, "You cannot warn me."

        if isinstance(target, discord.Member):
            if target.id == guild.owner_id:
                return False, "You cannot warn the server owner."
            if (moderator.id != guild.owner_id
                    and target.guild_permissions.administrator):
                return False, "You cannot warn another administrator."
            if moderator.id != guild.owner_id and target.top_role >= moderator.top_role:
                return False, "You cannot warn someone with an equal or higher role."
        return True, None

    @admin_command(
        name="warn",
        description="Issue a formal text warning infraction to a member")
    @commands.guild_only()
    @commands.cooldown(1, 3.0, commands.BucketType.guild)
    async def legacy_warn(
        self,
        ctx: commands.Context,
        user: Optional[str] = None,
        *,
        reason: Optional[str] = None,
    ):
        if not ctx.guild or not reason or not reason.strip():
            return await self._reply(
                ctx,
                "Missing Parameters",
                f"{EMOJIS.get('fail', '❌')} **A specific reason text must be provided.**",
                level="ERROR",
            )

        target = await self.resolve_target(ctx, user)
        if not target:
            return await self._reply(ctx, "User Not Found",
                                     "Usage: `warn <user | id> <reason>`")

        valid, error = await self.validate_warn(ctx, target)
        if not valid:
            return await self._reply(ctx, "Infraction Blocked", error
                                     or "Validation failed.")

        try:
            _, total_warns = await add_warning(
                guild_id=ctx.guild.id,
                user_id=target.id,
                moderator_id=ctx.author.id,
                reason=reason,
            )
        except Exception:
            return await self._reply(
                ctx,
                "Database Error",
                f"{EMOJIS.get('fail', '❌')} Failed to log warning safely.",
                level="ERROR",
            )

        try:
            dm_desc = f"{EMOJIS.get('warning', '⚠️')} You were warned in **{ctx.guild.name}**\n\n{EMOJIS.get('arrow_point', '➡️')} **Reason:** {reason}\n{EMOJIS.get('arrow_point', '➡️')} **Total Active Track:** {total_warns}"
            await target.send(embed=make_embed(title="Infraction Notice",
                                               description=dm_desc,
                                               level="WARNING"))
        except Exception:
            pass

        desc = f"{EMOJIS.get('warning', '⚠️')} **{target}** penalization recorded.\n\n{EMOJIS.get('arrow_point', '➡️')} **Reason:** {reason}\n{EMOJIS.get('arrow_point', '➡️')} **Total Warnings:** {total_warns}"
        await self._reply(ctx,
                          "User Warned",
                          desc,
                          level="WARNING",
                          show_footer=True)

        try:
            await send_mod_log(
                guild=ctx.guild,
                category="WARN",
                title="User Infraction",
                description=f"{target} warned.",
                level="WARNING",
                actor=ctx.author,
                target=target,
                extra_fields={"Reason": reason},
            )
        except Exception:
            pass
        await self._cleanup(ctx)

    @admin_command(
        name="warnings",
        aliases=["warnlist", "warns"],
        description="Check tracking logs for a member",
    )
    @commands.guild_only()
    @commands.cooldown(2, 5.0, commands.BucketType.user)
    async def legacy_warnings(self,
                              ctx: commands.Context,
                              user: Optional[str] = None):
        if not ctx.guild:
            return
        target = await self.resolve_target(ctx, user) or ctx.author
        try:
            records = await get_warnings(guild_id=ctx.guild.id,
                                         user_id=target.id)
        except Exception:
            return await self._reply(
                ctx,
                "Data Retrieval Fail",
                "Could not query tracking records.",
                level="ERROR",
            )

        if not records:
            return await self._reply(
                ctx,
                "Clean Slate",
                f"{EMOJIS.get('success', '✅')} **{target}** has no active records.",
                level="SUCCESS",
            )

        desc = f"Historical infraction data tracking **{target}**:\n\n"
        for r in records:
            desc += f"**ID:** `{r.warn_id}` | <@{r.moderator_id}> | <t:{int(r.created_at.timestamp())}:R>\n{EMOJIS.get('curved_arrow', '┕')} `{r.reason}`\n\n"
        await ctx.reply(
            embed=make_embed(title=f"Infractions: {target}",
                             description=desc,
                             level="WARNING"),
            mention_author=False,
        )

    @admin_command(name="delwarn",
                   description="Remove an infraction row by ID",
                   aliases=["dw"])
    @commands.guild_only()
    @commands.cooldown(2, 4.0, commands.BucketType.user)
    async def delwarn(self, ctx: commands.Context, warn_id: int):
        if not ctx.guild:
            return
        success, user_id, _ = await delete_warning_by_id(guild_id=ctx.guild.id,
                                                         warn_id=warn_id)
        if not success:
            return await self._reply(
                ctx,
                "Not Found",
                f"{EMOJIS.get('fail', '❌')} No record matches ID `{warn_id}`.",
            )

        target = ctx.guild.get_member(user_id) or await self.bot.fetch_user(
            user_id)
        name = str(target) if target else f"Unknown ({user_id})"
        await self._reply(
            ctx,
            "Infraction Purged",
            f"{EMOJIS.get('success', '✅')} Cleared row `{warn_id}` for **{name}**.",
            level="SUCCESS",
        )
        await self._cleanup(ctx)

    @admin_command(
        name="clearwarnings",
        description="Wipe a member's moderation index",
        aliases=["clswarns"],
    )
    @commands.guild_only()
    @commands.cooldown(1, 10.0, commands.BucketType.guild)
    async def clearwarnings(self,
                            ctx: commands.Context,
                            user: Optional[str] = None):
        if not ctx.guild or not isinstance(ctx.author, discord.Member):
            return
        target = await self.resolve_target(ctx, user)
        if not target:
            return await self._reply(ctx, "User Not Found",
                                     "Please specify a valid user.")

        was_cleared = await clear_all_warnings(guild_id=ctx.guild.id,
                                               user_id=target.id)
        if not was_cleared:
            return await self._reply(
                ctx,
                "Skipped",
                f"{EMOJIS.get('warning', '⚠️')} **{target}**'s logs are already empty.",
                level="WARNING",
            )

        await self._reply(
            ctx,
            "History Wiped",
            f"{EMOJIS.get('success', '✅')} Erased all data for **{target}**.",
            level="SUCCESS",
        )
        await self._cleanup(ctx)

    @legacy_warn.error  # type: ignore
    @legacy_warnings.error  # type: ignore
    @delwarn.error  # type: ignore
    @clearwarnings.error  # type: ignore
    async def cog_command_error(self, ctx: commands.Context,
                                error: commands.CommandError):
        if isinstance(error, commands.CommandOnCooldown):
            await self._reply(
                ctx,
                "Rate Limit Enforced",
                f"{EMOJIS.get('fail', '❌')} Try again in **{error.retry_after:.1f}s**.",
                level="ERROR",
            )
        elif isinstance(error, commands.CheckFailure):
            await self._reply(
                ctx,
                "Permission Denied",
                f"{EMOJIS.get('fail', '❌')} Missing Staff Authorization.",
                level="ERROR",
            )


async def setup(bot: commands.Bot):
    await bot.add_cog(WarnSystem(bot))
