import discord
from discord.ext import commands

from utils.permissions.base_admin import BaseAdminCog
from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS
from utils.logging.mod_log import send_mod_log
from utils.logging.notifier import ModNotifier


class BanSystem(BaseAdminCog):

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    # =========================================================
    # PERMISSION OVERRIDE
    # =========================================================
    async def cog_check(self, ctx: commands.Context) -> bool:
        if ctx.guild is None:
            return True

        if not isinstance(ctx.author, discord.Member):
            return False

        if ctx.author.id == ctx.guild.owner_id:
            return True

        perms = ctx.author.guild_permissions

        if perms.administrator or perms.ban_members:
            return True

        return await super().cog_check(ctx)

    # =========================================================
    # UTIL: Reply
    # =========================================================
    async def _reply(self, ctx, title, description, level="ERROR"):
        return await ctx.reply(
            embed=make_embed(title=title, description=description,
                             level=level),
            mention_author=False,
        )

    # =========================================================
    # UTIL: Cleanup
    # =========================================================
    async def _cleanup(self, ctx: commands.Context):
        try:
            await ctx.message.delete()
        except (discord.Forbidden, discord.NotFound):
            pass

    # =========================================================
    # RESOLVE TARGET
    # =========================================================
    async def resolve_target(self, ctx, user_input):
        if isinstance(user_input, discord.Member):
            return user_input

        if not user_input:
            ref = ctx.message.reference
            if ref and isinstance(ref.resolved, discord.Message):
                return ref.resolved.author

        if ctx.message.mentions:
            return ctx.message.mentions[0]

        try:
            user_id = int(user_input)
        except (TypeError, ValueError):
            return None

        guild = ctx.guild
        if guild:
            member = guild.get_member(user_id)
            if member:
                return member

        try:
            return await self.bot.fetch_user(user_id)
        except (discord.NotFound, discord.Forbidden, discord.HTTPException):
            return None

    # =========================================================
    # VALIDATION
    # =========================================================
    async def validate_ban(self, ctx, target):
        guild = ctx.guild
        moderator = ctx.author

        if guild is None:
            return False

        bot_member = guild.me

        if not isinstance(moderator, discord.Member) or bot_member is None:
            return False

        if not isinstance(target, discord.Member):
            return True

        if target == moderator:
            return await self._reply(ctx, "Invalid Action",
                                     "You cannot ban yourself.")

        if target == guild.owner:
            return await self._reply(ctx, "Permission Denied",
                                     "Cannot ban server owner.")

        if target == bot_member:
            return await self._reply(ctx, "Invalid Target",
                                     "You cannot ban me.")

        if moderator != guild.owner:
            if target.guild_permissions.administrator:
                return await self._reply(ctx, "Permission Denied",
                                         "Cannot ban an administrator.")

            if target.top_role >= moderator.top_role:
                return await self._reply(ctx, "Hierarchy Error",
                                         "Target has equal or higher role.")

        if bot_member.top_role <= target.top_role:
            return await self._reply(ctx, "Bot Hierarchy Error",
                                     "My role is too low.")

        return True

    # =========================================================
    # BAN COMMAND
    # =========================================================
    @commands.command(name="ban")
    @commands.guild_only()
    async def ban(self, ctx: commands.Context, user=None, *, reason=None):

        guild = ctx.guild
        if guild is None:
            return

        moderator = ctx.author
        bot_member = guild.me

        if bot_member is None:
            return

        reason = reason or "No reason provided"

        if not bot_member.guild_permissions.ban_members:
            return await self._reply(
                ctx,
                "Permission Error",
                "I do not have permission to ban members.",
            )

        target = await self.resolve_target(ctx, user)
        if not target:
            return await self._reply(
                ctx,
                "User Not Found",
                "Usage: ban <user | id | reply> [reason]",
            )

        valid = await self.validate_ban(ctx, target)
        if valid is not True:
            return

        if isinstance(target, discord.Member):
            try:
                await ModNotifier.notify_ban(
                    member=target,
                    guild_name=guild.name,
                    moderator=moderator, # type: ignore
                    reason=reason,
                )
            except Exception:
                pass

        try:
            await guild.ban(
                target,
                reason=f"{reason} | Banned by {moderator}",
                delete_message_seconds=0,
            )
        except discord.Forbidden:
            return await self._reply(
                ctx,
                "Action Failed",
                "I do not have permission to ban this user.",
            )
        except discord.HTTPException as e:
            return await self._reply(
                ctx,
                "Ban Failed",
                f"HTTP Error: {e}",
            )

        await self._reply(
            ctx,
            "User Banned",
            f"{EMOJIS['ban']} {target}\n\n{EMOJIS['arrow_point']} Reason: {reason}",
        )

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

        await self._cleanup(ctx)

    # =========================================================
    # UNBAN COMMAND
    # =========================================================
    @commands.command(name="unban")
    @commands.guild_only()
    async def unban(self, ctx: commands.Context, user=None, *, reason=None):

        guild = ctx.guild
        if guild is None:
            return

        moderator = ctx.author
        reason = reason or "No reason provided"

        if not user:
            return await self._reply(
                ctx,
                "Missing User",
                "Usage: unban <user id> [reason]",
            )

        try:
            user_id = int(user)
        except ValueError:
            return await self._reply(
                ctx,
                "Invalid ID",
                "Please provide a valid user ID.",
            )

        try:
            ban_entry = await guild.fetch_ban(discord.Object(id=user_id))
        except discord.NotFound:
            return await self._reply(
                ctx,
                "Not Banned",
                "That user is not banned.",
                level="WARNING",
            )
        except discord.HTTPException:
            return await self._reply(
                ctx,
                "Error",
                "Failed to fetch ban entry.",
            )

        try:
            await guild.unban(
                ban_entry.user,
                reason=f"{reason} | Unbanned by {moderator}",
            )
        except discord.Forbidden:
            return await self._reply(
                ctx,
                "Permission Error",
                "I do not have permission to unban users.",
            )
        except discord.HTTPException:
            return await self._reply(
                ctx,
                "Unban Failed",
                "An error occurred while unbanning.",
            )

        await self._reply(
            ctx,
            "User Unbanned",
            f"{EMOJIS['success']} {ban_entry.user}\n\n{EMOJIS['arrow_point']} Reason: {reason}",
            level="SUCCESS",
        )

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
        except Exception:
            pass

        await self._cleanup(ctx)


async def setup(bot: commands.Bot):
    await bot.add_cog(BanSystem(bot))
