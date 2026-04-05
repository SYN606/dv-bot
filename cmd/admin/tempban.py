import discord
from discord.ext import commands
from utils.permissions.base_admin import BaseAdminCog
from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS
from utils.logging.mod_log import send_mod_log

from db.db_helpers.tempban import (
    get_tempban_role,
    add_tempban,
    remove_tempban,
    is_tempbanned,
)

from db.db_helpers.verification import get_verification_config


class Tempban(BaseAdminCog):

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    # =========================================================
    # UTILITIES
    # =========================================================
    async def resolve_member(self, ctx, user_input):
        if isinstance(user_input, discord.Member):
            return user_input

        ref = ctx.message.reference
        if not user_input and ref:
            if isinstance(ref.resolved, discord.Message):
                return ctx.guild.get_member(ref.resolved.author.id)

        if user_input:
            try:
                return await commands.MemberConverter().convert(
                    ctx, user_input)
            except commands.BadArgument:
                return None

        return None

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

    async def _cleanup(self, ctx):
        try:
            await ctx.message.delete()
        except (discord.Forbidden, discord.NotFound):
            pass

    # =========================================================
    # TEMPBAN COMMAND
    # =========================================================
    @commands.command(name="tempban")
    @commands.guild_only()
    async def tempban(self, ctx, user=None, *, reason=None):

        user = await self.resolve_member(ctx, user)
        if not user:
            return await ctx.reply(embed=make_embed(
                title="Invalid User",
                description="Provide a valid user.",
                level="ERROR",
            ))

        error = await self._validate_target(ctx, user)
        if error:
            return await ctx.reply(embed=make_embed(
                title="Permission Denied",
                description=error,
                level="ERROR",
            ))

        role_id = await get_tempban_role(ctx.guild.id)
        tempban_role = ctx.guild.get_role(role_id)

        if not tempban_role:
            return await ctx.reply(embed=make_embed(
                title="Not Configured",
                description="Tempban role not set.",
                level="WARNING",
            ))

        # ─────────────────────────
        # GET VERIFICATION ROLE
        # ─────────────────────────
        config = await get_verification_config(ctx.guild.id)
        verified_role = None

        if config:
            verified_role = ctx.guild.get_role(config.verified_role_id)

        # ─────────────────────────
        # APPLY ROLES
        # ─────────────────────────
        if verified_role and verified_role in user.roles:
            await user.remove_roles(
                verified_role,
                reason="Tempban applied",
            )

        await user.add_roles(
            tempban_role,
            reason=reason or "Tempban applied",
        )

        # ─────────────────────────
        # DATABASE
        # ─────────────────────────
        await add_tempban(
            guild_id=ctx.guild.id,
            user_id=user.id,
            moderator_id=ctx.author.id,
            reason=reason or "No reason",
        )

        # ─────────────────────────
        # RESPONSE
        # ─────────────────────────
        await ctx.reply(embed=make_embed(
            title="User Tempbanned",
            description=(f"{EMOJIS['ban']} {user.mention}\n"
                         f"Reason: {reason or 'No reason'}"),
            level="SUCCESS",
        ))

        # ─────────────────────────
        # CLEAN LOG (NO SPAM)
        # ─────────────────────────
        await send_mod_log(
            guild=ctx.guild,
            category="MODERATION",
            title="User Tempbanned",
            description=(
                f"👤 User: {user.mention} (`{user.id}`)\n"
                f"🛡 Moderator: {ctx.author.mention}\n"
                f"📥 Tempban Role: {tempban_role.mention}\n"
                f"📤 Removed Verified Role: "
                f"{verified_role.mention if verified_role else 'None'}\n"
                f"📝 Reason: {reason or 'No reason'}"),
            level="WARNING",
            actor=ctx.author,
        )

        await self._cleanup(ctx)

    # =========================================================
    # UNTEMPBAN COMMAND
    # =========================================================
    @commands.command(name="untempban")
    @commands.guild_only()
    async def untempban(self, ctx, user=None, *, reason=None):

        user = await self.resolve_member(ctx, user)
        if not user:
            return await ctx.reply(embed=make_embed(
                title="Invalid User",
                description="Provide a valid user.",
                level="ERROR",
            ))

        if not await is_tempbanned(ctx.guild.id, user.id):
            return await ctx.reply(embed=make_embed(
                title="Not Tempbanned",
                description=f"{user.mention} is not tempbanned.",
                level="WARNING",
            ))

        role_id = await get_tempban_role(ctx.guild.id)
        tempban_role = ctx.guild.get_role(role_id)

        if tempban_role:
            await user.remove_roles(tempban_role)

        # ─────────────────────────
        # RESTORE VERIFIED ROLE
        # ─────────────────────────
        config = await get_verification_config(ctx.guild.id)
        verified_role = None

        if config:
            verified_role = ctx.guild.get_role(config.verified_role_id)
            if verified_role:
                await user.add_roles(
                    verified_role,
                    reason="Tempban removed",
                )

        # ─────────────────────────
        # DATABASE
        # ─────────────────────────
        await remove_tempban(
            guild_id=ctx.guild.id,
            user_id=user.id,
            moderator_id=ctx.author.id,
        )

        # ─────────────────────────
        # RESPONSE
        # ─────────────────────────
        await ctx.reply(embed=make_embed(
            title="Tempban Removed",
            description=f"{EMOJIS['success']} {user.mention}",
            level="SUCCESS",
        ))

        # ─────────────────────────
        # CLEAN LOG
        # ─────────────────────────
        await send_mod_log(
            guild=ctx.guild,
            category="MODERATION",
            title="Tempban Removed",
            description=(f"👤 User: {user.mention} (`{user.id}`)\n"
                         f"🛡 Moderator: {ctx.author.mention}\n"
                         f"📝 Reason: {reason or 'No reason'}"),
            level="SUCCESS",
            actor=ctx.author,
        )

        await self._cleanup(ctx)


async def setup(bot: commands.Bot):
    await bot.add_cog(Tempban(bot))
