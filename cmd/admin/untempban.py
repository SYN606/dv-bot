import discord
from discord.ext import commands

from utils.embeds import make_embed
from utils.emojis import EMOJIS
from utils.check_perms import is_bot_admin_ctx

from db.db_helpers.tempban import (
    get_tempban_role,
    remove_tempban,
    is_tempbanned,
)
from db.db_helpers.verification import get_verification_config
from db.db_helpers.mod_logs import get_log_channel


# region SAFE PREFIX CLEANUP
async def _cleanup(ctx: commands.Context) -> None:
    try:
        await ctx.message.delete()
    except (discord.Forbidden, discord.NotFound):
        pass


class UnTempban(commands.Cog):
    """
    PREFIX ONLY:
    dv untempban <user> [reason]

    Fully async (v2 architecture)
    """

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @commands.command(
        name="untempban",
        help="Remove a tempban from a user",
    )
    async def untempban(
        self,
        ctx: commands.Context,
        user: discord.Member | discord.User | None = None,
        *,
        reason: str | None = None,
    ):
        if ctx.guild is None:
            return

        guild = ctx.guild
        author = ctx.author

        # region VALIDATION
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

        if not is_bot_admin_ctx(ctx):
            await ctx.reply(
                embed=make_embed(
                    title="Permission Denied",
                    description="You are not allowed to manage tempbans.",
                    level="ERROR",
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

        # region CHECK TEMPBAN
        if not await is_tempbanned(guild.id, member.id):
            await ctx.reply(
                embed=make_embed(
                    title="Not Tempbanned",
                    description=
                    (f"{EMOJIS['warning']} {member.mention} is not tempbanned."
                     ),
                    level="WARNING",
                ),
                mention_author=False,
            )
            await _cleanup(ctx)
            return

        bot_member = guild.me
        if bot_member is None:
            return

        # region REMOVE TEMPBAN ROLE
        tempban_role_id = await get_tempban_role(guild.id)
        tempban_role = guild.get_role(
            tempban_role_id) if tempban_role_id else None

        if tempban_role and tempban_role in member.roles:

            if tempban_role >= bot_member.top_role:
                await ctx.reply(
                    embed=make_embed(
                        title="Role Hierarchy Error",
                        description=
                        (f"{EMOJIS['fail']} I cannot remove {tempban_role.mention}.\n"
                         f"{EMOJIS['arrow_point']} Move my role above it."),
                        level="ERROR",
                    ),
                    mention_author=False,
                )
                await _cleanup(ctx)
                return

            try:
                await member.remove_roles(
                    tempban_role,
                    reason=reason or f"Tempban removed by {author}",
                )
            except discord.Forbidden:
                await ctx.reply(
                    embed=make_embed(
                        title="Permission Error",
                        description=
                        (f"{EMOJIS['fail']} I cannot remove {tempban_role.mention}."
                         ),
                        level="ERROR",
                    ),
                    mention_author=False,
                )
                await _cleanup(ctx)
                return

        # region RESTORE VERIFIED ROLE
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

        # region DATABASE UPDATE
        await remove_tempban(
            guild_id=guild.id,
            user_id=member.id,
            moderator_id=author.id,
        )

        # region CONFIRMATION
        await ctx.reply(
            embed=make_embed(
                title="Tempban Removed",
                description=
                (f"{EMOJIS['success']} {member.mention} has been **untempbanned**.\n\n"
                 f"{EMOJIS['arrow_point']} **Reason:** {reason or 'No reason provided'}"
                 ),
                level="SUCCESS",
                footer=f"Action by {author}",
            ),
            mention_author=False,
        )

        # region MODERATION LOG
        log_channel_id = await get_log_channel(guild.id)

        if log_channel_id:
            log_channel = guild.get_channel(log_channel_id)
            if isinstance(log_channel, discord.TextChannel):
                await log_channel.send(embed=make_embed(
                    title="Tempban Lifted",
                    description=
                    (f"{EMOJIS['success']} **User:** {member.mention}\n"
                     f"{EMOJIS['arrow_point']} **Moderator:** {author.mention}\n"
                     f"{EMOJIS['arrow_point']} **Reason:** {reason or 'No reason provided'}"
                     ),
                    level="INFO",
                ))

        await _cleanup(ctx)


async def setup(bot: commands.Bot):
    await bot.add_cog(UnTempban(bot))
