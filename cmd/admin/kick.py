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
    # UTIL: Reply Wrapper
    # =========================================================
    async def _reply(self, ctx, title, description, level="ERROR"):
        return await ctx.reply(
            embed=make_embed(title=title, description=description, level=level),
            mention_author=False,
        )

    # =========================================================
    # UTIL: Resolve Member (robust)
    # =========================================================
    async def resolve_member(self, ctx, user_input):
        # Direct member
        if isinstance(user_input, discord.Member):
            return user_input

        # Reply fallback
        if not user_input:
            ref = ctx.message.reference
            if ref and isinstance(ref.resolved, discord.Message):
                return ctx.guild.get_member(ref.resolved.author.id)

        # Mention support
        if ctx.message.mentions:
            return ctx.message.mentions[0]

        # ID support
        try:
            user_id = int(user_input)
        except (TypeError, ValueError):
            return None

        return ctx.guild.get_member(user_id)

    # =========================================================
    # VALIDATION (clean + reusable)
    # =========================================================
    async def validate_target(self, ctx, member: discord.Member):
        guild = ctx.guild
        moderator = ctx.author
        bot_member = guild.me

        # Self / owner / bot checks
        if member == moderator:
            return "You cannot kick yourself."

        if member == guild.owner:
            return "You cannot kick the server owner."

        if member == bot_member:
            return "You cannot kick me."

        # Bot permission
        if not bot_member.guild_permissions.kick_members:
            return "I do not have permission to kick members."

        # Moderator hierarchy
        if moderator != guild.owner:
            if member.guild_permissions.administrator:
                return "You cannot kick another administrator."

            if member.top_role >= moderator.top_role:
                return "You cannot kick someone with equal or higher role."

        # Bot hierarchy
        if bot_member.top_role <= member.top_role:
            return "I cannot manage this member due to role hierarchy."

        return None

    # =========================================================
    # KICK COMMAND
    # =========================================================
    @commands.command(name="kick")
    @commands.guild_only()
    async def kick(
        self,
        ctx: commands.Context,
        member=None,
        *,
        reason: str | None = None,
    ):
        guild = ctx.guild
        moderator = ctx.author

        reason = reason or "No reason provided"

        # =====================================================
        # Resolve member
        # =====================================================
        member = await self.resolve_member(ctx, member)

        if not isinstance(member, discord.Member):
            return await self._reply(
                ctx,
                "Invalid User",
                "Usage: kick <member | id | reply> [reason]",
            )

        # =====================================================
        # Validate
        # =====================================================
        error = await self.validate_target(ctx, member)
        if error:
            return await self._reply(ctx, "Permission Denied", error)

        # =====================================================
        # DM Notification 
        # =====================================================
        try:
            await ModNotifier.notify_kick(
                member=member,
                guild_name=guild.name, # type: ignore
                moderator=moderator, # type: ignore
                reason=reason,
            )
        except Exception as e:
            print(f"[Kick Notify Failed] {e}")

        # =====================================================
        # Execute Kick
        # =====================================================
        try:
            await member.kick(reason=f"{reason} | Kicked by {moderator}")
        except discord.Forbidden:
            return await self._reply(
                ctx,
                "Action Failed",
                "I do not have permission to kick this user.",
            )
        except discord.HTTPException as e:
            return await self._reply(
                ctx,
                "Kick Failed",
                f"HTTP Error: {e}",
            )

        # =====================================================
        # Response
        # =====================================================
        await self._reply(
            ctx,
            "User Kicked",
            f"{member.mention}\nReason: {reason}",
            level="WARNING",
        )

        # =====================================================
        # Logging
        # =====================================================
        try:
            await send_mod_log(
                guild=guild, # type: ignore
                category="KICK",
                title="User Kicked",
                description=f"{member} was kicked.",
                level="WARNING",
                actor=moderator,
                target=member,
                extra_fields={"Reason": reason},
            )
        except Exception as e:
            print(f"[Log Failed] {e}")

    # =========================================================
    # SETUP
    # =========================================================
async def setup(bot: commands.Bot):
    await bot.add_cog(KickSystem(bot))