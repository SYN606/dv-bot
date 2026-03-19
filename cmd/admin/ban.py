import discord
from discord.ext import commands

from utils.permissions.base_admin import BaseAdminCog
from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS
from utils.logging.mod_log import send_mod_log
from utils.logging.notifier import ModNotifier


async def _cleanup(ctx: commands.Context) -> None:
    try:
        await ctx.message.delete()
    except discord.Forbidden, discord.NotFound:
        pass


class BanSystem(BaseAdminCog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    # =========================================================
    # Reply Resolve
    # =========================================================
    def _resolve_from_reply(self, ctx: commands.Context):
        ref = ctx.message.reference
        if ref and isinstance(ref.resolved, discord.Message):
            return ctx.guild.get_member(ref.resolved.author.id)
        return None

    # =========================================================
    # Resolve User
    # =========================================================
    async def _resolve_user(self, ctx, user_input):
        guild = ctx.guild

        if isinstance(user_input, discord.Member):
            return user_input

        if not user_input:
            return self._resolve_from_reply(ctx)

        try:
            user_id = int(user_input)
        except ValueError:
            return None

        member = guild.get_member(user_id)
        if member:
            return member

        try:
            return await self.bot.fetch_user(user_id)
        except discord.NotFound, discord.HTTPException:
            return None

    # =========================================================
    # BAN
    # =========================================================
    @commands.command(name="ban")
    @commands.guild_only()
    async def ban(self, ctx, user=None, *, reason=None):

        guild = ctx.guild
        moderator = ctx.author
        bot_member = guild.me

        reason = reason or "No reason provided"

        if not bot_member.guild_permissions.ban_members:
            return await ctx.reply(
                embed=make_embed(
                    title="Permission Error",
                    description="I do not have permission to ban members.",
                    level="ERROR",
                ),
                mention_author=False,
            )

        target = await self._resolve_user(ctx, user)

        if not target:
            return await ctx.reply(
                embed=make_embed(
                    title="User Not Found",
                    description="Usage: dv ban <user | id | reply> [reason]",
                    level="ERROR",
                ),
                mention_author=False,
            )

        # =====================================================
        # Member Checks
        # =====================================================
        if isinstance(target, discord.Member):
            if target == moderator:
                return await ctx.reply(
                    embed=make_embed(
                        title="Invalid Action",
                        description="You cannot ban yourself.",
                        level="ERROR",
                    ),
                    mention_author=False,
                )

            if target == guild.owner:
                return await ctx.reply(
                    embed=make_embed(
                        title="Permission Denied",
                        description="You cannot ban the server owner.",
                        level="ERROR",
                    ),
                    mention_author=False,
                )

            if target == bot_member:
                return await ctx.reply(
                    embed=make_embed(
                        title="Invalid Target",
                        description="You cannot ban me.",
                        level="ERROR",
                    ),
                    mention_author=False,
                )

            if moderator != guild.owner:
                if target.guild_permissions.administrator:
                    return await ctx.reply(
                        embed=make_embed(
                            title="Permission Denied",
                            description="You cannot ban another administrator.",
                            level="ERROR",
                        ),
                        mention_author=False,
                    )

                if target.top_role >= moderator.top_role:
                    return await ctx.reply(
                        embed=make_embed(
                            title="Hierarchy Error",
                            description="You cannot ban someone with equal or higher role.",
                            level="ERROR",
                        ),
                        mention_author=False,
                    )

            if bot_member.top_role <= target.top_role:
                return await ctx.reply(
                    embed=make_embed(
                        title="Bot Hierarchy Error",
                        description="I cannot manage this member due to role hierarchy.",
                        level="ERROR",
                    ),
                    mention_author=False,
                )

            # DM (safe)
            try:
                await ModNotifier.notify_ban(
                    member=target,
                    guild_name=guild.name,
                    moderator=moderator,
                    reason=reason,
                )
            except Exception:
                pass

        # =====================================================
        # EXECUTE BAN (SAFE)
        # =====================================================
        try:
            await guild.ban(
                target,
                reason=f"{reason} | Banned by {moderator}",
                delete_message_seconds=0,
            )
        except discord.Forbidden:
            return await ctx.reply(
                embed=make_embed(
                    title="Action Failed",
                    description="I do not have permission to ban this user.",
                    level="ERROR",
                ),
                mention_author=False,
            )
        except discord.HTTPException:
            return await ctx.reply(
                embed=make_embed(
                    title="Ban Failed",
                    description="An error occurred while banning the user.",
                    level="ERROR",
                ),
                mention_author=False,
            )

        # =====================================================
        # RESPONSE
        # =====================================================
        try:
            await ctx.reply(
                embed=make_embed(
                    title="User Banned",
                    description=(
                        f"{EMOJIS['ban']} {target}\n\n"
                        f"{EMOJIS['arrow_point']} Reason: {reason}"
                    ),
                    level="ERROR",
                ),
                mention_author=False,
            )
        except Exception:
            pass

        # =====================================================
        # LOGGING
        # =====================================================
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
        except Exception:
            pass

        await _cleanup(ctx)

    # =========================================================
    # UNBAN
    # =========================================================
    @commands.command(name="unban")
    @commands.guild_only()
    async def unban(self, ctx, user=None, *, reason=None):

        guild = ctx.guild
        moderator = ctx.author
        reason = reason or "No reason provided"

        if not user:
            return await ctx.reply(
                embed=make_embed(
                    title="Missing User",
                    description="Usage: dv unban <user id> [reason]",
                    level="ERROR",
                ),
                mention_author=False,
            )

        try:
            user_id = int(user)
        except ValueError:
            return await ctx.reply(
                embed=make_embed(
                    title="Invalid ID",
                    description="Please provide a valid user ID.",
                    level="ERROR",
                ),
                mention_author=False,
            )

        try:
            banned_entry = await guild.fetch_ban(discord.Object(id=user_id))
        except discord.NotFound:
            return await ctx.reply(
                embed=make_embed(
                    title="Not Banned",
                    description="That user is not banned.",
                    level="WARNING",
                ),
                mention_author=False,
            )
        except discord.HTTPException:
            return await ctx.reply(
                embed=make_embed(
                    title="Error",
                    description="Failed to fetch ban entry.",
                    level="ERROR",
                ),
                mention_author=False,
            )

        try:
            await guild.unban(
                banned_entry.user,
                reason=f"{reason} | Unbanned by {moderator}",
            )
        except discord.Forbidden:
            return await ctx.reply(
                embed=make_embed(
                    title="Permission Error",
                    description="I do not have permission to unban users.",
                    level="ERROR",
                ),
                mention_author=False,
            )
        except discord.HTTPException:
            return await ctx.reply(
                embed=make_embed(
                    title="Unban Failed",
                    description="An error occurred while unbanning.",
                    level="ERROR",
                ),
                mention_author=False,
            )

        try:
            await ctx.reply(
                embed=make_embed(
                    title="User Unbanned",
                    description=(
                        f"{EMOJIS['success']} {banned_entry.user}\n\n"
                        f"{EMOJIS['arrow_point']} Reason: {reason}"
                    ),
                    level="SUCCESS",
                ),
                mention_author=False,
            )
        except Exception:
            pass

        try:
            await send_mod_log(
                guild=guild,
                category="BAN",
                title="User Unbanned",
                description=f"{banned_entry.user} was unbanned.",
                level="SUCCESS",
                actor=moderator,
                target=banned_entry.user,
                extra_fields={"Reason": reason},
            )
        except Exception:
            pass

        await _cleanup(ctx)


async def setup(bot: commands.Bot):
    await bot.add_cog(BanSystem(bot))
