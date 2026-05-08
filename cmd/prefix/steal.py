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


class EmojiSteal(commands.Cog):

    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self._semaphore = asyncio.Semaphore(1)

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

        # reply check
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
            await ctx.reply(
                embed=make_embed(
                    title="Error",
                    description="Could not fetch the message.",
                    level="ERROR",
                ),
                mention_author=False,
            )
            return

        matches = EMOJI_REGEX.findall(replied.content)
        stickers = replied.stickers

        if not matches and not stickers:
            await ctx.reply(
                embed=make_embed(
                    title="Nothing Found",
                    description="No emojis or stickers detected.",
                    level="WARNING",
                ),
                mention_author=False,
            )
            return

        added: List[str] = []
        failed: List[str] = []

        seen_names = set()

        progress = await ctx.send(embed=make_embed(
            title="Stealing...",
            description="Initializing transfer...",
            level="INFO",
        ))

        async with aiohttp.ClientSession() as session:

            # steal emojis
            for animated, name, emoji_id in matches:

                if len(added) >= MAX_ITEMS:
                    failed.append("emoji limit reached")
                    break

                if name in seen_names:
                    failed.append(f"{name} (duplicate)")
                    continue

                seen_names.add(name)

                if len(ctx.guild.emojis) >= ctx.guild.emoji_limit:
                    failed.append(f"{name} (server full)")
                    continue

                if any(e.name == name for e in ctx.guild.emojis):
                    failed.append(f"{name} (exists)")
                    continue

                ext = "gif" if animated == "a" else "png"

                url = f"https://cdn.discordapp.com/emojis/{emoji_id}.{ext}"

                result = await self._steal_emoji(
                    guild=ctx.guild,
                    session=session,
                    url=url,
                    name=name,
                    author=ctx.author, # type: ignore
                )

                if result["success"]:
                    added.append(result["emoji"])

                else:
                    failed.append(f"{result['name']} ({result['reason']})")

                await progress.edit(embed=make_embed(
                    title="Stealing...",
                    description=(f"{EMOJIS['success']} Added: `{len(added)}`\n"
                                 f"{EMOJIS['fail']} Failed: `{len(failed)}`"),
                    level="INFO",
                ))

                await asyncio.sleep(1.8)

            # steal stickers
            for sticker in stickers:

                if len(added) >= MAX_ITEMS:
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

                result = await self._steal_sticker(
                    guild=ctx.guild,
                    session=session,
                    sticker=sticker, # type: ignore
                    author=ctx.author, # type: ignore
                )

                if result["success"]:
                    added.append(result["name"])

                else:
                    failed.append(f"{result['name']} ({result['reason']})")

                await progress.edit(embed=make_embed(
                    title="Stealing...",
                    description=(f"{EMOJIS['success']} Added: `{len(added)}`\n"
                                 f"{EMOJIS['fail']} Failed: `{len(failed)}`"),
                    level="INFO",
                ))

                await asyncio.sleep(2)

        # final embed
        embed = make_embed(
            title="Steal Complete",
            description=(f"{EMOJIS['success']} Added: `{len(added)}`\n"
                         f"{EMOJIS['fail']} Failed: `{len(failed)}`"),
            level="SUCCESS" if added else "WARNING",
            footer=f"{ctx.author}",
        )

        if failed:

            shortened = failed[:10]

            embed.add_field(
                name="Failed Items",
                value="\n".join(shortened),
                inline=False,
            )

        await progress.edit(embed=embed)

        # cleanup
        try:
            await ctx.message.delete()

        except Exception:
            pass

    async def _steal_emoji(
        self,
        guild: discord.Guild,
        session: aiohttp.ClientSession,
        url: str,
        name: str,
        author: discord.Member,
    ):

        async with self._semaphore:

            retries = 3

            for attempt in range(retries):

                try:

                    async with session.get(url, timeout=20) as resp: # type: ignore

                        if resp.status != 200:
                            return {
                                "success": False,
                                "name": name,
                                "reason": f"cdn {resp.status}",
                            }

                        image = await resp.read()

                    emoji = await guild.create_custom_emoji(
                        name=name,
                        image=image,
                        reason=f"Added by {author}",
                    )

                    return {
                        "success": True,
                        "emoji": str(emoji),
                        "name": name,
                    }

                except discord.HTTPException as e:

                    if e.status == 429:

                        retry_after = getattr(e, "retry_after", 5)

                        await asyncio.sleep(retry_after + 1)
                        continue

                    return {
                        "success": False,
                        "name": name,
                        "reason": f"http {e.status}",
                    }

                except asyncio.TimeoutError:

                    if attempt < retries - 1:
                        await asyncio.sleep(3)
                        continue

                    return {
                        "success": False,
                        "name": name,
                        "reason": "timeout",
                    }

                except Exception as e:

                    return {
                        "success": False,
                        "name": name,
                        "reason": str(e)[:80],
                    }

            return {
                "success": False,
                "name": name,
                "reason": "max retries",
            }

    async def _steal_sticker(
        self,
        guild: discord.Guild,
        session: aiohttp.ClientSession,
        sticker: discord.Sticker,
        author: discord.Member,
    ):

        async with self._semaphore:

            retries = 3

            for attempt in range(retries):

                try:

                    async with session.get(sticker.url, timeout=20) as resp: # type: ignore

                        if resp.status != 200:
                            return {
                                "success": False,
                                "name": sticker.name,
                                "reason": f"cdn {resp.status}",
                            }

                        image = await resp.read()

                    new_sticker = await guild.create_sticker(
                        name=sticker.name[:30],
                        description="Imported",
                        emoji="🙂",
                        file=discord.File(
                            BytesIO(image),
                            filename="sticker.png",
                        ),
                        reason=f"Added by {author}",
                    )

                    return {
                        "success": True,
                        "name": new_sticker.name,
                    }

                except discord.HTTPException as e:

                    if e.status == 429:

                        retry_after = getattr(e, "retry_after", 5)

                        await asyncio.sleep(retry_after + 1)
                        continue

                    return {
                        "success": False,
                        "name": sticker.name,
                        "reason": f"http {e.status}",
                    }

                except asyncio.TimeoutError:

                    if attempt < retries - 1:
                        await asyncio.sleep(3)
                        continue

                    return {
                        "success": False,
                        "name": sticker.name,
                        "reason": "timeout",
                    }

                except Exception as e:

                    return {
                        "success": False,
                        "name": sticker.name,
                        "reason": str(e)[:80],
                    }

            return {
                "success": False,
                "name": sticker.name,
                "reason": "max retries",
            }


async def setup(bot: commands.Bot):
    await bot.add_cog(EmojiSteal(bot))
