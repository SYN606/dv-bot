import discord
from discord.ext import commands

from utils.embeds import make_embed
from utils.emojis import EMOJIS
from utils.check_perms import is_bot_admin_ctx

from db.db_helpers.tempban import (
    get_tempban_role,
    add_tempban,
)
from db.db_helpers.mod_logs import get_log_channel
from db.db_helpers.verification import get_verification_config


# region SAFE PREFIX CLEANUP
async def _cleanup(ctx: commands.Context) -> None:
    try:
        await ctx.message.delete()
    except (discord.Forbidden, discord.NotFound):
        pass


class Tempban(commands.Cog):
    """
    PREFIX ONLY:
    dv tempban <user | reply> [reason]
    Fully async (v2 architecture)
    """

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

        guild = ctx.guild
        moderator = ctx.author

        # region RESOLVE TARGET
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

        # region PERMISSION CHECK
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

        # region TEMPBAN ROLE CHECK 
        role_id = await get_tempban_role(guild.id)

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
                    (f"{EMOJIS['warning']} {target.mention} is already tempbanned."
                     ),
                    level="WARNING",
                ),
                mention_author=False,
            )
            await _cleanup(ctx)
            return

        # region REMOVE VERIFIED ROLE
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

        # region APPLY TEMPBAN
        await target.add_roles(
            tempban_role,
            reason=reason or f"Tempbanned by {moderator}",
        )

        # region DATABASE UPDATE 
        await add_tempban(
            guild_id=guild.id,
            user_id=target.id,
            moderator_id=moderator.id,
            reason=reason,
        )

        # region CONFIRMATION
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

        # region MODERATION LOG 
        log_channel_id = await get_log_channel(guild.id)

        if log_channel_id:
            log_channel = guild.get_channel(log_channel_id)
            if isinstance(log_channel, discord.TextChannel):
                await log_channel.send(embed=make_embed(
                    title="Tempban Applied",
                    description=
                    (f"{EMOJIS['ban']} **User:** {target.mention}\n"
                     f"{EMOJIS['arrow_point']} **Moderator:** {moderator.mention}\n"
                     f"{EMOJIS['arrow_point']} **Reason:** {reason or 'No reason provided'}"
                     ),
                    level="ERROR",
                ))

        await _cleanup(ctx)


async def setup(bot: commands.Bot):
    await bot.add_cog(Tempban(bot))
