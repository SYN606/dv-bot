from __future__ import annotations

import asyncio
import logging
import re
import time
from io import BytesIO
from typing import Dict, List, Optional, Tuple, TypedDict

import aiohttp
import discord
from discord.ext import commands

from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS
from utils.permissions.check_perms import is_bot_admin_ctx

logger = logging.getLogger("DigitalVigital")

EMOJI_REGEX = re.compile(r"<(a?):(\w+):(\d+)>")
SANITIZER_REGEX = re.compile(r"[^a-zA-Z0-9_]")

_global_cd: dict[int, float] = {}

GLOBAL_COOLDOWN = 5
MAX_ITEMS = 10


class StealResult(TypedDict):
    success: bool
    name: str
    emoji: Optional[str]
    reason: Optional[str]


class EmojiSteal(commands.Cog):
    """Admin command cog for stealing custom emojis and stickers from messages."""

    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self._semaphore = asyncio.Semaphore(1)

    async def _cleanup_invocation(self, ctx: commands.Context) -> None:
        """Safely delete original text invocation message if applicable."""
        if ctx.interaction:
            return
        try:
            await ctx.message.delete()
        except (discord.Forbidden, discord.NotFound, discord.HTTPException):
            pass

    @staticmethod
    def _sanitize_emoji_name(name: str) -> str:
        """Format emoji name with 'dv_' prefix and remove disallowed characters."""
        clean_name = SANITIZER_REGEX.sub("", name)
        final_name = f"dv_{clean_name}"
        return final_name[:32]  # Discord emoji name length cap is 32

    @staticmethod
    def _format_sticker_name(name: str) -> str:
        """Format sticker name with '.gg/flex-dv ' prefix truncated to 30 chars."""
        prefix = ".gg/flex-dv "
        max_name_len = 30 - len(prefix)
        clean_name = name.strip()[:max_name_len]
        return f"{prefix}{clean_name}"

    @commands.hybrid_command(
        name="steal",
        aliases=["stealemoji", "addemoji"],
        description=
        "Steal custom emojis or stickers from a replied message or input.",
    )
    @commands.guild_only()
    @commands.cooldown(1, 10, commands.BucketType.user)
    async def steal(self,
                    ctx: commands.Context,
                    *,
                    content: Optional[str] = None):
        """Extract and upload custom emojis and stickers into the current server."""
        guild = ctx.guild
        if guild is None:
            return

        # 1. Global Server Cooldown Check
        gid = guild.id
        now = time.time()
        last = _global_cd.get(gid, 0)
        remaining = GLOBAL_COOLDOWN - (now - last)

        if remaining > 0:
            embed = make_embed(
                title=f"{EMOJIS['warning']} Cooldown Active",
                description=
                f"Wait `{remaining:.1f}s` before using this command again.",
                level="WARNING",
            )
            await ctx.reply(embed=embed, mention_author=False)
            return

        _global_cd[gid] = now

        # 2. Permission Check
        if not await is_bot_admin_ctx(ctx):
            embed = make_embed(
                title=f"{EMOJIS['fail']} Permission Denied",
                description=
                "Administrator access is required to use this command.",
                level="ERROR",
            )
            await ctx.reply(embed=embed, mention_author=False)
            return

        # 3. Source Message Resolution (Direct Input vs. Replied Message)
        target_content = content or ""
        stickers_to_steal: List[discord.StickerItem
                                | discord.GuildSticker] = []

        ref = ctx.message.reference
        if ref and ref.message_id:
            try:
                replied = await ctx.channel.fetch_message(ref.message_id)
                target_content += f" {replied.content}"
                stickers_to_steal.extend(replied.stickers)
            except (discord.NotFound, discord.HTTPException):
                embed = make_embed(
                    title=f"{EMOJIS['fail']} Error",
                    description=
                    "Could not fetch the referenced target message.",
                    level="ERROR",
                )
                await ctx.reply(embed=embed, mention_author=False)
                return

        emoji_matches = EMOJI_REGEX.findall(target_content)

        if not emoji_matches and not stickers_to_steal:
            embed = make_embed(
                title=f"{EMOJIS['warning']} Nothing Found",
                description=
                "No custom emojis or stickers were detected. Reply to a message or provide emojis in arguments.",
                level="WARNING",
            )
            await ctx.reply(embed=embed, mention_author=False)
            return

        # 4. Progress Initialization
        progress_embed = make_embed(
            title=f"{EMOJIS['rounded_loading']} Transferring Assets...",
            description="Processing target emojis and stickers...",
            level="INFO",
        )
        progress_msg = await ctx.send(embed=progress_embed)

        added_items: List[str] = []
        failed_items: List[str] = []
        seen_names: set[str] = set()

        session = self.bot.http._HTTPClient__session  # type: ignore # Reuse internal bot session

        # 5. Process Emojis
        for animated, raw_name, emoji_id in emoji_matches:
            if len(added_items) >= MAX_ITEMS:
                failed_items.append("Reached maximum batch limit (10)")
                break

            formatted_name = self._sanitize_emoji_name(raw_name)

            if formatted_name in seen_names:
                continue
            seen_names.add(formatted_name)

            if len(guild.emojis) >= guild.emoji_limit:
                failed_items.append(
                    f"`{formatted_name}` (Server emoji capacity full)")
                continue

            if any(e.name == formatted_name for e in guild.emojis):
                failed_items.append(
                    f"`{formatted_name}` (Emoji already exists)")
                continue

            ext = "gif" if animated == "a" else "png"
            url = f"https://cdn.discordapp.com/emojis/{emoji_id}.{ext}"

            res = await self._steal_emoji(
                guild=guild,
                session=session,
                url=url,
                name=formatted_name,
                author=ctx.author,  # type: ignore
            )

            if res["success"]:
                added_items.append(res["emoji"] or res["name"])
            else:
                failed_items.append(f"`{res['name']}` ({res['reason']})")

            # Update status feedback
            await progress_msg.edit(embed=make_embed(
                title=f"{EMOJIS['rounded_loading']} Transferring Assets...",
                description=(
                    f"{EMOJIS['success']} Added: `{len(added_items)}`\n"
                    f"{EMOJIS['fail']} Failed: `{len(failed_items)}`"),
                level="INFO",
            ))
            await asyncio.sleep(1.5
                                )  # Adaptive delay to respect Discord buckets

        # 6. Process Stickers
        for sticker in stickers_to_steal:
            if len(added_items) >= MAX_ITEMS:
                failed_items.append("Reached maximum batch limit (10)")
                break

            formatted_sticker_name = self._format_sticker_name(sticker.name)

            if len(guild.stickers) >= guild.sticker_limit:
                failed_items.append(
                    f"`{formatted_sticker_name}` (Server sticker capacity full)"
                )
                continue

            res = await self._steal_sticker(
                guild=guild,
                session=session,
                sticker=sticker,
                formatted_name=formatted_sticker_name,
                author=ctx.author,  # type: ignore
            )

            if res["success"]:
                added_items.append(f"Sticker: `{res['name']}`")
            else:
                failed_items.append(f"`{res['name']}` ({res['reason']})")

            await progress_msg.edit(embed=make_embed(
                title=f"{EMOJIS['rounded_loading']} Transferring Assets...",
                description=(
                    f"{EMOJIS['success']} Added: `{len(added_items)}`\n"
                    f"{EMOJIS['fail']} Failed: `{len(failed_items)}`"),
                level="INFO",
            ))
            await asyncio.sleep(2.0)

        # 7. Final Summary Embed Construction
        fields = []
        if added_items:
            fields.append((
                "Imported Assets",
                " ".join(added_items[:10]),
                False,
            ))

        if failed_items:
            fields.append((
                "Failed / Skipped",
                "\n".join(failed_items[:10]),
                False,
            ))

        summary_embed = make_embed(
            title=f"{EMOJIS['success']} Transfer Complete"
            if added_items else f"{EMOJIS['warning']} Transfer Result",
            description=
            (f"{EMOJIS['success']} Successfully Added: `{len(added_items)}` item(s)\n"
             f"{EMOJIS['fail']} Failed / Skipped: `{len(failed_items)}` item(s)"
             ),
            level="SUCCESS" if added_items else "WARNING",
            fields=fields,
            footer=f"Action by: {ctx.author}",
            footer_icon=ctx.author.display_avatar.url,
        )

        await progress_msg.edit(embed=summary_embed)
        await self._cleanup_invocation(ctx)

    async def _steal_emoji(
        self,
        guild: discord.Guild,
        session: aiohttp.ClientSession,
        url: str,
        name: str,
        author: discord.Member,
    ) -> StealResult:
        """Download asset and register custom emoji with rate-limit protection."""
        async with self._semaphore:
            retries = 3
            for attempt in range(retries):
                try:
                    async with session.get(
                            url,
                            timeout=aiohttp.ClientTimeout(total=15)) as resp:
                        if resp.status != 200:
                            return {
                                "success": False,
                                "name": name,
                                "emoji": None,
                                "reason": f"CDN HTTP {resp.status}",
                            }
                        image_data = await resp.read()

                    emoji = await guild.create_custom_emoji(
                        name=name,
                        image=image_data,
                        reason=f"Stolen/Added by {author} ({author.id})",
                    )
                    return {
                        "success": True,
                        "name": name,
                        "emoji": str(emoji),
                        "reason": None,
                    }

                except discord.HTTPException as e:
                    if e.status == 429:  # Rate limited
                        retry_after = getattr(e, "retry_after", 5.0)
                        logger.warning(
                            f"Rate limited while creating emoji '{name}'. Retrying in {retry_after}s."
                        )
                        await asyncio.sleep(retry_after + 1.0)
                        continue
                    return {
                        "success": False,
                        "name": name,
                        "emoji": None,
                        "reason": f"HTTP {e.status}",
                    }

                except asyncio.TimeoutError:
                    if attempt < retries - 1:
                        await asyncio.sleep(2.0)
                        continue
                    return {
                        "success": False,
                        "name": name,
                        "emoji": None,
                        "reason": "Download Timeout",
                    }

                except Exception as e:
                    return {
                        "success": False,
                        "name": name,
                        "emoji": None,
                        "reason": str(e)[:50],
                    }

            return {
                "success": False,
                "name": name,
                "emoji": None,
                "reason": "Max retries exceeded",
            }

    async def _steal_sticker(
        self,
        guild: discord.Guild,
        session: aiohttp.ClientSession,
        sticker: discord.StickerItem | discord.GuildSticker,
        formatted_name: str,
        author: discord.Member,
    ) -> StealResult:
        """Download asset and register custom sticker with rate-limit protection."""
        async with self._semaphore:
            retries = 3
            for attempt in range(retries):
                try:
                    async with session.get(
                            sticker.url,
                            timeout=aiohttp.ClientTimeout(total=15)) as resp:
                        if resp.status != 200:
                            return {
                                "success": False,
                                "name": formatted_name,
                                "emoji": None,
                                "reason": f"CDN HTTP {resp.status}",
                            }
                        file_data = await resp.read()

                    new_sticker = await guild.create_sticker(
                        name=formatted_name,
                        description="Imported Sticker",
                        emoji="⚡",
                        file=discord.File(
                            BytesIO(file_data),
                            filename="sticker.png",
                        ),
                        reason=f"Stolen/Added by {author} ({author.id})",
                    )

                    return {
                        "success": True,
                        "name": new_sticker.name,
                        "emoji": None,
                        "reason": None,
                    }

                except discord.HTTPException as e:
                    if e.status == 429:
                        retry_after = getattr(e, "retry_after", 5.0)
                        logger.warning(
                            f"Rate limited creating sticker '{formatted_name}'. Retrying in {retry_after}s."
                        )
                        await asyncio.sleep(retry_after + 1.0)
                        continue
                    return {
                        "success": False,
                        "name": formatted_name,
                        "emoji": None,
                        "reason": f"HTTP {e.status}",
                    }

                except Exception as e:
                    return {
                        "success": False,
                        "name": formatted_name,
                        "emoji": None,
                        "reason": str(e)[:50],
                    }

            return {
                "success": False,
                "name": formatted_name,
                "emoji": None,
                "reason": "Max retries exceeded",
            }


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(EmojiSteal(bot))
