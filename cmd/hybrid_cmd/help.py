from __future__ import annotations

import os
import discord
from dotenv import load_dotenv
from discord.ext import commands
from discord import app_commands

from utils.embeds import make_embed
from utils.emojis import EMOJIS
from utils.check_perms import is_bot_admin
from utils.protected_commands import PROTECTED_COMMANDS
from db.db_helpers.channel_command_restrict import get_restricted_commands

load_dotenv()

BANNER_GIF = os.getenv("HELP_BANNER_GIF")

# ─────────────────────────────────────────────
# CATEGORY MAP
# ─────────────────────────────────────────────

COMMAND_CATEGORIES: dict[str, str] = {
    "tempban_role": "Moderation",
    "tempban_list": "Moderation",
    "setup_log": "Moderation",
    "reset_verification": "Moderation",
    "verify_setup": "Verification",
    "media_only": "Channel",
    "sticky_set": "Channel",
    "sticky_disable": "Channel",
    "sticky_status": "Channel",
    "set_counting": "Channel",
    "unset_counting": "Channel",
    "roles": "Roles",
    "adminrole": "Roles",
    "command": "System",
    "help": "System",
    "weather": "Utility",
}

CATEGORY_EMOJIS = {
    "Moderation": EMOJIS["moderation"],
    "Verification": EMOJIS["okay"],
    "Channel": EMOJIS["announcement"],
    "Roles": EMOJIS["green_dot"],
    "System": EMOJIS["developer"],
    "Utility": EMOJIS["ping"],
    "General": EMOJIS["arrow_point"],
}

# ─────────────────────────────────────────────
# HELP COG
# ─────────────────────────────────────────────


class Help(commands.Cog):

    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self._cached_commands: list[dict] = []
        self._cache_ready = False

    # ─────────────────────────
    # CACHE BUILDER
    # ─────────────────────────

    def _build_cache(self) -> None:
        cache: list[dict] = []

        for cmd in self.bot.tree.walk_commands():
            if not isinstance(cmd, app_commands.Command):
                continue

            base = cmd.name.lower()
            category = COMMAND_CATEGORIES.get(base, "General")

            cache.append({
                "qualified": cmd.qualified_name.lower(),
                "base": base,
                "description": cmd.description or "No description provided",
                "category": category,
            })

        self._cached_commands = cache
        self._cache_ready = True

    # ─────────────────────────
    # HELP COMMAND
    # ─────────────────────────

    @commands.hybrid_command(
        name="help",
        description="Show available bot commands",
        with_app_command=True,
    )
    async def help(self, ctx: commands.Context) -> None:

        # ─────────────────────────
        # PREFIX MODE
        # ─────────────────────────

        if ctx.interaction is None:

            is_admin = False
            if ctx.guild:
                try:
                    is_admin = await is_bot_admin(ctx)
                except Exception:
                    pass

            general_prefix = [
                f"{EMOJIS['arrow_point']} `dv afk` — Set AFK status",
                f"{EMOJIS['arrow_point']} `dv avatar` — Show user avatar",
                f"{EMOJIS['arrow_point']} `dv banner` — Show user banner",
                f"{EMOJIS['arrow_point']} `dv ping` — Show latency",
            ]

            admin_prefix = [
                f"{EMOJIS['moderation']} `dv purge` — Delete messages",
                f"{EMOJIS['moderation']} `dv tempban` — Apply tempban",
                f"{EMOJIS['moderation']} `dv untempban` — Remove tempban",
                f"{EMOJIS['moderation']} `dv steal` — Steal emoji",
            ]

            description = (
                f"{EMOJIS['green_dot']} Bot operational\n\n"
                f"{EMOJIS['announcement']} Slash Commands → type `/`\n"
                f"{EMOJIS['arrow_point']} Use `/help` for categorised view\n\n"
                f"{EMOJIS['developer']} Prefix Commands\n" +
                "\n".join(general_prefix))

            if is_admin:
                description += "\n\n" + "\n".join(admin_prefix)

            embed = make_embed(
                title="Help Center",
                description=description,
                level="INFO",
                footer="Modern Async Architecture",
            )

            if BANNER_GIF:
                embed.set_image(url=BANNER_GIF)

            await ctx.reply(embed=embed, mention_author=False)
            return

        # ─────────────────────────
        # SLASH MODE
        # ─────────────────────────

        interaction = ctx.interaction
        guild = interaction.guild
        channel = interaction.channel

        await interaction.response.defer(ephemeral=True)

        is_admin = await is_bot_admin(interaction)

        if not self._cache_ready:
            self._build_cache()

        restricted: set[str] = set()

        if guild and channel:
            try:
                restricted = set(await get_restricted_commands(
                    guild.id,
                    channel.id,
                ))
            except Exception:
                pass

        grouped: dict[str, list[str]] = {}

        for cmd in self._cached_commands:

            if cmd["base"] in restricted and not is_admin:
                continue

            if cmd["qualified"] in PROTECTED_COMMANDS and not is_admin:
                continue

            entry = (f"{EMOJIS['arrow_point']} "
                     f"`/{cmd['qualified']}` — {cmd['description']}")

            grouped.setdefault(cmd["category"], []).append(entry)

        # ─────────────────────────
        # PREFIX SECTION
        # ─────────────────────────

        prefix_commands = [
            f"{EMOJIS['arrow_point']} `dv afk`",
            f"{EMOJIS['arrow_point']} `dv avatar`",
            f"{EMOJIS['arrow_point']} `dv banner`",
            f"{EMOJIS['arrow_point']} `dv ping`",
        ]

        if is_admin:
            prefix_commands.extend([
                f"{EMOJIS['moderation']} `dv purge`",
                f"{EMOJIS['moderation']} `dv tempban`",
                f"{EMOJIS['moderation']} `dv untempban`",
                f"{EMOJIS['moderation']} `dv steal`",
            ])

        # ─────────────────────────
        # BUILD COLUMN FIELDS
        # ─────────────────────────

        fields: list[tuple[str, str, bool]] = []

        for category, entries in sorted(grouped.items()):
            emoji = CATEGORY_EMOJIS.get(category, EMOJIS["arrow_point"])

            fields.append((
                f"{emoji} {category}",
                "\n".join(sorted(entries)),
                True,  # column layout
            ))

        fields.append((
            f"{EMOJIS['developer']} Prefix",
            "\n".join(prefix_commands),
            True,
        ))

        # Maintain 2-column symmetry
        if len(fields) % 2 != 0:
            fields.append(("\u200b", "\u200b", True))

        embed = make_embed(
            title="Command Directory",
            description=
            ("Commands available in this channel.\n\n"
             f"{EMOJIS['green_dot']} Restricted commands hidden automatically\n"
             f"{EMOJIS['moderation']} Admin commands filtered by permission\n"
             f"{EMOJIS['arrow_point']} Use autocomplete for arguments"),
            level="INFO",
            fields=fields,
            footer="Categorised Help System",
        )

        if BANNER_GIF:
            embed.set_image(url=BANNER_GIF)

        await interaction.followup.send(embed=embed, ephemeral=True)


# COG SETUP


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(Help(bot))
