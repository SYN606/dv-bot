import discord
from discord.ext import commands

from utils.permissions.base_admin import BaseAdminCog
from utils.core.embeds import make_embed
from utils.logging.mod_log import send_mod_log
from utils.logging.notifier import ModNotifier


class KickSystem(BaseAdminCog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    # =========================================================
    # Reply Resolve
    # =========================================================
    def _resolve_from_reply(self, ctx: commands.Context) -> discord.Member | None:
        ref = ctx.message.reference
        if ref and isinstance(ref.resolved, discord.Message):
            return ctx.guild.get_member(ref.resolved.author.id)
        return None

    # =========================================================
    # Target Validation
    # =========================================================
    async def _validate_target(self, ctx, member):

        guild = ctx.guild
        moderator = ctx.author
        bot_member = guild.me

        if member == moderator:
            return "You cannot kick yourself."

        if member == guild.owner:
            return "You cannot kick the server owner."

        if member == bot_member:
            return "You cannot kick me."

        if not bot_member.guild_permissions.kick_members:
            return "I do not have permission to kick members."

        if moderator != guild.owner:
            if member.guild_permissions.administrator:
                return "You cannot kick another administrator."

            if member.top_role >= moderator.top_role:
                return "You cannot kick someone with equal or higher role."

        if bot_member.top_role <= member.top_role:
            return "I cannot manage this member due to role hierarchy."

        return None

    # =========================================================
    # KICK COMMAND
    # =========================================================
    @commands.command(name="kick")
    @commands.guild_only()
    async def kick(self, ctx, member=None, *, reason=None):

        if not member:
            member = self._resolve_from_reply(ctx)

        if not member:
            return await ctx.reply(
                embed=make_embed(
                    title="Missing User",
                    description="Usage: dv kick <user | reply> [reason]",
                    level="ERROR",
                ),
                mention_author=False,
            )

        reason = reason or "No reason provided"

        error = await self._validate_target(ctx, member)
        if error:
            return await ctx.reply(
                embed=make_embed(
                    title="Permission Denied",
                    description=error,
                    level="ERROR",
                ),
                mention_author=False,
            )

        # =====================================================
        # DM (safe)
        # =====================================================
        try:
            await ModNotifier.notify_kick(
                member=member,
                guild_name=ctx.guild.name,
                moderator=ctx.author,
                reason=reason,
            )
        except Exception:
            pass

        # =====================================================
        # EXECUTE KICK (SAFE)
        # =====================================================
        try:
            await member.kick(reason=f"{reason} | Kicked by {ctx.author}")
        except discord.Forbidden:
            return await ctx.reply(
                embed=make_embed(
                    title="Action Failed",
                    description="I do not have permission to kick this user.",
                    level="ERROR",
                ),
                mention_author=False,
            )
        except discord.HTTPException:
            return await ctx.reply(
                embed=make_embed(
                    title="Kick Failed",
                    description="An error occurred while kicking the user.",
                    level="ERROR",
                ),
                mention_author=False,
            )

        # =====================================================
        # RESPONSE (SAFE)
        # =====================================================
        try:
            await ctx.reply(
                embed=make_embed(
                    title="User Kicked",
                    description=f"{member.mention}\nReason: {reason}",
                    level="WARNING",
                ),
                mention_author=False,
            )
        except Exception:
            pass

        # =====================================================
        # LOGGING (SAFE)
        # =====================================================
        try:
            await send_mod_log(
                guild=ctx.guild,
                category="BAN",
                title="User Kicked",
                description=f"{member} was kicked.",
                level="WARNING",
                actor=ctx.author,
                target=member,
                extra_fields={"Reason": reason},
            )
        except Exception:
            pass


async def setup(bot: commands.Bot):
    await bot.add_cog(KickSystem(bot))
