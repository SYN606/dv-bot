import discord
from discord.ext import commands
from utils.permissions.base_admin import BaseAdminCog
from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS
from utils.logging.mod_log import send_mod_log


class KickSystem(BaseAdminCog):

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    async def has_kick_permission(self, ctx: commands.Context) -> bool:
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

    async def resolve_member(self, ctx: commands.Context, user_input):
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

        return guild.get_member(user_id)

    async def validate_target(self, ctx: commands.Context,
                              member: discord.Member):
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

    async def send_kick_dm(self, member: discord.Member, guild: discord.Guild,
                           moderator, reason: str):
        try:
            if reason != "No reason provided":
                description = (
                    f"{EMOJIS['warning']} You were kicked from **{guild.name}**\n\n"
                    f"{EMOJIS['arrow_point']} **Moderator:** {moderator}\n"
                    f"{EMOJIS['arrow_point']} **Reason:** {reason}")
            else:
                description = f"{EMOJIS['warning']} You were kicked from **{guild.name}**."

            embed = make_embed(title="You Were Kicked",
                               description=description,
                               level="WARNING")
            await member.send(embed=embed)
        except (discord.Forbidden, discord.HTTPException):
            pass

    @commands.hybrid_command(name="kick", description="Kick a member")
    @commands.guild_only()
    async def kick(self,
                   ctx: commands.Context,
                   member=None,
                   *,
                   reason: str | None = None):
        guild = ctx.guild
        if guild is None:
            return

        moderator = ctx.author
        bot_member = guild.me
        if not isinstance(moderator, discord.Member) or bot_member is None:
            return

        if not await self.has_kick_permission(ctx):
            return await self._reply(
                ctx, "Permission Denied",
                f"{EMOJIS['fail']} You do not have permission to use this command."
            )

        reason = reason or "No reason provided"

        member = await self.resolve_member(ctx, member)
        if not isinstance(member, discord.Member):
            return await self._reply(
                ctx, "Invalid User",
                "Usage: `.kick <member | id | reply> [reason]`")

        valid, error = await self.validate_target(ctx, member)
        if not valid:
            return await self._reply(ctx, "Permission Denied", error
                                     or "Invalid target.")

        # Delete command message immediately upon successful validation
        await self._cleanup(ctx)

        await self.send_kick_dm(member=member,
                                guild=guild,
                                moderator=moderator,
                                reason=reason)

        try:
            await member.kick(reason=f"{reason} | Kicked by {moderator}")
        except discord.Forbidden:
            return await self._reply(
                ctx, "Action Failed",
                "I do not have permission to kick this user.")
        except discord.HTTPException:
            return await self._reply(
                ctx, "Kick Failed",
                "An error occurred while trying to kick the user.")

        await self._reply(
            ctx,
            "User Kicked",
            f"{EMOJIS['warning']} **{member}** has been kicked.\n\n{EMOJIS['arrow_point']} **Reason:** {reason}",
            level="WARNING")

        try:
            await send_mod_log(guild=guild,
                               category="KICK",
                               title="User Kicked",
                               description=f"{member} was kicked.",
                               level="WARNING",
                               actor=moderator,
                               target=member,
                               extra_fields={"Reason": reason})
        except Exception:
            pass


async def setup(bot: commands.Bot):
    await bot.add_cog(KickSystem(bot))
