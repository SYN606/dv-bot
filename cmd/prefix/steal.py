import asyncio
import re
import time
from io import BytesIO
from typing import List

import aiohttp
import discord
from discord.ext import commands

from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS
from utils.permissions.check_perms import is_bot_admin_ctx

EMOJI_REGEX = re.compile(r"<(a?):(\w+):(\d+)>")

_global_cd: dict[int, float] = {}
GLOBAL_COOLDOWN = 5
MAX_ITEMS = 10


async def run_batches(tasks, batch_size=4, delay=0.3):
    results = []
    for i in range(0, len(tasks), batch_size):
        batch = tasks[i:i + batch_size]
        batch_results = await asyncio.gather(*batch, return_exceptions=True)
        results.extend(batch_results)
        await asyncio.sleep(delay)
    return results


class EmojiSteal(commands.Cog):

    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self._semaphore = asyncio.Semaphore(3)  # controlled concurrency

    @commands.command(name="steal", help="Steal emojis or stickers")
    @commands.cooldown(1, 10, commands.BucketType.user)
    async def steal(self, ctx: commands.Context):

        if ctx.guild is None:
            return

        # global cooldown
        gid = ctx.guild.id
        now = time.time()
        last = _global_cd.get(gid, 0)
        remaining = GLOBAL_COOLDOWN - (now - last)

        if remaining > 0:
            await ctx.reply(
                embed=make_embed(
                    title="Cooldown",
                    description=
                    f"Wait `{remaining:.1f}s` before using this again.",
                    level="WARNING",
                ),
                mention_author=False,
            )
            return

        _global_cd[gid] = now

        # permission check
        if not await is_bot_admin_ctx(ctx):
            await ctx.reply(
                embed=make_embed(
                    title="Permission Denied",
                    description="Administrator access required.",
                    level="ERROR",
                ),
                mention_author=False,
            )
            return

        # must reply to message
        ref = ctx.message.reference
        if not ref or not ref.message_id:
            await ctx.reply(
                embed=make_embed(
                    title="Reply Required",
                    description=
                    "Reply to a message containing emojis or stickers.",
                    level="WARNING",
                ),
                mention_author=False,
            )
            return

        try:
            replied = await ctx.channel.fetch_message(ref.message_id)
        except discord.NotFound:
            return await ctx.reply(
                embed=make_embed(
                    title="Error",
                    description="Could not fetch the message.",
                    level="ERROR",
                ),
                mention_author=False,
            )

        matches = EMOJI_REGEX.findall(replied.content)
        stickers = replied.stickers

        if not matches and not stickers:
            return await ctx.reply(
                embed=make_embed(
                    title="Nothing Found",
                    description="No emojis or stickers detected.",
                    level="WARNING",
                ),
                mention_author=False,
            )

        added: List[str] = []
        failed: List[str] = []

        seen_names = set()
        emoji_count = 0
        sticker_count = 0

        async with aiohttp.ClientSession() as session:

            tasks = []

            # process emojis
            for animated, name, emoji_id in matches:

                if name in seen_names:
                    failed.append(f"{name} (duplicate)")
                    continue

                seen_names.add(name)

                if emoji_count >= MAX_ITEMS:
                    failed.append("emoji limit reached")
                    break

                if len(ctx.guild.emojis) >= ctx.guild.emoji_limit:
                    failed.append(f"{name} (server full)")
                    continue

                if any(e.name == name for e in ctx.guild.emojis):
                    failed.append(f"{name} (exists)")
                    continue

                ext = "gif" if animated == "a" else "png"
                url = f"https://cdn.discordapp.com/emojis/{emoji_id}.{ext}"

                tasks.append(
                    self._steal_emoji(ctx.guild, session, url, name,
                                      ctx.author))

                emoji_count += 1

            # process stickers
            for sticker in stickers:

                if sticker_count >= MAX_ITEMS:
                    failed.append("sticker limit reached")
                    break

                if len(ctx.guild.stickers) >= ctx.guild.sticker_limit:
                    failed.append(f"{sticker.name} (server full)")
                    continue

                if sticker.format not in (
                        discord.StickerFormatType.png,
                        discord.StickerFormatType.apng,
                ):
                    failed.append(f"{sticker.name} (unsupported)")
                    continue

                tasks.append(
                    self._steal_sticker(ctx.guild, session, sticker,
                                        ctx.author))

                sticker_count += 1

            # run tasks safely
            results = await run_batches(tasks)

        # collect results
        for r in results:
            if isinstance(r, Exception):
                failed.append("failed")
            elif isinstance(r, str):
                added.append(r)

        embed = make_embed(
            title="Steal Complete",
            description=(f"{EMOJIS['success']} Added: `{len(added)}`\n"
                         f"{EMOJIS['fail']} Failed: `{len(failed)}`"),
            level="SUCCESS" if added else "WARNING",
            footer=f"{ctx.author}",
        )

        await ctx.send(embed=embed)

        # cleanup
        try:
            await ctx.message.delete()
        except Exception:
            pass

    async def _steal_emoji(self, guild, session, url, name, author):

        async with self._semaphore:
            async with session.get(url) as resp:
                if resp.status != 200:
                    raise Exception("fetch failed")
                image = await resp.read()

            emoji = await guild.create_custom_emoji(
                name=name,
                image=image,
                reason=f"Added by {author}",
            )

            return str(emoji)

    async def _steal_sticker(self, guild, session, sticker, author):

        async with self._semaphore:
            async with session.get(sticker.url) as resp:
                if resp.status != 200:
                    raise Exception("fetch failed")
                image = await resp.read()

            new_sticker = await guild.create_sticker(
                name=sticker.name[:30],
                description="Imported",
                emoji="🙂",
                file=discord.File(BytesIO(image), filename="sticker.png"),
                reason=f"Added by {author}",
            )

            return new_sticker.name


async def setup(bot: commands.Bot):
    await bot.add_cog(EmojiSteal(bot))
