import discord
from discord.ext import commands

from utils.base_admin import BaseAdminCog
from utils.embeds import make_embed
from utils.emojis import EMOJIS
from utils.logging.mod_log import send_mod_log

from db.db_helpers.tempban import (
    get_tempban_role,
    add_tempban,
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


class Tempban(BaseAdminCog):
    """
    PREFIX ONLY:
    dv tempban <user | reply> [reason]
    """

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @commands.command(
        name="tempban",
        help="Assign the tempban role to a user",
    )
    @commands.guild_only()
    async def tempban(
        self,
        ctx: commands.Context,
        user: discord.Member | discord.User | None = None,
        *,
        reason: str | None = None,
    ):
        guild = ctx.guild
        moderator: discord.Member = ctx.author  # guaranteed by guild_only

        # ─────────────────────────
        # Resolve Target
        # ─────────────────────────
        target: discord.Member | None = None

        if user:
            target = guild.get_member(user.id)

        elif ctx.message.reference:
            try:
                ref = await ctx.channel.fetch_message(
                    ctx.message.reference.message_id)
                if ref.author:
                    target = guild.get_member(ref.author.id)
            except (discord.NotFound, discord.Forbidden):
                pass

        if target is None:
            await ctx.reply(
                embed=make_embed(
                    title="Missing User",
                    description=
                    (f"{EMOJIS['red_dot']} **User mention or reply is required.**\n\n"
                     f"{EMOJIS['arrow_point']} Usage: `dv tempban <user> [reason]`"
                     ),
                    level="WARNING",
                ),
                mention_author=False,
            )
            await _cleanup(ctx)
            return

        # ─────────────────────────
        # Safety Checks
        # ─────────────────────────
        if target == moderator:
            await ctx.reply(
                embed=make_embed(
                    title="Invalid Target",
                    description="You cannot tempban yourself.",
                    level="ERROR",
                ),
                mention_author=False,
            )
            await _cleanup(ctx)
            return

        if target == guild.me:
            await ctx.reply(
                embed=make_embed(
                    title="Invalid Target",
                    description="You cannot tempban me.",
                    level="ERROR",
                ),
                mention_author=False,
            )
            await _cleanup(ctx)
            return

        if target.top_role >= moderator.top_role:
            await ctx.reply(
                embed=make_embed(
                    title="Role Hierarchy Error",
                    description=
                    "You cannot tempban a member with an equal or higher role.",
                    level="ERROR",
                ),
                mention_author=False,
            )
            await _cleanup(ctx)
            return

        bot_member = guild.me
        if bot_member is None or target.top_role >= bot_member.top_role:
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
        # Tempban Role Check
        # ─────────────────────────
        role_id = await get_tempban_role(guild.id)

        if not role_id:
            await ctx.reply(
                embed=make_embed(
                    title="Tempban Not Configured",
                    description=
                    f"{EMOJIS['arrow_point']} Use `/tempban_role` first.",
                    level="WARNING",
                ),
                mention_author=False,
            )
            await _cleanup(ctx)
            return

        tempban_role = guild.get_role(role_id)
        if not tempban_role:
            await ctx.reply(
                embed=make_embed(
                    title="Tempban Role Missing",
                    description="The configured tempban role no longer exists.",
                    level="ERROR",
                ),
                mention_author=False,
            )
            await _cleanup(ctx)
            return

        if tempban_role in target.roles:
            await ctx.reply(
                embed=make_embed(
                    title="Already Tempbanned",
                    description=
                    f"{EMOJIS['warning']} {target.mention} is already tempbanned.",
                    level="WARNING",
                ),
                mention_author=False,
            )
            await _cleanup(ctx)
            return

        # ─────────────────────────
        # Remove Verified Role (if exists)
        # ─────────────────────────
        cfg = await get_verification_config(guild.id)
        if cfg:
            verified_role = guild.get_role(cfg.verified_role_id)
            if verified_role and verified_role in target.roles:
                try:
                    await target.remove_roles(
                        verified_role,
                        reason="Tempban applied",
                    )
                except discord.Forbidden:
                    pass

        # ─────────────────────────
        # Apply Tempban
        # ─────────────────────────
        await target.add_roles(
            tempban_role,
            reason=reason or f"Tempbanned by {moderator}",
        )

        await add_tempban(
            guild_id=guild.id,
            user_id=target.id,
            moderator_id=moderator.id,
            reason=reason,
        )

        await ctx.reply(
            embed=make_embed(
                title="User Tempbanned",
                description=
                (f"{EMOJIS['ban']} {target.mention} has been **tempbanned**.\n\n"
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
            title="Tempban Applied",
            description=f"{target.mention} was tempbanned.",
            level="ERROR",
            actor=moderator,
            target=target,
            extra_fields={
                "Reason": reason or "No reason provided",
            },
        )

        await _cleanup(ctx)


async def setup(bot: commands.Bot):
    await bot.add_cog(Tempban(bot))
