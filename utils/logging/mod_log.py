import asyncio
import discord
from typing import Optional, Dict, Any

from sqlalchemy import select

from db.engine import AsyncSessionLocal
from db.models import ModerationLogConfig
from utils.core.embeds import make_embed

# Cache: guild_id -> channel_id
_log_cache: dict[int, int] = {}

# Anti-spam tracker (guild_id -> last send time)
_last_log_time: dict[int, float] = {}


# ─────────────────────────
# MAIN LOGGER
# ─────────────────────────
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
        # =====================================================
        # GET CHANNEL (with cache + fallback)
        # =====================================================
        channel_id: Optional[int] = _log_cache.get(guild.id)

        if channel_id is None:
            async with AsyncSessionLocal() as session:
                result = await session.execute(
                    select(ModerationLogConfig).where(
                        ModerationLogConfig.guild_id == guild.id))
                row = result.scalar_one_or_none()

            if not row:
                return

            channel_id = row.channel_id
            _log_cache[guild.id] = channel_id

        # Try cache first
        channel = guild.get_channel(channel_id)

        # Fallback if not cached
        if channel is None:
            try:
                channel = await guild.fetch_channel(channel_id)
            except discord.NotFound:
                _log_cache.pop(guild.id, None)
                return
            except discord.Forbidden:
                return

        if not isinstance(channel, discord.TextChannel):
            return

        # =====================================================
        # PERMISSION CHECK
        # =====================================================
        perms = channel.permissions_for(guild.me)
        if not perms.send_messages or not perms.embed_links:
            return

        # =====================================================
        # ANTI-SPAM (lightweight)
        # =====================================================
        now = asyncio.get_event_loop().time()
        last = _last_log_time.get(guild.id, 0)

        if now - last < 0.3:  # 300ms cooldown
            await asyncio.sleep(0.3)

        _last_log_time[guild.id] = now

        # =====================================================
        # BUILD EMBED
        # =====================================================
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

        # Optional: timestamp
        embed.timestamp = discord.utils.utcnow()

        # =====================================================
        # SEND
        # =====================================================
        await channel.send(
            embed=embed,
            allowed_mentions=discord.AllowedMentions.none(),
        )

    except (discord.Forbidden, discord.NotFound):
        return

    except Exception as e:
        # 🔥 IMPORTANT: log actual error (don’t swallow)
        print(f"[MOD LOG ERROR] {e}")
