import discord
from discord.ext import commands
from utils.permissions.base_admin import BaseAdminCog
from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS
from utils.logging.mod_log import send_mod_log


class BanSystem(BaseAdminCog):

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    async def has_ban_permission(self, ctx: commands.Context) -> bool:
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

    async def _reply(self,
                     ctx: commands.Context,
                     title: str,
                     description: str,
                     level: str = "ERROR"):
        embed = make_embed(title=title, description=description, level=level)
        try:
            if ctx.interaction:
                if ctx.interaction.response.is_done():
                    return await ctx.interaction.followup.send(embed=embed,
                                                               ephemeral=True)
                return await ctx.interaction.response.send_message(
                    embed=embed, ephemeral=True)
            return await ctx.reply(embed=embed, mention_author=False)
        except discord.HTTPException:
            return None

    async def _cleanup(self, ctx: commands.Context):
        if ctx.interaction:
            return
        try:
            await ctx.message.delete()
        except (discord.Forbidden, discord.NotFound, discord.HTTPException):
            pass

    async def resolve_target(self, ctx: commands.Context, user_input):
        guild = ctx.guild
        if guild is None:
            return None

        if isinstance(user_input, discord.Member):
            return user_input

        if not user_input:
            reference = ctx.message.reference
            if reference and isinstance(reference.resolved, discord.Message):
                resolved_author = reference.resolved.author
                if isinstance(resolved_author, discord.Member):
                    return resolved_author
                return guild.get_member(resolved_author.id)

        if ctx.message.mentions:
            return ctx.message.mentions[0]

        try:
            user_id = int(user_input)
        except (TypeError, ValueError):
            return None

        member = guild.get_member(user_id)
        if member:
            return member

        try:
            return await self.bot.fetch_user(user_id)
        except (discord.NotFound, discord.Forbidden, discord.HTTPException):
            return None

    async def validate_ban(self, ctx: commands.Context, target):
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
            return False, "I cannot ban this user because their role is higher than mine."

        return True, None

    async def send_ban_dm(self, target: discord.abc.User, guild: discord.Guild,
                          moderator, reason: str):
        try:
            if reason != "No reason provided":
                description = (
                    f"{EMOJIS['ban']} You were banned from **{guild.name}**\n\n"
                    f"{EMOJIS['arrow_point']} **Moderator:** {moderator}\n"
                    f"{EMOJIS['arrow_point']} **Reason:** {reason}")
            else:
                description = f"{EMOJIS['ban']} You were banned from **{guild.name}**."

            embed = make_embed(title="You Were Banned",
                               description=description,
                               level="ERROR")
            await target.send(embed=embed) # type: ignore
        except (discord.Forbidden, discord.HTTPException):
            pass

    @commands.hybrid_command(name="ban", description="Ban a member")
    @commands.guild_only()
    async def ban(self,
                  ctx: commands.Context,
                  user=None,
                  *,
                  reason: str | None = None):
        guild = ctx.guild
        if guild is None:
            return

        moderator = ctx.author
        bot_member = guild.me
        if not isinstance(moderator, discord.Member) or bot_member is None:
            return

        if not await self.has_ban_permission(ctx):
            return await self._reply(
                ctx, "Permission Denied",
                f"{EMOJIS['fail']} You do not have permission to use this command."
            )

        reason = reason or "No reason provided"

        if not bot_member.guild_permissions.ban_members:
            return await self._reply(
                ctx, "Permission Error",
                "I do not have the required permissions to ban members.")

        target = await self.resolve_target(ctx, user)
        if not target:
            return await self._reply(
                ctx, "User Not Found",
                "Usage: `.ban <user | id | reply> [reason]`")

        valid, error = await self.validate_ban(ctx, target)
        if not valid:
            return await self._reply(ctx, "Permission Denied", error
                                     or "Invalid target user.")

        # Delete the trigger command immediately after validation passes
        await self._cleanup(ctx)

        await self.send_ban_dm(target=target,
                               guild=guild,
                               moderator=moderator,
                               reason=reason)

        try:
            await guild.ban(target,
                            reason=f"{reason} | Banned by {moderator}",
                            delete_message_seconds=0)
        except discord.Forbidden:
            return await self._reply(
                ctx, "Action Failed",
                "I do not have permission to ban this user.")
        except discord.HTTPException:
            return await self._reply(
                ctx, "Ban Failed",
                "An error occurred while attempting to ban this user.")

        await self._reply(
            ctx,
            "User Banned",
            f"{EMOJIS['ban']} **{target}** has been banned.\n\n{EMOJIS['arrow_point']} **Reason:** {reason}",
            level="ERROR")

        try:
            await send_mod_log(guild=guild,
                               category="BAN",
                               title="User Banned",
                               description=f"{target} was banned.",
                               level="ERROR",
                               actor=moderator,
                               target=target,
                               extra_fields={"Reason": reason})
        except Exception:
            pass

    @commands.hybrid_command(name="unban", description="Unban a member")
    @commands.guild_only()
    async def unban(self,
                    ctx: commands.Context,
                    user=None,
                    *,
                    reason: str | None = None):
        guild = ctx.guild
        if guild is None:
            return

        moderator = ctx.author
        if not isinstance(moderator, discord.Member):
            return

        if not await self.has_ban_permission(ctx):
            return await self._reply(
                ctx, "Permission Denied",
                f"{EMOJIS['fail']} You do not have permission to use this command."
            )

        reason = reason or "No reason provided"

        if not user:
            return await self._reply(ctx, "Missing User",
                                     "Usage: `.unban <user id> [reason]`")

        try:
            user_id = int(user)
        except ValueError:
            return await self._reply(
                ctx, "Invalid ID", "Please provide a valid numeric user ID.")

        try:
            ban_entry = await guild.fetch_ban(discord.Object(id=user_id))
        except discord.NotFound:
            return await self._reply(
                ctx,
                "Not Banned",
                "That user is not currently banned on this server.",
                level="WARNING")
        except discord.HTTPException:
            return await self._reply(ctx, "Error",
                                     "Failed to fetch the ban entry records.")

        # Delete the trigger command immediately after validation passes
        await self._cleanup(ctx)

        try:
            await guild.unban(ban_entry.user,
                              reason=f"{reason} | Unbanned by {moderator}")
        except discord.Forbidden:
            return await self._reply(
                ctx, "Permission Error",
                "I do not have permission to unban users.")
        except discord.HTTPException:
            return await self._reply(
                ctx, "Unban Failed",
                "An error occurred while attempting to unban this user.")

        await self._reply(
            ctx,
            "User Unbanned",
            f"{EMOJIS['success']} **{ban_entry.user}** has been unbanned.\n\n{EMOJIS['arrow_point']} **Reason:** {reason}",
            level="SUCCESS")

        try:
            await send_mod_log(guild=guild,
                               category="BAN",
                               title="User Unbanned",
                               description=f"{ban_entry.user} was unbanned.",
                               level="SUCCESS",
                               actor=moderator,
                               target=ban_entry.user,
                               extra_fields={"Reason": reason})
        except Exception:
            pass


async def setup(bot: commands.Bot):
    await bot.add_cog(BanSystem(bot))
