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
    # Resolve Member (reply fallback)
    # =========================================================
    def _resolve_from_reply(self, ctx: commands.Context) -> discord.Member | None:
        ref = ctx.message.reference
        if ref and isinstance(ref.resolved, discord.Message):
            return ctx.guild.get_member(ref.resolved.author.id)  # type: ignore
        return None

    # =========================================================
    # Validate Target
    # =========================================================
    async def _validate_target(
        self,
        ctx: commands.Context,
        member: discord.Member,
    ) -> str | None:

        guild = ctx.guild
        assert guild is not None

        moderator = ctx.author
        if not isinstance(moderator, discord.Member):
            return "Invalid moderator context."

        bot_member = guild.me
        assert bot_member is not None

        owner = guild.owner

        # Self / owner / bot checks
        if member == moderator:
            return "You cannot kick yourself."

        if owner and member == owner:
            return "You cannot kick the server owner."

        if member == bot_member:
            return "You cannot kick me."

        # Bot permission
        if not bot_member.guild_permissions.kick_members:
            return "I do not have permission to kick members."

        # Moderator hierarchy
        if moderator != owner:
            if member.guild_permissions.administrator:
                return "You cannot kick another administrator."

            if moderator.top_role <= member.top_role:
                return "You cannot kick someone with equal or higher role."

        # Bot hierarchy
        if bot_member.top_role <= member.top_role:
            return "I cannot manage this member due to role hierarchy."

        return None

    # =========================================================
    # KICK COMMAND (ROBUST)
    # =========================================================
    @commands.command(name="kick")
    @commands.guild_only()
    async def kick(
        self,
        ctx: commands.Context,
        member: discord.Member | None = None,
        *,
        reason: str | None = None,
    ):
        guild = ctx.guild
        assert guild is not None

        moderator = ctx.author
        if not isinstance(moderator, discord.Member):
            return

        # =====================================================
        # Resolve member
        # =====================================================
        if member is None:
            member = self._resolve_from_reply(ctx)

        if not isinstance(member, discord.Member):
            return await ctx.reply(
                embed=make_embed(
                    title="Invalid User",
                    description="Please mention a valid member or reply to a user.",
                    level="ERROR",
                ),
                mention_author=False,
            )

        reason = reason or "No reason provided"

        # =====================================================
        # Validate
        # =====================================================
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
        # DM Notification (safe)
        # =====================================================
        try:
            await ModNotifier.notify_kick(
                member=member,
                guild_name=guild.name,
                moderator=moderator,
                reason=reason,
            )
        except Exception:
            pass

        # =====================================================
        # Execute Kick
        # =====================================================
        try:
            await member.kick(reason=f"{reason} | Kicked by {moderator}")
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
        # Response
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
        # Logging
        # =====================================================
        try:
            await send_mod_log(
                guild=guild,
                category="KICK",
                title="User Kicked",
                description=f"{member} was kicked.",
                level="WARNING",
                actor=moderator,
                target=member,
                extra_fields={"Reason": reason},
            )
        except Exception:
            pass


async def setup(bot: commands.Bot):
    await bot.add_cog(KickSystem(bot))