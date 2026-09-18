from __future__ import annotations

import math
import os
import time

import discord
from discord.ext import commands

from utils.core.embeds import make_embed

# Related actions share a guild bucket across users and invocation styles.
COMMAND_POLICIES = {
    "moderation": (2, 5.0, {"ban", "unban", "kick", "timeout", "untimeout", "fakeban", "warn"}),
    "roles": (2, 5.0, {"role", "tempban", "untempban", "afk"}),
    "channels": (2, 5.0, {"lock", "unlock", "hide", "unhide", "slowmode"}),
    "nickname": (1, 5.0, {"rename"}),
    "purge": (1, 10.0, {"purge"}),
    "voice": (2, 10.0, {"drag"}),
    "bulk_voice": (1, 30.0, {"moveall"}),
    "bulk_roles": (1, 30.0, {"settag", "cleartag"}),
    "expressions": (1, 30.0, {"steal"}),
    "configuration": (2, 10.0, {"sticky", "verification", "setup_log", "vcrole", "media_only"}),
}


class GlobalCooldownManager:
    """Shared prefix/slash throttling, including administrators and bot admins.

    Application throttles supplement discord.py's HTTP rate-limit handling.
    Explicit keys and a single clock keep both invocation styles consistent.
    """

    def __init__(self, rate: int | None = None, per: float | None = None):
        self.rate = int(os.getenv("GLOBAL_COOLDOWN_RATE", "1")) if rate is None else rate
        self.per = float(os.getenv("GLOBAL_COOLDOWN_PER", "2.0")) if per is None else per
        if self.rate < 1 or int(self.rate) != self.rate or not math.isfinite(self.per) or self.per <= 0:
            raise ValueError("Cooldown rate must be a positive integer and period must be finite and positive")
        self._mapping = self._new_mapping(self.rate, self.per)
        self._notices = self._new_mapping(1, 5.0)
        self._policies = {
            name: self._new_mapping(rate, per)
            for name, (rate, per, _) in COMMAND_POLICIES.items()
        }
        self._command_policy = {
            command: name
            for name, (_, _, names) in COMMAND_POLICIES.items()
            for command in names
        }

    @staticmethod
    def _new_mapping(rate: int, per: float) -> commands.CooldownMapping:
        return commands.CooldownMapping.from_cooldown(rate, per, lambda key: key)

    def retry_after(self, user_id: int, guild_id: int | None, command_name: str) -> float:
        """Inspect all applicable buckets before consuming tokens, without yielding."""
        now = time.monotonic()
        buckets = [self._mapping.get_bucket(user_id, now)]
        root = command_name.lower().split(" ", 1)[0]
        policy = self._command_policy.get(root)
        if guild_id is not None and policy is not None:
            buckets.append(self._policies[policy].get_bucket(guild_id, now))
        retry = max(bucket.get_retry_after(now) for bucket in buckets if bucket is not None)
        if retry > 0:
            return retry
        for bucket in buckets:
            if bucket is not None:
                bucket.update_rate_limit(now)
        return 0.0

    @staticmethod
    def _embed(retry_after: float) -> discord.Embed:
        return make_embed(
            title="Command Cooldown",
            description=f"Please wait `{retry_after:.1f}s` before trying again.",
            level="WARNING",
        )

    async def check_interaction(self, interaction: discord.Interaction) -> bool:
        # Autocomplete runs the tree check too; do not consume command tokens.
        if interaction.type != discord.InteractionType.application_command:
            return True
        if interaction.command is None:
            return True
        retry = self.retry_after(interaction.user.id, interaction.guild_id,
                                 interaction.command.qualified_name)
        if not retry:
            return True
        try:
            if interaction.response.is_done():
                await interaction.followup.send(embed=self._embed(retry), ephemeral=True)
            else:
                await interaction.response.send_message(embed=self._embed(retry), ephemeral=True)
        except discord.HTTPException:
            pass
        return False

    async def check_context(self, ctx: commands.Context) -> bool:
        # Called once by Bot.invoke, before checks or group dispatch.
        # Hybrid slash calls have already passed through the tree check.
        if ctx.interaction or ctx.command is None:
            return True
        retry = self.retry_after(ctx.author.id, ctx.guild.id if ctx.guild else None,
                                 ctx.command.qualified_name)
        if not retry:
            return True
        # Blocked prefix messages must not generate a response flood.
        if not self._notices.update_rate_limit(ctx.author.id, time.monotonic()):
            try:
                await ctx.reply(embed=self._embed(retry), mention_author=False)
            except discord.HTTPException:
                pass
        return False


GLOBAL_COOLDOWN = GlobalCooldownManager()
