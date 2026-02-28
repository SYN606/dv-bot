import asyncio
import discord
from discord.ext import commands

from utils.embeds import make_embed
from utils.emojis import EMOJIS
from utils.check_perms import is_bot_admin_ctx


class Purge(commands.Cog):
    """
    Prefix purge command.

    Usage:
    dv purge <amount>
    dv purge @user <amount>
    """

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @commands.command(name="purge")
    @commands.guild_only()
    async def purge(self, ctx: commands.Context, *args):

        # Permission Check
        if not await is_bot_admin_ctx(ctx):
            return await ctx.reply(
                embed=make_embed(
                    title="Permission Denied",
                    description="You are not allowed to use this command.",
                    level="ERROR",
                ),
                mention_author=False,
            )

        # Argument Validation
        if not args:
            return await ctx.reply(
                embed=make_embed(
                    title="Invalid Usage",
                    description="Usage:\n`dv purge <amount>`\n`dv purge @user <amount>`",
                    level="WARNING",
                ),
                mention_author=False,
            )

        member: discord.Member | None = None
        amount: int | None = None

        # Case: dv purge 50
        if len(args) == 1:
            try:
                amount = int(args[0])
            except ValueError:
                return await ctx.reply(
                    embed=make_embed(
                        title="Invalid Amount",
                        description="Amount must be a valid number.",
                        level="WARNING",
                    ),
                    mention_author=False,
                )

        # Case: dv purge @user 50
        elif len(args) == 2:
            if not ctx.message.mentions:
                return await ctx.reply(
                    embed=make_embed(
                        title="Invalid Usage",
                        description="You must mention a valid user.",
                        level="WARNING",
                    ),
                    mention_author=False,
                )

            member = ctx.message.mentions[0]

            try:
                amount = int(args[1])
            except ValueError:
                return await ctx.reply(
                    embed=make_embed(
                        title="Invalid Amount",
                        description="Amount must be a valid number.",
                        level="WARNING",
                    ),
                    mention_author=False,
                )
        else:
            return await ctx.reply(
                embed=make_embed(
                    title="Invalid Usage",
                    description="Too many arguments provided.",
                    level="WARNING",
                ),
                mention_author=False,
            )

        # Amount Constraints
        if amount is None or amount <= 0:
            return await ctx.reply(
                embed=make_embed(
                    title="Invalid Amount",
                    description="Amount must be greater than 0.",
                    level="WARNING",
                ),
                mention_author=False,
            )

        if amount > 100:
            return await ctx.reply(
                embed=make_embed(
                    title="Limit Exceeded",
                    description="Maximum purge limit is 100 messages at once.",
                    level="WARNING",
                ),
                mention_author=False,
            )

        # Delete Command Message
        try:
            await ctx.message.delete()
        except discord.HTTPException:
            pass

        # Execute Purge
        try:
            if member:

                # Widen search window for filtered purge
                deleted = await ctx.channel.purge(
                    limit=amount * 5,
                    check=lambda m: m.author == member,
                )

                deleted_count = len(deleted)

                embed = make_embed(
                    title="User Messages Purged",
                    description=(
                        f"{EMOJIS['moderation']} Cleared **{deleted_count}** messages "
                        f"from {member.mention}."
                    ),
                    level="SUCCESS",
                    footer=f"Action by {ctx.author}",
                )

            else:
                deleted = await ctx.channel.purge(limit=amount)
                deleted_count = len(deleted)

                embed = make_embed(
                    title="Messages Purged",
                    description=(
                        f"{EMOJIS['moderation']} Cleared **{deleted_count}** messages."
                    ),
                    level="SUCCESS",
                    footer=f"Action by {ctx.author}",
                )

        except discord.Forbidden:
            return await ctx.send(
                embed=make_embed(
                    title="Missing Permissions",
                    description="I need **Manage Messages** permission.",
                    level="ERROR",
                )
            )

        # Confirmation 
        confirmation = await ctx.send(embed=embed)

        await asyncio.sleep(5)

        try:
            await confirmation.delete()
        except discord.HTTPException:
            pass


async def setup(bot: commands.Bot):
    await bot.add_cog(Purge(bot))