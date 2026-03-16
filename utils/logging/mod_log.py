import asyncio
import discord
from typing import Optional, Dict, Any

from sqlalchemy import select

from db.engine import AsyncSessionLocal
from db.models import ModerationLogConfig
from utils.core.embeds import make_embed


_log_cache: dict[int, int] = {}


async def send_mod_log(
    *,
    guild: discord.Guild,
    category: str,
    title: str,
    description: str,
    level: str = "INFO",
    actor: Optional[discord.abc.User] = None,
    target: Optional[discord.abc.User] = None,
    extra_fields: Optional[Dict[str, Any]] = None,
) -> None:

    try:

        # ─────────────────────────
        # GET CHANNEL (cached)
        # ─────────────────────────
        if guild.id in _log_cache:
            channel_id = _log_cache[guild.id]

        else:
            async with AsyncSessionLocal() as session:

                result = await session.execute(
                    select(ModerationLogConfig).where(
                        ModerationLogConfig.guild_id == guild.id
                    )
                )

                row = result.scalar_one_or_none()

            if not row:
                return

            channel_id = row.channel_id
            _log_cache[guild.id] = channel_id

        channel = guild.get_channel(channel_id)

        if not isinstance(channel, discord.TextChannel):
            return

        # ─────────────────────────
        # BUILD EMBED
        # ─────────────────────────

        fields = []

        if actor:
            fields.append(("Actor", actor.mention, True))

        if target:
            fields.append(("Target", target.mention, True))

        if extra_fields:
            for name, value in extra_fields.items():
                if value is None:
                    continue
                fields.append((str(name), str(value), False))

        embed = make_embed(
            title=title,
            description=description,
            level=level,
            fields=fields if fields else None,
            footer=f"Guild ID: {guild.id}",
        )

        # prevent burst spam
        await asyncio.sleep(0.15)

        await channel.send(
            embed=embed,
            allowed_mentions=discord.AllowedMentions.none(),
        )

    except (discord.Forbidden, discord.NotFound):
        return
    except Exception:
        return