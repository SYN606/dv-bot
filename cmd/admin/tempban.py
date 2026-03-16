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


async def _cleanup(ctx: commands.Context):
    try:
        await ctx.message.delete()
    except (discord.Forbidden, discord.NotFound):
        pass


class TempbanSystem(BaseAdminCog):

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    # FAST Reply Resolution

    def _resolve_from_reply(self, ctx: commands.Context):
        ref = ctx.message.reference
        if not ref:
            return None

        if isinstance(ref.resolved, discord.Message):
            return ctx.guild.get_member(ref.resolved.author.id)

        return None

    # Shared Validation

    async def _validate_target(self, ctx: commands.Context,
                               target: discord.Member):
        guild = ctx.guild
        moderator: discord.Member = ctx.author
        bot_member = guild.me

        if target == moderator:
            return "You cannot target yourself."

        if target == guild.owner:
            return "You cannot target the server owner."

        if target == bot_member:
            return "You cannot target me."

        if moderator != guild.owner:

            if target.guild_permissions.administrator:
                return "You cannot modify another administrator."

            if target.top_role >= moderator.top_role:
                return "You cannot modify a member with equal or higher role."

        if bot_member.top_role <= target.top_role:
            return "I cannot manage this member due to role hierarchy."

        return None

    # TEMPBAN

    @commands.command(name="tempban")
    @commands.guild_only()
    async def tempban(
        self,
        ctx: commands.Context,
        user: discord.Member = None,
        *,
        reason: str | None = None,
    ):

        guild = ctx.guild
        moderator: discord.Member = ctx.author
        bot_member = guild.me

        # Resolve reply if no user provided
        if not user:
            user = self._resolve_from_reply(ctx)

        if not user:
            return await ctx.reply(
                embed=make_embed(
                    title="Missing User",
                    description="Usage: dv tempban <user | reply> [reason]",
                    level="ERROR",
                ),
                mention_author=False,
            )

        # Validate hierarchy first
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

        # Fetch tempban role once
        role_id = await get_tempban_role(guild.id)
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

        # Remove verified role (optional)
        verify_cfg = await get_verification_config(guild.id)
        if verify_cfg:
            verified_role = guild.get_role(verify_cfg.verified_role_id)
            if verified_role and verified_role in user.roles:
                try:
                    await user.remove_roles(verified_role,
                                            reason="Tempban applied")
                except discord.Forbidden:
                    pass

        # Apply role
        await user.add_roles(
            tempban_role,
            reason=f"{reason} | Tempbanned by {moderator}",
        )

        # DB record
        await add_tempban(
            guild_id=guild.id,
            user_id=user.id,
            moderator_id=moderator.id,
            reason=reason,
        )

        await ctx.reply(
            embed=make_embed(
                title="User Tempbanned",
                description=(f"{EMOJIS['ban']} {user.mention}\n\n"
                             f"{EMOJIS['arrow_point']} Reason: {reason}"),
                level="SUCCESS",
            ),
            mention_author=False,
        )

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

        await _cleanup(ctx)

    # =========================================================
    # UNTEMPBAN
    # =========================================================

    @commands.command(name="untempban")
    @commands.guild_only()
    async def untempban(
        self,
        ctx: commands.Context,
        user: discord.Member = None,
        *,
        reason: str | None = None,
    ):

        guild = ctx.guild
        moderator: discord.Member = ctx.author

        if not user:
            user = self._resolve_from_reply(ctx)

        if not user:
            return await ctx.reply(
                embed=make_embed(
                    title="Missing User",
                    description="Usage: dv untempban <user | reply> [reason]",
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

        if not await is_tempbanned(guild.id, user.id):
            return await ctx.reply(
                embed=make_embed(
                    title="Not Tempbanned",
                    description=f"{user.mention} is not tempbanned.",
                    level="WARNING",
                ),
                mention_author=False,
            )

        role_id = await get_tempban_role(guild.id)
        tempban_role = guild.get_role(role_id) if role_id else None

        if tempban_role and tempban_role in user.roles:
            try:
                await user.remove_roles(
                    tempban_role,
                    reason=f"{reason or 'Tempban removed'} | by {moderator}",
                )
            except discord.Forbidden:
                pass

        # Restore verified role
        verify_cfg = await get_verification_config(guild.id)
        if verify_cfg:
            verified_role = guild.get_role(verify_cfg.verified_role_id)
            if (verified_role and verified_role not in user.roles
                    and verified_role < guild.me.top_role):
                try:
                    await user.add_roles(
                        verified_role,
                        reason="Tempban lifted – verification restored",
                    )
                except discord.Forbidden:
                    pass

        await remove_tempban(
            guild_id=guild.id,
            user_id=user.id,
            moderator_id=moderator.id,
        )

        reason = reason or "No reason provided"

        await ctx.reply(
            embed=make_embed(
                title="Tempban Removed",
                description=(f"{EMOJIS['success']} {user.mention}\n\n"
                             f"{EMOJIS['arrow_point']} Reason: {reason}"),
                level="SUCCESS",
            ),
            mention_author=False,
        )

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

        await _cleanup(ctx)


async def setup(bot: commands.Bot):
    await bot.add_cog(TempbanSystem(bot))
