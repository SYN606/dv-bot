import discord
from discord.ext import commands

from utils.permissions.base_admin import BaseAdminCog
from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS
from utils.logging.mod_log import send_mod_log
from utils.logging.notifier import ModNotifier

from db.db_helpers.tempban import (
    get_tempban_role,
    add_tempban,
    remove_tempban,
    is_tempbanned,
)
from db.db_helpers.verification import get_verification_config


async def _cleanup(ctx: commands.Context):
    try:
        await ctx.message.delete()
    except (discord.Forbidden, discord.NotFound):
        pass


class TempbanSystem(BaseAdminCog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    # =========================================================
    # UNIVERSAL MEMBER RESOLVER (FIXES YOUR ERROR)
    # =========================================================
    async def resolve_member(self, ctx, user_input):
        # already resolved
        if isinstance(user_input, discord.Member):
            return user_input

        # reply support
        ref = ctx.message.reference
        if not user_input and ref:
            if isinstance(ref.resolved, discord.Message):
                return ctx.guild.get_member(ref.resolved.author.id)

        # convert string → Member
        if user_input:
            try:
                return await commands.MemberConverter().convert(ctx, user_input)
            except commands.BadArgument:
                return None

        return None

    # =========================================================
    # VALIDATION
    # =========================================================
    async def _validate_target(self, ctx, target):

        guild = ctx.guild
        moderator = ctx.author
        bot_member = guild.me

        if not isinstance(target, discord.Member):
            return "Invalid user."

        if target == moderator:
            return "You cannot target yourself."

        if target == guild.owner:
            return "You cannot target the server owner."

        if target == bot_member:
            return "You cannot target me."

        if not bot_member.guild_permissions.manage_roles:
            return "I do not have permission to manage roles."

        if moderator != guild.owner:
            if target.guild_permissions.administrator:
                return "You cannot modify another administrator."

            if target.top_role >= moderator.top_role:
                return "You cannot modify a member with equal or higher role."

        if bot_member.top_role <= target.top_role:
            return "I cannot manage this member due to role hierarchy."

        return None

    # =========================================================
    # TEMPBAN
    # =========================================================
    @commands.command(name="tempban")
    @commands.guild_only()
    async def tempban(self, ctx, user=None, *, reason=None):

        guild = ctx.guild
        moderator = ctx.author

        # ✅ FIXED: resolve user properly
        user = await self.resolve_member(ctx, user)

        if not user:
            return await ctx.reply(
                embed=make_embed(
                    title="Invalid User",
                    description="Provide a valid user or reply to a message.",
                    level="ERROR",
                ),
                mention_author=False,
            )

        error = await self._validate_target(ctx, user)
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
        # Get role
        # =====================================================
        try:
            role_id = await get_tempban_role(guild.id)
        except Exception:
            role_id = None

        tempban_role = guild.get_role(role_id) if role_id else None

        if not tempban_role:
            return await ctx.reply(
                embed=make_embed(
                    title="Tempban Not Configured",
                    description="Use `/tempban_role` first.",
                    level="WARNING",
                ),
                mention_author=False,
            )

        if tempban_role in user.roles:
            return await ctx.reply(
                embed=make_embed(
                    title="Already Tempbanned",
                    description=f"{user.mention} is already tempbanned.",
                    level="WARNING",
                ),
                mention_author=False,
            )

        reason = reason or "No reason provided"

        # =====================================================
        # DM notify
        # =====================================================
        try:
            await ModNotifier.notify_timeout(
                member=user,
                guild_name=guild.name,
                moderator=moderator,
                duration="Temporary Ban",
                reason=reason,
            )
        except Exception:
            pass

        # =====================================================
        # Remove verified role
        # =====================================================
        try:
            verify_cfg = await get_verification_config(guild.id)
        except Exception:
            verify_cfg = None

        if verify_cfg:
            verified_role = guild.get_role(verify_cfg.verified_role_id)
            if verified_role and verified_role in user.roles:
                try:
                    await user.remove_roles(
                        verified_role,
                        reason="Tempban applied",
                    )
                except discord.Forbidden:
                    pass

        # =====================================================
        # Apply role
        # =====================================================
        try:
            await user.add_roles(
                tempban_role,
                reason=f"{reason} | Tempbanned by {moderator}",
            )
        except discord.Forbidden:
            return await ctx.reply(
                embed=make_embed(
                    title="Action Failed",
                    description="I do not have permission to assign roles.",
                    level="ERROR",
                ),
                mention_author=False,
            )
        except discord.HTTPException:
            return await ctx.reply(
                embed=make_embed(
                    title="Tempban Failed",
                    description="Failed to apply tempban role.",
                    level="ERROR",
                ),
                mention_author=False,
            )

        # =====================================================
        # DB
        # =====================================================
        try:
            await add_tempban(
                guild_id=guild.id,
                user_id=user.id,
                moderator_id=moderator.id,
                reason=reason,
            )
        except Exception:
            pass

        # =====================================================
        # RESPONSE
        # =====================================================
        await ctx.reply(
            embed=make_embed(
                title="User Tempbanned",
                description=(
                    f"{EMOJIS['ban']} {user.mention}\n\n"
                    f"{EMOJIS['arrow_point']} Reason: {reason}"
                ),
                level="SUCCESS",
            ),
            mention_author=False,
        )

        # =====================================================
        # LOG
        # =====================================================
        try:
            await send_mod_log(
                guild=guild,
                category="BAN",
                title="Tempban Applied",
                description=f"{user.mention} was tempbanned.",
                level="WARNING",
                actor=moderator,
                target=user,
                extra_fields={"Reason": reason},
            )
        except Exception:
            pass

        await _cleanup(ctx)

    # =========================================================
    # UNTEMPBAN
    # =========================================================
    @commands.command(name="untempban")
    @commands.guild_only()
    async def untempban(self, ctx, user=None, *, reason=None):

        guild = ctx.guild
        moderator = ctx.author

        # ✅ FIXED
        user = await self.resolve_member(ctx, user)

        if not user:
            return await ctx.reply(
                embed=make_embed(
                    title="Invalid User",
                    description="Provide a valid user or reply.",
                    level="ERROR",
                ),
                mention_author=False,
            )

        error = await self._validate_target(ctx, user)
        if error:
            return await ctx.reply(
                embed=make_embed(
                    title="Permission Denied",
                    description=error,
                    level="ERROR",
                ),
                mention_author=False,
            )

        try:
            is_tb = await is_tempbanned(guild.id, user.id)
        except Exception:
            is_tb = False

        if not is_tb:
            return await ctx.reply(
                embed=make_embed(
                    title="Not Tempbanned",
                    description=f"{user.mention} is not tempbanned.",
                    level="WARNING",
                ),
                mention_author=False,
            )

        # remove role
        try:
            role_id = await get_tempban_role(guild.id)
        except Exception:
            role_id = None

        tempban_role = guild.get_role(role_id) if role_id else None

        if tempban_role and tempban_role in user.roles:
            try:
                await user.remove_roles(
                    tempban_role,
                    reason=f"{reason or 'Tempban removed'} | by {moderator}",
                )
            except discord.Forbidden:
                pass

        # restore verified
        try:
            verify_cfg = await get_verification_config(guild.id)
        except Exception:
            verify_cfg = None

        if verify_cfg:
            verified_role = guild.get_role(verify_cfg.verified_role_id)
            if verified_role and verified_role not in user.roles:
                try:
                    await user.add_roles(
                        verified_role,
                        reason="Tempban lifted",
                    )
                except discord.Forbidden:
                    pass

        try:
            await remove_tempban(
                guild_id=guild.id,
                user_id=user.id,
                moderator_id=moderator.id,
            )
        except Exception:
            pass

        reason = reason or "No reason provided"

        # notify
        try:
            await ModNotifier.notify_timeout(
                member=user,
                guild_name=guild.name,
                moderator=moderator,
                duration="Removed",
                reason=reason,
            )
        except Exception:
            pass

        await ctx.reply(
            embed=make_embed(
                title="Tempban Removed",
                description=(
                    f"{EMOJIS['success']} {user.mention}\n\n"
                    f"{EMOJIS['arrow_point']} Reason: {reason}"
                ),
                level="SUCCESS",
            ),
            mention_author=False,
        )

        try:
            await send_mod_log(
                guild=guild,
                category="BAN",
                title="Tempban Lifted",
                description=f"{user.mention} was untempbanned.",
                level="INFO",
                actor=moderator,
                target=user,
                extra_fields={"Reason": reason},
            )
        except Exception:
            pass

        await _cleanup(ctx)


async def setup(bot: commands.Bot):
    await bot.add_cog(TempbanSystem(bot))