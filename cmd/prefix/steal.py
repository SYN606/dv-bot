import asyncio
import re
from io import BytesIO
from typing import List

import aiohttp
import discord
from discord.ext import commands

from utils.embeds import make_embed
from utils.emojis import EMOJIS
from utils.check_perms import is_bot_admin_ctx

EMOJI_REGEX = re.compile(r"<(a?):(\w+):(\d+)>")


class EmojiSteal(commands.Cog):

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @commands.command(
        name="steal",
        help="Steal emojis or stickers by replying to a message",
    )
    async def steal(self, ctx: commands.Context):

        if ctx.guild is None:
            return

        if not await is_bot_admin_ctx(ctx):
            await ctx.reply(
                embed=make_embed(
                    title="Permission Denied",
                    description=
                    f"{EMOJIS['fail']} Administrator access required.",
                    level="ERROR",
                ),
                mention_author=False,
            )
            return

        ref = ctx.message.reference
        if not ref or not ref.message_id:

            await ctx.reply(
                embed=make_embed(
                    title="Reply Required",
                    description=
                    f"{EMOJIS['warning']} Reply to a message containing emojis or stickers.",
                    level="WARNING",
                ),
                mention_author=False,
            )
            return

        try:
            replied = await ctx.channel.fetch_message(ref.message_id)
        except discord.NotFound:
            return

        matches = EMOJI_REGEX.findall(replied.content)
        stickers = replied.stickers

        if not matches and not stickers:

            await ctx.reply(
                embed=make_embed(
                    title="Nothing Found",
                    description=
                    f"{EMOJIS['warning']} No custom emojis or stickers detected.",
                    level="WARNING",
                ),
                mention_author=False,
            )
            return

        added: List[str] = []
        failed: List[str] = []

        async with aiohttp.ClientSession() as session:

            tasks = []

            # EMOJIS
            for animated, name, emoji_id in matches:

                if len(ctx.guild.emojis) >= ctx.guild.emoji_limit:
                    failed.append(f"{name} (emoji limit reached)")
                    continue

                if any(e.name == name for e in ctx.guild.emojis):
                    failed.append(f"{name} (duplicate name)")
                    continue

                ext = "gif" if animated == "a" else "png"
                url = f"https://cdn.discordapp.com/emojis/{emoji_id}.{ext}"

                tasks.append(
                    self._steal_emoji(
                        ctx.guild,
                        session,
                        url,
                        name,
                        ctx.author, # type: ignore
                    ))

            # STICKERS
            for sticker in stickers:

                if len(ctx.guild.stickers) >= ctx.guild.sticker_limit:
                    failed.append(f"{sticker.name} (sticker limit reached)")
                    continue

                if sticker.format not in (
                        discord.StickerFormatType.png,
                        discord.StickerFormatType.apng,
                ):
                    failed.append(f"{sticker.name} (unsupported format)")
                    continue

                tasks.append(
                    self._steal_sticker(
                        ctx.guild,
                        session,
                        sticker,
                        ctx.author, # type: ignore
                    ))

            results = await asyncio.gather(*tasks, return_exceptions=True)

        for r in results:

            if isinstance(r, Exception):
                failed.append(str(r))
            else:
                added.append(r) # type: ignore

        embed = make_embed(
            title="Steal Result",
            description=
            (f"{EMOJIS['success']} **Added:** {', '.join(added) if added else 'None'}\n\n"
             f"{EMOJIS['fail']} **Failed:** {', '.join(failed) if failed else 'None'}"
             ),
            level="SUCCESS" if added else "WARNING",
            footer=f"Action by {ctx.author}",
        )

        await ctx.send(embed=embed)

        try:
            asyncio.create_task(ctx.message.delete())
        except Exception:
            pass

    async def _steal_emoji(
        self,
        guild: discord.Guild,
        session: aiohttp.ClientSession,
        url: str,
        name: str,
        author: discord.Member,
    ) -> str:

        async with session.get(url) as resp:

            if resp.status != 200:
                raise Exception(f"{name} (download failed)")

            image = await resp.read()

        emoji = await guild.create_custom_emoji(
            name=name,
            image=image,
            reason=f"Emoji stolen by {author}",
        )

        return str(emoji)

    async def _steal_sticker(
        self,
        guild: discord.Guild,
        session: aiohttp.ClientSession,
        sticker: discord.StickerItem,
        author: discord.Member,
    ) -> str:

        async with session.get(sticker.url) as resp:

            if resp.status != 200:
                raise Exception(f"{sticker.name} (download failed)")

            image = await resp.read()

        new_sticker = await guild.create_sticker(
            name=sticker.name[:30],
            description="Stolen sticker",
            emoji=EMOJIS['pants'],
            file=discord.File(
                BytesIO(image),
                filename="sticker.png",
            ),
            reason=f"Sticker stolen by {author}",
        )

        return new_sticker.name


async def setup(bot: commands.Bot):
    await bot.add_cog(EmojiSteal(bot))
