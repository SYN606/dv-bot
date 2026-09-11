from __future__ import annotations

import os
import time
from typing import Optional, Union

import discord
from discord.ext import commands

from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS
from utils.permissions.check_perms import is_bot_admin, is_bot_admin_ctx

# Configurable cooldown parameters: default 1 command per 2.0 seconds per user
DEFAULT_COOLDOWN_RATE = int(os.getenv("GLOBAL_COOLDOWN_RATE", "1"))
DEFAULT_COOLDOWN_PER = float(os.getenv("GLOBAL_COOLDOWN_PER", "2.0"))


class GlobalCooldownManager:
    """
    Centralized manager tracking global command execution velocity.
    Supports both Discord Slash Interactions and Prefix Contexts.
    Exempts Server Owners, Administrators, and configured Bot Admins.
    """

    def __init__(self, rate: int = DEFAULT_COOLDOWN_RATE, per: float = DEFAULT_COOLDOWN_PER):
        self.rate = rate
        self.per = per
        self._mapping = commands.CooldownMapping.from_cooldown(
            self.rate, self.per, commands.BucketType.user
        )
        self._last_prune = time.monotonic()

    def _maybe_prune(self) -> None:
        """Periodically prune stale cooldown buckets to prevent memory leaks."""
        now = time.monotonic()
        if now - self._last_prune > 300.0:  # Every 5 minutes
            self._last_prune = now
            current_buckets = list(self._mapping._cache.keys())
            for key in current_buckets:
                bucket = self._mapping._cache.get(key)
                if bucket and bucket.get_retry_after(now) <= 0:
                    self._mapping._cache.pop(key, None)

    async def is_exempt(
        self,
        user: Union[discord.Member, discord.User],
        guild: Optional[discord.Guild],
        interaction_or_ctx: Union[discord.Interaction, commands.Context],
    ) -> bool:
        """Determines if the invoking user is exempt from global command cooldowns."""
        if not guild or not isinstance(user, discord.Member):
            return False

        # Server Owner and Administrators always bypass
        if user.id == guild.owner_id or user.guild_permissions.administrator:
            return True

        # Custom Bot Admin Role bypass
        if isinstance(interaction_or_ctx, discord.Interaction):
            return await is_bot_admin(interaction_or_ctx)
        return await is_bot_admin_ctx(interaction_or_ctx)

    async def check_interaction(self, interaction: discord.Interaction) -> bool:
        """
        Validates cooldown for slash / application command interactions.
        Returns True if allowed to proceed, False if cooldown enforced.
        """
        if not interaction.guild or not interaction.user:
            return True

        if await self.is_exempt(interaction.user, interaction.guild, interaction):
            return True

        self._maybe_prune()

        bucket = self._mapping.get_bucket(interaction)  # type: ignore
        assert bucket is not None
        retry_after = bucket.update_rate_limit()

        if retry_after:
            embed = make_embed(
                title="Command Cooldown",
                description=(
                    f"{EMOJIS.get('warning', '⚠️')} Slow down! You are using commands too fast.\n\n"
                    f"{EMOJIS.get('arrow_point', '▶')} Try again in `{retry_after:.1f}s`."
                ),
                level="WARNING",
            )
            try:
                if interaction.response.is_done():
                    await interaction.followup.send(embed=embed, ephemeral=True)
                else:
                    await interaction.response.send_message(embed=embed, ephemeral=True)
            except discord.HTTPException:
                pass
            return False

        return True

    async def check_context(self, ctx: commands.Context) -> bool:
        """
        Validates cooldown for prefix / hybrid command contexts.
        Returns True if allowed to proceed, False if cooldown enforced.
        """
        if not ctx.guild or not ctx.author:
            return True

        if await self.is_exempt(ctx.author, ctx.guild, ctx):
            return True

        self._maybe_prune()

        bucket = self._mapping.get_bucket(ctx.message)
        assert bucket is not None
        retry_after = bucket.update_rate_limit()

        if retry_after:
            embed = make_embed(
                title="Command Cooldown",
                description=(
                    f"{EMOJIS.get('warning', '⚠️')} Slow down! You are using commands too fast.\n\n"
                    f"{EMOJIS.get('arrow_point', '▶')} Try again in `{retry_after:.1f}s`."
                ),
                level="WARNING",
            )
            try:
                await ctx.reply(
                    embed=embed,
                    mention_author=False,
                    delete_after=min(retry_after + 2.0, 6.0),
                )
            except (discord.HTTPException, discord.NotFound):
                pass
            return False

        return True


# Global singleton instance
GLOBAL_COOLDOWN = GlobalCooldownManager()
