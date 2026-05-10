import discord
from discord.ext import commands

from utils.permissions.base_admin import (
    BaseAdminCog,
)

from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS

from utils.handlers.vc_mod_handlers.moveall_handler import (
    move_all_members,
)


class VCMoveAll(
    BaseAdminCog,
):
    def __init__(
        self,
        bot: commands.Bot,
    ):

        self.bot = bot

    @commands.hybrid_command(
        name="moveall",
        aliases=[
            "dragall",
        ],
        description="Move all users between voice channels.",
    )
    @commands.cooldown(
        1,
        15,
        commands.BucketType.guild,
    )
    @commands.max_concurrency(
        1,
        per=commands.BucketType.guild,
        wait=False,
    )
    async def moveall(
        self,
        ctx: commands.Context,
        source: discord.VoiceChannel,
        target: discord.VoiceChannel,
    ):

        author = ctx.author

        if not isinstance(
            author,
            discord.Member,
        ):
            return

        guild = ctx.guild

        if guild is None:
            return

        # Same VC
        if source.id == target.id:
            await ctx.send(
                embed=make_embed(
                    title=f"{EMOJIS['warning']} Same Channel",
                    description=(
                        "Source and target voice channels cannot be the same."
                    ),
                    level="WARNING",
                ),
            )

            return

        # Empty source VC
        if not source.members:
            await ctx.send(
                embed=make_embed(
                    title=f"{EMOJIS['warning']} Empty Voice Channel",
                    description=("No users found in source VC."),
                    level="WARNING",
                ),
            )

            return

        # Moderator permissions
        source_permissions = source.permissions_for(
            author,
        )

        target_permissions = target.permissions_for(
            author,
        )

        if not source_permissions.move_members or not target_permissions.move_members:
            await ctx.send(
                embed=make_embed(
                    title=f"{EMOJIS['fail']} Missing Permissions",
                    description=(
                        "You do not have permission "
                        "to move members between "
                        "these voice channels."
                    ),
                    level="ERROR",
                ),
            )

            return

        # Bot permissions
        bot_member = guild.me

        if not bot_member:
            return

        source_bot_permissions = source.permissions_for(
            bot_member,
        )

        target_bot_permissions = target.permissions_for(
            bot_member,
        )

        if (
            not source_bot_permissions.move_members
            or not target_bot_permissions.move_members
        ):
            await ctx.send(
                embed=make_embed(
                    title=f"{EMOJIS['fail']} Bot Missing Permissions",
                    description=(
                        "I do not have permission "
                        "to move members between "
                        "these voice channels."
                    ),
                    level="ERROR",
                ),
            )

            return

        # Move members
        moved = await move_all_members(
            source,
            target,
        )

        # Failed
        if moved <= 0:
            await ctx.send(
                embed=make_embed(
                    title=f"{EMOJIS['fail']} Move Failed",
                    description=("Unable to move members."),
                    level="ERROR",
                ),
            )

            return

        await ctx.send(
            embed=make_embed(
                title=f"{EMOJIS['success']} Members Moved",
                description=(
                    f"{EMOJIS['arrow_point']} "
                    f"Moved `{moved}` users "
                    f"from {source.mention} "
                    f"to {target.mention}"
                ),
                level="SUCCESS",
            ),
        )

    # Cooldown handler
    @moveall.error
    async def moveall_error(
        self,
        ctx: commands.Context,
        error: commands.CommandError,
    ):

        # Cooldown
        if isinstance(
            error,
            commands.CommandOnCooldown,
        ):
            await ctx.send(
                embed=make_embed(
                    title=f"{EMOJIS['warning']} Command On Cooldown",
                    description=(
                        f"Please wait "
                        f"`{error.retry_after:.1f}s` "
                        f"before using this command again."
                    ),
                    level="WARNING",
                ),
            )

            return

        # Concurrency lock
        if isinstance(
            error,
            commands.MaxConcurrencyReached,
        ):
            await ctx.send(
                embed=make_embed(
                    title=f"{EMOJIS['warning']} Command Busy",
                    description=("Another moveall operation is already running."),
                    level="WARNING",
                ),
            )


async def setup(
    bot: commands.Bot,
):

    await bot.add_cog(
        VCMoveAll(bot),
    )
