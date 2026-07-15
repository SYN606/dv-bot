from __future__ import annotations

import os
import json
import time
import random
import logging
from typing import Optional

import discord
from discord.ext import commands

logger = logging.getLogger("DigitalVigital")

USER_STATE: dict[int, dict] = {}
CONFIG_PATH = os.path.join("db", "static_db", "roasts.json")


class Fuck(commands.Cog):

    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self._config: dict = {}
        self._last_config_load: float = 0.0
        self._global_cooldown = commands.CooldownMapping.from_cooldown(
            1, 3.0, commands.BucketType.guild)
        self.load_config(force=True)

    def load_config(self, force: bool = False) -> None:
        """
        Loads the config from disk.
        Prevents high disk I/O by caching the config for 60 seconds unless forced.
        """
        if not force and time.time() - self._last_config_load < 60.0:
            return

        try:
            if os.path.exists(CONFIG_PATH):
                with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                    self._config = json.load(f)
                self._last_config_load = time.time()
            else:
                logger.error(
                    f"[SAVAGE] Unified database config missing at: {CONFIG_PATH}"
                )
                self._config = {}
        except json.JSONDecodeError as e:
            logger.error(f"[SAVAGE] Invalid JSON format in config: {e}")
        except Exception as e:
            logger.error(f"[SAVAGE] Error reading config layout: {e}")

    def _get_sys_msg(self, key: str, default: str) -> str:
        return self._config.get("system_responses", {}).get(key, default)

    def _get_power(self, member: discord.Member) -> int:
        weights = self._config.get("power_weights", {})
        power = 0

        if member.id == member.guild.owner_id:
            power += weights.get("is_owner", 10000)

        perms = member.guild_permissions
        for perm_name, weight in weights.items():
            if hasattr(perms, perm_name) and getattr(perms, perm_name):
                power += weight

        if member.top_role:
            power += member.top_role.position * weights.get(
                "role_multiplier", 2)

        if member.premium_since:
            power += weights.get("booster_bonus", 15)

        return power

    def _update_state(self, user_id: int, target_id: int) -> dict:
        """Updates user state and occasionally cleans up stale memory."""
        now = time.time()

        # Memory Leak Prevention: 5% chance to trigger cleanup of inactive users (older than 1 hour)
        if random.random() < 0.05:
            stale_keys = [
                k for k, v in USER_STATE.items()
                if now - v.get("last_used", 0) > 3600
            ]
            for k in stale_keys:
                USER_STATE.pop(k, None)

        state = USER_STATE.setdefault(
            user_id, {
                "count": 0,
                "combo": 0,
                "toxicity": 0,
                "last_target": None,
                "last_used": 0,
                "reverse_hits": 0,
                "fatal_hits": 0
            })

        # Reset combo if it's been more than 20 seconds
        state["combo"] = state["combo"] + 1 if now - state[
            "last_used"] < 20 else 0

        # Increase toxicity if targeting the same person, decrease if changing targets
        state["toxicity"] = state["toxicity"] + 1 if state[
            "last_target"] == target_id else max(0, state["toxicity"] - 1)

        state["count"] += 1
        state["last_target"] = target_id
        state["last_used"] = now

        return state

    def _pick_style(self, state: dict) -> str:
        thresholds = self._config.get("style_thresholds", {})
        if (state["toxicity"] >= thresholds.get("dark_toxicity", 7)
                or state["count"] >= thresholds.get("dark_count", 12)):
            return "dark"
        if state["count"] >= thresholds.get("sarcastic_count", 5):
            return "sarcastic"
        return "normal"

    async def _analyze_user(self, ctx: commands.Context,
                            target: discord.Member | discord.User) -> str:
        messages = []
        try:
            # Wrap in try/except in case bot lacks read_message_history permission
            async for msg in ctx.channel.history(limit=60):
                if msg.author.id != target.id or not msg.content:
                    continue
                messages.append(msg.content.lower())
                if len(messages) >= 15:
                    break
        except discord.Forbidden:
            logger.warning(
                f"Missing history read permissions in channel {ctx.channel.id}"
            )
            return "default"
        except discord.HTTPException:
            return "default"

        if not messages:
            return "default"

        text = " ".join(messages)
        words = text.split()
        unique_words = len(set(words))
        profiles = self._config.get("analysis_profiles", {})

        # Profile evaluations with safe dict `.get()` chains
        if "dry" in profiles and len(text) < profiles["dry"].get(
                "max_chars", 25):
            return "dry"

        if "repetitive" in profiles and (len(words) / max(
                unique_words, 1)) > profiles["repetitive"].get(
                    "ratio_threshold", 2.7):
            return "repetitive"

        if text.isupper():
            return "aggressive"

        for profile_name, profile_data in profiles.items():
            keywords = profile_data.get("keywords", [])
            if keywords and any(w in text for w in keywords):
                return profile_name

        if "confused" in profiles and text.count(
                "?") >= profiles["confused"].get("min_questions", 5):
            return "confused"

        if "overthink" in profiles and len(text) > profiles["overthink"].get(
                "min_chars", 350):
            return "overthink"

        return "default"

    def _weighted_choice(self, items: list | dict) -> str:
        if not items:
            return ""
        if isinstance(items, list):
            return random.choice(items)

        try:
            expanded = [
                key for key, weight in items.items()
                for _ in range(int(weight))
            ]
            return random.choice(expanded) if expanded else ""
        except (ValueError, TypeError):
            return ""

    def _build_roast(self, level: int, context: str, style: str) -> str:
        pool = self._config.get("roasts_pool", {})

        # Provide strict hardcoded fallbacks so the bot never sends empty messages if config breaks
        openings = list(pool.get("openings", ["Bhai sun,"]))
        base_pool = list(
            pool.get(context,
                     pool.get("default", ["System level clown hai tu."])))

        modifiers = self._config.get("style_modifiers", {})
        if style in modifiers:
            base_pool.extend(modifiers[style])

        kill_key = "kill_high" if level >= 7 else (
            "kill_mid" if level >= 3 else "kill_low")
        kill_pool = pool.get(kill_key, ["Chup kar ja ab."])

        # Fatal hit logic
        if random.random() < 0.02 and pool.get("fatal"):
            return self._weighted_choice(pool["fatal"])

        parts = [
            self._weighted_choice(openings),
            self._weighted_choice(base_pool),
            self._weighted_choice(kill_pool)
        ]

        # Remove empty parts and filter out None
        parts = [p.strip() for p in parts if p]

        # 25% chance to drop a random segment to make roasts feel less formulaic
        if len(parts) > 1 and random.random() < 0.25:
            parts.pop(random.randrange(len(parts)))

        return " ".join(parts)

    async def _get_target(self,
                          ctx: commands.Context,
                          member: Optional[discord.Member] = None
                          ) -> discord.Member | discord.User:
        if member:
            return member
        if ctx.message.reference:
            try:
                replied = await ctx.channel.fetch_message(
                    ctx.message.reference.message_id)  # type: ignore
                if isinstance(replied.author, (discord.Member, discord.User)):
                    return replied.author
            except (discord.NotFound, discord.HTTPException):
                pass
        return ctx.author

    @commands.command(name="fuck",
                      aliases=["roast", "cook", "destroy"],
                      help="Generate an automated dynamic insult combo.")
    @commands.guild_only()
    @commands.bot_has_permissions(send_messages=True)
    async def fuck(self,
                   ctx: commands.Context,
                   member: Optional[discord.Member] = None):
        if not ctx.guild:
            return

        # Attempt deletion silently
        if ctx.channel.permissions_for(ctx.guild.me).manage_messages:
            try:
                await ctx.message.delete()
            except discord.HTTPException:
                pass

        # Cooldown management
        bucket = self._global_cooldown.get_bucket(ctx.message)
        retry_after = bucket.update_rate_limit() if bucket else None
        if retry_after:
            cooldown_fmt = self._get_sys_msg(
                "cooldown_msg", "cooldown active • `{remaining:.1f}s`")
            try:
                return await ctx.channel.send(
                    cooldown_fmt.format(remaining=retry_after),
                    delete_after=5.0)
            except discord.HTTPException:
                return

        # Load config with TTL cache logic
        self.load_config(force=False)

        author = ctx.author
        target = await self._get_target(ctx, member)
        state = self._update_state(author.id, target.id)

        # Safety: Global AllowedMentions to prevent mass ping exploits
        safe_mentions = discord.AllowedMentions(users=True,
                                                roles=False,
                                                everyone=False)

        # Fallback responses
        if target.id == author.id:
            msg = random.choice(
                self._config.get("self_roasts", [
                    self._get_sys_msg("self_fallback",
                                      "Self targeting parameters active.")
                ]))
            return await ctx.channel.send(msg, allowed_mentions=safe_mentions)

        if target.bot:
            msg = random.choice(
                self._config.get("bot_roasts", [
                    self._get_sys_msg("bot_fallback",
                                      "Automated client block detected.")
                ]))
            return await ctx.channel.send(msg, allowed_mentions=safe_mentions)

        if state["toxicity"] >= 8:
            msg = self._config.get(
                "anti_harassment",
                self._get_sys_msg("harass_fallback", "Safety parameters met."))
            return await ctx.channel.send(msg, allowed_mentions=safe_mentions)

        # Power calculations safely typed
        author_power = self._get_power(author) if isinstance(
            author, discord.Member) else 0
        target_power = self._get_power(target) if isinstance(
            target, discord.Member) else 0
        power_gap = target_power - author_power
        prefixes = self._config.get("reverse_prefixes", {})

        # Boss & Admin reversal hits
        if power_gap >= 5000:
            state["reverse_hits"] += 1
            roast_msg = prefixes.get("boss", "") + self._build_roast(
                state["count"], "default", "dark")
            return await ctx.channel.send(roast_msg,
                                          allowed_mentions=safe_mentions)

        if power_gap >= 500:
            state["reverse_hits"] += 1
            roast_msg = prefixes.get("admin", "") + self._build_roast(
                state["count"], "default", "sarcastic")
            return await ctx.channel.send(roast_msg,
                                          allowed_mentions=safe_mentions)

        if power_gap >= 80 and random.random() < 0.65:
            state["reverse_hits"] += 1
            roast_msg = prefixes.get("luck", "") + self._build_roast(
                state["count"], "default", "normal")
            return await ctx.channel.send(roast_msg,
                                          allowed_mentions=safe_mentions)

        # Context analysis & Core generation
        context = await self._analyze_user(ctx, target)
        roast_msg = self._build_roast(state["count"], context,
                                      self._pick_style(state))

        # Escalations
        escalations = self._config.get("escalations", {})
        if state["combo"] >= 5:
            roast_msg += escalations.get("combo", "")
        if state["toxicity"] >= 4:
            roast_msg += escalations.get("toxicity", "")

        # Formatting Output
        mode = random.randint(1, 7)
        templates = self._config.get("output_templates", {})
        fallback_msg = self._get_sys_msg(
            "default_fallback", "Unmatched operational sequence metric.")

        if mode == 2 and "honestly" in templates:
            final = templates["honestly"].format(roast=roast_msg)
        elif mode == 3 and "recover" in templates:
            final = templates["recover"].format(target=target.mention,
                                                roast=roast_msg)
        elif mode == 4:
            final = random.choice(
                self._config.get("one_liners", [fallback_msg]))
        elif mode == 5:
            final = roast_msg.upper()
        elif mode == 6 and "fatal" in templates:
            final = templates["fatal"].format(target=target.mention,
                                              roast=roast_msg)
        elif mode == 7 and "analysis" in templates:
            final = templates["analysis"].format(roast=roast_msg)
        else:
            final = roast_msg

        await ctx.channel.send(final, allowed_mentions=safe_mentions)


async def setup(bot: commands.Bot):
    await bot.add_cog(Fuck(bot))
