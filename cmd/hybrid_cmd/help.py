from __future__ import annotations

import os
from dotenv import load_dotenv
from discord.ext import commands
from discord import app_commands

from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS
from utils.permissions.check_perms import is_bot_admin, is_bot_admin_ctx
from utils.permissions.protected_commands import PROTECTED_COMMANDS
from db.db_helpers.channel_command_restrict import get_restricted_commands

load_dotenv()

BANNER_GIF = os.getenv("HELP_BANNER_GIF")

# =====================================================
# CATEGORY MAP
# =====================================================
COMMAND_CATEGORIES: dict[str, str] = {
    "ban": "Moderation",
    "kick": "Moderation",
    "tempban": "Moderation",
    "verification": "Verification",
    "roles": "Roles",
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


# =====================================================
# COG
# =====================================================
class Help(commands.Cog):

    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self._cache: list[dict] = []

    # =====================================================
    # BUILD CACHE (ON READY)
    # =====================================================
    def build_cache(self):

        cache = []

        for cmd in self.bot.tree.walk_commands():

            if not isinstance(cmd, app_commands.Command):
                continue

            base = cmd.name.lower()
            category = COMMAND_CATEGORIES.get(base, "General")

            cache.append({
                "qualified": cmd.qualified_name.lower(),
                "base": base,
                "description": cmd.description or "No description",
                "category": category,
            })

        self._cache = cache

    @commands.Cog.listener()
    async def on_ready(self):
        self.build_cache()

    # =====================================================
    # HELP COMMAND
    # =====================================================
    @commands.hybrid_command(
        name="help",
        description="Show available bot commands",
    )
    async def help(self, ctx: commands.Context):

        # =====================================================
        # PREFIX MODE
        # =====================================================
        if ctx.interaction is None:

            is_admin = False
            if ctx.guild:
                try:
                    is_admin = await is_bot_admin_ctx(ctx)
                except Exception:
                    pass

            base = [
                f"{EMOJIS['arrow_point']} `dv afk`",
                f"{EMOJIS['arrow_point']} `dv ping`",
                f"{EMOJIS['arrow_point']} `dv avatar`",
                f"{EMOJIS['arrow_point']} `dv banner`",
            ]

            admin = [
                f"{EMOJIS['moderation']} `dv purge`",
                f"{EMOJIS['moderation']} `dv tempban`",
                f"{EMOJIS['moderation']} `dv untempban`",
            ]

            desc = (
                f"{EMOJIS['green_dot']} System active\n\n"
                f"{EMOJIS['announcement']} Use `/help` for full command list\n\n"
                f"{EMOJIS['developer']} Prefix Commands\n" + "\n".join(base))

            if is_admin:
                desc += "\n\n" + "\n".join(admin)

            embed = make_embed(
                title="Help Center",
                description=desc,
                level="INFO",
                footer="Digital Vigital • Core Interface",
            )

            if BANNER_GIF:
                embed.set_image(url=BANNER_GIF)

            await ctx.reply(embed=embed, mention_author=False)
            return

        # =====================================================
        # SLASH MODE
        # =====================================================
        interaction = ctx.interaction
        guild = interaction.guild
        channel = interaction.channel

        await interaction.response.defer(ephemeral=True)

        is_admin = await is_bot_admin(interaction)

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

        for cmd in self._cache:

            if cmd["base"] in restricted and not is_admin:
                continue

            if cmd["qualified"] in PROTECTED_COMMANDS and not is_admin:
                continue

            entry = (f"{EMOJIS['arrow_point']} `/{cmd['qualified']}`\n"
                     f"{cmd['description']}")

            grouped.setdefault(cmd["category"], []).append(entry)

        # =====================================================
        # BUILD FIELDS
        # =====================================================
        fields = []

        for category, entries in sorted(grouped.items()):

            emoji = CATEGORY_EMOJIS.get(category, EMOJIS["arrow_point"])

            fields.append((
                f"{emoji} {category}",
                "\n\n".join(entries[:10]),  # limit spam
                True,
            ))

        # prefix section
        prefix_section = [
            f"{EMOJIS['arrow_point']} `dv afk`",
            f"{EMOJIS['arrow_point']} `dv ping`",
        ]

        if is_admin:
            prefix_section.append(f"{EMOJIS['moderation']} `dv purge`")

        fields.append((
            f"{EMOJIS['developer']} Prefix",
            "\n".join(prefix_section),
            True,
        ))

        if len(fields) % 2 != 0:
            fields.append(("\u200b", "\u200b", True))

        # =====================================================
        # FINAL EMBED
        # =====================================================
        embed = make_embed(
            title="Command Directory",
            description=(
                f"{EMOJIS['green_dot']} System operational\n\n"
                f"{EMOJIS['arrow_point']} Commands filtered by permissions\n"
                f"{EMOJIS['arrow_point']} Use `/` to explore"),
            level="INFO",
            fields=fields,
            footer="Digital Vigital • Structured Interface",
        )

        if BANNER_GIF:
            embed.set_image(url=BANNER_GIF)

        await interaction.followup.send(embed=embed, ephemeral=True)


# =====================================================
# SETUP
# =====================================================
async def setup(bot: commands.Bot):
    await bot.add_cog(Help(bot))
