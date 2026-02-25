import asyncio
import re
from io import BytesIO

import aiohttp
import discord
from discord.ext import commands

from utils.embeds import make_embed
from utils.emojis import EMOJIS
from utils.check_perms import is_bot_admin_ctx

EMOJI_REGEX = re.compile(r"<(a?):(\w+):(\d+)>")


class EmojiSteal(commands.Cog):
    """
    Emoji & Sticker steal command.
    Fast, parallel, production-ready.
    """

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @commands.command(
        name="steal",
        help="Steal custom emojis or stickers by replying (admin only)",
    )
    async def steal(self, ctx: commands.Context):

        if ctx.guild is None:
            return

        if not is_bot_admin_ctx(ctx):
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
            replied_msg = await ctx.channel.fetch_message(ref.message_id)
        except discord.NotFound:
            return

        matches = EMOJI_REGEX.findall(replied_msg.content)
        stickers = replied_msg.stickers

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

        added: list[str] = []
        failed: list[str] = []

        async with aiohttp.ClientSession() as session:

            # region Handle Emojis
            emoji_tasks = []

            for animated, name, emoji_id in matches:

                if len(ctx.guild.emojis) >= ctx.guild.emoji_limit:
                    failed.append(f"{name} (emoji limit reached)")
                    continue

                ext = "gif" if animated == "a" else "png"
                url = f"https://cdn.discordapp.com/emojis/{emoji_id}.{ext}"

                emoji_tasks.append(
                    self._create_emoji(
                        ctx.guild,
                        session,
                        url,
                        name,
                        ctx.author,
                    ))

            emoji_results = await asyncio.gather(
                *emoji_tasks,
                return_exceptions=True,
            )

            for result in emoji_results:
                if isinstance(result, str):
                    added.append(result)
                else:
                    failed.append("emoji")

            # region Handle Stickers
            sticker_tasks = []

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

                sticker_tasks.append(
                    self._create_sticker(
                        ctx.guild,
                        session,
                        sticker,
                        ctx.author,
                    ))

            sticker_results = await asyncio.gather(
                *sticker_tasks,
                return_exceptions=True,
            )

            for result in sticker_results:
                if isinstance(result, str):
                    added.append(result)
                else:
                    failed.append("sticker")

        embed = make_embed(
            title="Steal Result",
            description=
            (f"{EMOJIS['success']} **Added:** { ' '.join(added) if added else 'None' }\n\n"
             f"{EMOJIS['red_dot']} **Failed:** { ', '.join(failed) if failed else 'None' }"
             ),
            level="SUCCESS" if added else "WARNING",
            footer=f"Action by {ctx.author}",
        )

        await ctx.send(embed=embed)

        # Non-blocking delete of invoking message
        try:
            asyncio.create_task(ctx.message.delete())
        except Exception:
            pass

    # region Emoji creation 
    async def _create_emoji(
        self,
        guild: discord.Guild,
        session: aiohttp.ClientSession,
        url: str,
        name: str,
        author: discord.Member,
    ) -> str:

        async with session.get(url) as resp:
            if resp.status != 200:
                raise Exception("Failed to fetch emoji")
            image = await resp.read()

        emoji = await guild.create_custom_emoji(
            name=name,
            image=image,
            reason=f"Emoji stolen by {author}",
        )

        return str(emoji)

    # region Sticker creation 
    async def _create_sticker(
        self,
        guild: discord.Guild,
        session: aiohttp.ClientSession,
        sticker: discord.StickerItem,
        author: discord.Member,
    ) -> str:

        async with session.get(sticker.url) as resp:
            if resp.status != 200:
                raise Exception("Failed to fetch sticker")
            image = await resp.read()

        new_sticker = await guild.create_sticker(
            name=sticker.name,
            description="Stolen sticker",
            emoji="🙂",
            file=discord.File(
                fp=BytesIO(image),
                filename="sticker.png",
            ),
            reason=f"Sticker stolen by {author}",
        )

        return new_sticker.name


# region EXTENSION ENTRYPOINT
async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(EmojiSteal(bot))
