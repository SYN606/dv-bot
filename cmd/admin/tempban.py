import discord
from discord.ext import commands

from utils.embeds import make_embed
from utils.emojis import EMOJIS
from utils.check_perms import is_bot_admin_ctx
from db.db_helpers.tempban import (
    get_tempban_role,
    add_tempban,
)


# ─────────────────────────────────────
# SAFE PREFIX CLEANUP
# ─────────────────────────────────────
async def _cleanup(ctx: commands.Context) -> None:
    try:
        await ctx.message.delete()
    except (discord.Forbidden, discord.NotFound):
        pass


class Tempban(commands.Cog):

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @commands.command(
        name="tempban",
        help="Assign the tempban role to a user",
    )
    async def tempban(
        self,
        ctx: commands.Context,
        user: discord.Member | discord.User | None = None,
        *,
        reason: str | None = None,
    ):
        if ctx.guild is None:
            return

        # ── Missing user
        if user is None:
            await ctx.reply(
                embed=make_embed(
                    title="Missing User",
                    description=
                    (f"{EMOJIS['red_dot']} **User ID or mention is required.**\n\n"
                     f"{EMOJIS['arrow_point']} Usage: `dv tempban <user> [reason]`"
                     ),
                    level="WARNING",
                ),
                mention_author=False,
            )
            await _cleanup(ctx)
            return

        # ── Permission check (BOT ADMIN ROLE SAFE)
        if not is_bot_admin_ctx(ctx):
            await ctx.reply(
                embed=make_embed(
                    title="Permission Denied",
                    description="You are not allowed to use this command.",
                    level="ERROR",
                ),
                mention_author=False,
            )
            await _cleanup(ctx)
            return

        # ── Tempban role configured?
        role_id = get_tempban_role(ctx.guild.id)
        if not role_id:
            await ctx.reply(
                embed=make_embed(
                    title="Tempban Not Configured",
                    description=(
                        f"{EMOJIS['red_dot']} Tempban role is not set.\n"
                        f"{EMOJIS['arrow_point']} Use `/tempban_role` first."),
                    level="WARNING",
                ),
                mention_author=False,
            )
            await _cleanup(ctx)
            return

        role = ctx.guild.get_role(role_id)
        if not role:
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

        # ── Resolve member
        member = ctx.guild.get_member(user.id)
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

        # ── Already tempbanned?
        if role in member.roles:
            await ctx.reply(
                embed=make_embed(
                    title="Already Tempbanned",
                    description=
                    (f"{EMOJIS['red_dot']} {member.mention} already has the tempban role."
                     ),
                    level="WARNING",
                ),
                mention_author=False,
            )
            await _cleanup(ctx)
            return

        # ── Assign role
        await member.add_roles(
            role,
            reason=reason or f"Tempbanned by {ctx.author}",
        )

        # ── Store record (audit / expiry support later)
        add_tempban(
            guild_id=ctx.guild.id,
            user_id=member.id,
            moderator_id=ctx.author.id,
            reason=reason,
        )

        # ── Confirmation
        await ctx.reply(
            embed=make_embed(
                title="User Tempbanned",
                description=
                (f"{EMOJIS['ban']} {member.mention} has been **tempbanned**.\n\n"
                 f"{EMOJIS['arrow_point']} **Reason:** {reason or 'No reason provided'}"
                 ),
                level="SUCCESS",
                footer=f"Action by {ctx.author}",
            ),
            mention_author=False,
        )

        await _cleanup(ctx)


async def setup(bot: commands.Bot):
    await bot.add_cog(Tempban(bot))
