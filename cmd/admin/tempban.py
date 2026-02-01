import discord
from discord.ext import commands

from utils.embeds import make_embed
from utils.emojis import EMOJIS
from db.db_helpers.admin_roles import get_admin_roles
from db.db_helpers.tempban import (
    get_tempban_role,
    add_tempban,
)


# ─────────────────────────────────────
# PREFIX-SAFE BOT ADMIN CHECK
# ─────────────────────────────────────
def is_bot_admin_prefix(ctx: commands.Context) -> bool:
    if ctx.guild is None:
        return False

    author = ctx.author
    if not isinstance(author, discord.Member):
        return False

    if ctx.guild.owner_id == author.id:
        return True

    if author.guild_permissions.administrator:
        return True

    admin_roles = set(get_admin_roles(ctx.guild.id))
    member_roles = {role.id for role in author.roles}

    return bool(admin_roles & member_roles)


async def _cleanup(ctx: commands.Context) -> None:
    """
    Delete invoking prefix command safely.
    """
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

        # ── Permission check
        if not is_bot_admin_prefix(ctx):
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

        # ── Store record
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
