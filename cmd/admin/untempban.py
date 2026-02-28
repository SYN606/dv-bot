import discord
from discord.ext import commands

from utils.base_admin import BaseAdminCog
from utils.embeds import make_embed
from utils.emojis import EMOJIS
from utils.logging.mod_log import send_mod_log

from db.db_helpers.tempban import (
    get_tempban_role,
    remove_tempban,
    is_tempbanned,
)
from db.db_helpers.verification import get_verification_config


# ─────────────────────────
# SAFE PREFIX CLEANUP
# ─────────────────────────
async def _cleanup(ctx: commands.Context) -> None:
    try:
        await ctx.message.delete()
    except (discord.Forbidden, discord.NotFound):
        pass


class UnTempban(BaseAdminCog):
    """
    PREFIX ONLY:
    dv untempban <user> [reason]
    """

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @commands.command(
        name="untempban",
        help="Remove a tempban from a user",
    )
    @commands.guild_only()
    async def untempban(
        self,
        ctx: commands.Context,
        user: discord.Member | discord.User | None = None,
        *,
        reason: str | None = None,
    ):
        guild = ctx.guild
        moderator: discord.Member = ctx.author

        if user is None:
            await ctx.reply(
                embed=make_embed(
                    title="Missing User",
                    description=
                    (f"{EMOJIS['red_dot']} **User mention or ID required.**\n\n"
                     f"{EMOJIS['arrow_point']} Usage: `dv untempban <user> [reason]`"
                     ),
                    level="WARNING",
                ),
                mention_author=False,
            )
            await _cleanup(ctx)
            return

        member = guild.get_member(user.id)
        if not member:
            await ctx.reply(
                embed=make_embed(
                    title="User Not Found",
                    description="That user is not in this server.",
                    level="ERROR",
                ),
                mention_author=False,
            )
            await _cleanup(ctx)
            return

        # ─────────────────────────
        # Safety Checks
        # ─────────────────────────
        if member == moderator:
            await ctx.reply(
                embed=make_embed(
                    title="Invalid Target",
                    description="You cannot untempban yourself.",
                    level="ERROR",
                ),
                mention_author=False,
            )
            await _cleanup(ctx)
            return

        if member == guild.me:
            await ctx.reply(
                embed=make_embed(
                    title="Invalid Target",
                    description="You cannot modify my roles.",
                    level="ERROR",
                ),
                mention_author=False,
            )
            await _cleanup(ctx)
            return

        if member.top_role >= moderator.top_role:
            await ctx.reply(
                embed=make_embed(
                    title="Role Hierarchy Error",
                    description=
                    "You cannot modify a member with an equal or higher role.",
                    level="ERROR",
                ),
                mention_author=False,
            )
            await _cleanup(ctx)
            return

        bot_member = guild.me
        if bot_member is None or member.top_role >= bot_member.top_role:
            await ctx.reply(
                embed=make_embed(
                    title="Bot Role Hierarchy Error",
                    description=
                    "I cannot manage this member due to role hierarchy.",
                    level="ERROR",
                ),
                mention_author=False,
            )
            await _cleanup(ctx)
            return

        # ─────────────────────────
        # DB Check
        # ─────────────────────────
        if not await is_tempbanned(guild.id, member.id):
            await ctx.reply(
                embed=make_embed(
                    title="Not Tempbanned",
                    description=
                    f"{EMOJIS['warning']} {member.mention} is not tempbanned.",
                    level="WARNING",
                ),
                mention_author=False,
            )
            await _cleanup(ctx)
            return

        # ─────────────────────────
        # Remove Tempban Role
        # ─────────────────────────
        tempban_role_id = await get_tempban_role(guild.id)
        tempban_role = guild.get_role(
            tempban_role_id) if tempban_role_id else None

        if tempban_role and tempban_role in member.roles:
            try:
                await member.remove_roles(
                    tempban_role,
                    reason=reason or f"Tempban removed by {moderator}",
                )
            except discord.Forbidden:
                await ctx.reply(
                    embed=make_embed(
                        title="Permission Error",
                        description=
                        f"{EMOJIS['fail']} I cannot remove {tempban_role.mention}.",
                        level="ERROR",
                    ),
                    mention_author=False,
                )
                await _cleanup(ctx)
                return

        # ─────────────────────────
        # Restore Verified Role
        # ─────────────────────────
        verify_cfg = await get_verification_config(guild.id)
        if verify_cfg:
            verified_role = guild.get_role(verify_cfg.verified_role_id)
            if (verified_role and verified_role < bot_member.top_role
                    and verified_role not in member.roles):
                try:
                    await member.add_roles(
                        verified_role,
                        reason="Tempban lifted – verification restored",
                    )
                except discord.Forbidden:
                    pass

        # ─────────────────────────
        # DB Update
        # ─────────────────────────
        await remove_tempban(
            guild_id=guild.id,
            user_id=member.id,
            moderator_id=moderator.id,
        )

        await ctx.reply(
            embed=make_embed(
                title="Tempban Removed",
                description=
                (f"{EMOJIS['success']} {member.mention} has been **untempbanned**.\n\n"
                 f"{EMOJIS['arrow_point']} **Reason:** {reason or 'No reason provided'}"
                 ),
                level="SUCCESS",
                footer=f"Action by {moderator}",
            ),
            mention_author=False,
        )

        # ─────────────────────────
        # Structured Logging
        # ─────────────────────────
        await send_mod_log(
            guild=guild,
            category="BAN",
            title="Tempban Lifted",
            description=f"{member.mention} was untempbanned.",
            level="INFO",
            actor=moderator,
            target=member,
            extra_fields={
                "Reason": reason or "No reason provided",
            },
        )

        await _cleanup(ctx)


async def setup(bot: commands.Bot):
    await bot.add_cog(UnTempban(bot))
