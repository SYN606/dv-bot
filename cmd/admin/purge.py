import asyncio
import datetime
import discord
from discord.ext import commands

from utils.base_admin import BaseAdminCog
from utils.embeds import make_embed
from utils.emojis import EMOJIS
from utils.logging.mod_log import send_mod_log


class Purge(BaseAdminCog):
    """
    Prefix purge command (rate-limit safe).

    Usage:
    dv purge <amount>
    dv purge @user <amount>
    """

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @commands.command(name="purge")
    @commands.guild_only()
    async def purge(self, ctx: commands.Context, *args):

        guild = ctx.guild
        channel = ctx.channel

        if guild is None or not isinstance(channel, discord.TextChannel):
            return

        # ─────────────────────────
        # Argument validation
        # ─────────────────────────
        if not args:
            return await ctx.reply(
                embed=make_embed(
                    title="Invalid Usage",
                    description=("Usage:\n"
                                 "`dv purge <amount>`\n"
                                 "`dv purge @user <amount>`"),
                    level="WARNING",
                ),
                mention_author=False,
            )

        member: discord.Member | None = None
        amount: int | None = None

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
                    description="Maximum purge limit is 100 messages.",
                    level="WARNING",
                ),
                mention_author=False,
            )

        # ─────────────────────────
        # Delete invoking command
        # ─────────────────────────
        try:
            await ctx.message.delete()
        except discord.HTTPException:
            pass

        # ─────────────────────────
        # Execute purge (rate-limit safe)
        # ─────────────────────────
        deleted_count = 0
        now = discord.utils.utcnow()
        fourteen_days = datetime.timedelta(days=14)

        try:
            messages: list[discord.Message] = []

            # Reduce scan multiplier (less API stress)
            scan_limit = amount * 3 if member else amount

            async for msg in channel.history(limit=scan_limit):
                if msg.pinned:
                    continue

                if member and msg.author != member:
                    continue

                messages.append(msg)

                if len(messages) >= amount:
                    break

            if messages:

                young = [
                    m for m in messages if now - m.created_at < fourteen_days
                ]

                old = [
                    m for m in messages if now - m.created_at >= fourteen_days
                ]

                # Bulk delete (fast, 1 request)
                if young:
                    await channel.delete_messages(young)

                # Delete old messages individually (rate-safe)
                for m in old:
                    try:
                        await m.delete()
                        await asyncio.sleep(0.25)
                    except discord.HTTPException:
                        pass

                deleted_count = len(young) + len(old)

        except discord.Forbidden:
            return await ctx.send(embed=make_embed(
                title="Missing Permissions",
                description="I need **Manage Messages** permission.",
                level="ERROR",
            ))

        # ─────────────────────────
        # Confirmation
        # ─────────────────────────
        if member:
            description = (
                f"{EMOJIS['moderation']} Cleared "
                f"**{deleted_count}** messages from {member.mention}.")
        else:
            description = (f"{EMOJIS['moderation']} Cleared "
                           f"**{deleted_count}** messages.")

        embed = make_embed(
            title="Messages Purged",
            description=description,
            level="SUCCESS",
            footer=f"Action by {ctx.author}",
        )

        confirmation = await ctx.send(embed=embed)

        # ─────────────────────────
        # Structured logging
        # ─────────────────────────
        await send_mod_log(
            guild=guild,
            category="PURGE",
            title="Messages Purged",
            description=description,
            level="WARNING",
            actor=ctx.author,
            target=member,
            extra_fields={
                "Channel": channel.mention,
                "Deleted Count": deleted_count,
            },
        )

        # Auto delete confirmation
        await asyncio.sleep(5)

        try:
            await confirmation.delete()
        except discord.HTTPException:
            pass


async def setup(bot: commands.Bot):
    await bot.add_cog(Purge(bot))
