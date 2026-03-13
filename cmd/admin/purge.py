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
    Advanced purge command (large bot style).

    Usage:
    dv purge <amount>
    dv purge @user <amount>

    Works in:
    - Text channels
    - Voice channel chat
    - Threads
    - Forum posts
    """

    MAX_PURGE = 1000

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @commands.command(name="purge")
    @commands.guild_only()
    @commands.has_permissions(manage_messages=True)
    async def purge(self, ctx: commands.Context, *args):

        guild = ctx.guild
        channel = ctx.channel

        if guild is None or not hasattr(channel, "history"):
            return

        # ─────────────────────────
        # Argument parsing
        # ─────────────────────────
        member: discord.Member | None = None
        amount: int | None = None

        if not args:
            return await ctx.reply(
                embed=make_embed(
                    title="Invalid Usage",
                    description=("`dv purge <amount>`\n`dv purge @user <amount>`"),
                    level="WARNING",
                ),
                mention_author=False,
            )

        if len(args) == 1:
            try:
                amount = int(args[0])
            except ValueError:
                return await ctx.reply(
                    embed=make_embed(
                        title="Invalid Amount",
                        description="Amount must be a number.",
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
                        description="Amount must be a number.",
                        level="WARNING",
                    ),
                    mention_author=False,
                )
        else:
            return await ctx.reply(
                embed=make_embed(
                    title="Invalid Usage",
                    description="Too many arguments.",
                    level="WARNING",
                ),
                mention_author=False,
            )

        if amount <= 0:
            return await ctx.reply(
                embed=make_embed(
                    title="Invalid Amount",
                    description="Amount must be greater than 0.",
                    level="WARNING",
                ),
                mention_author=False,
            )

        if amount > self.MAX_PURGE:
            return await ctx.reply(
                embed=make_embed(
                    title="Limit Exceeded",
                    description=f"Maximum purge limit is **{self.MAX_PURGE}**.",
                    level="WARNING",
                ),
                mention_author=False,
            )

        # delete invoking command
        try:
            await ctx.message.delete()
        except discord.HTTPException:
            pass

        # ─────────────────────────
        # Message collection
        # ─────────────────────────

        now = discord.utils.utcnow()
        fourteen_days = datetime.timedelta(days=14)

        messages: list[discord.Message] = []

        scan_limit = amount * 5 if member else amount

        async for msg in channel.history(limit=scan_limit):
            if msg.pinned:
                continue

            if member and msg.author != member:
                continue

            messages.append(msg)

            if len(messages) >= amount:
                break

        if not messages:
            return

        young = []
        old = []

        for m in messages:
            if now - m.created_at < fourteen_days:
                young.append(m)
            else:
                old.append(m)

        deleted = 0

        # ─────────────────────────
        # Fast bulk delete
        # ─────────────────────────

        while young:
            batch = young[:100]
            young = young[100:]

            try:
                await channel.delete_messages(batch)
                deleted += len(batch)
            except discord.HTTPException:
                pass

        # ─────────────────────────
        # Old message deletion
        # ─────────────────────────

        for msg in old:
            try:
                await msg.delete()
                deleted += 1
                await asyncio.sleep(0.35)
            except discord.HTTPException:
                pass

        # ─────────────────────────
        # Confirmation
        # ─────────────────────────

        if member:
            description = (
                f"{EMOJIS['moderation']} Cleared "
                f"**{deleted}** messages from {member.mention}"
            )
        else:
            description = f"{EMOJIS['moderation']} Cleared **{deleted}** messages"

        embed = make_embed(
            title="Messages Purged",
            description=description,
            level="SUCCESS",
            footer=f"Action by {ctx.author}",
        )

        msg = await ctx.send(embed=embed)

        # ─────────────────────────
        # Structured mod log
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
                "Deleted Count": deleted,
            },
        )

        await asyncio.sleep(5)

        try:
            await msg.delete()
        except discord.HTTPException:
            pass


async def setup(bot: commands.Bot):
    await bot.add_cog(Purge(bot))
