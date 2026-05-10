from __future__ import annotations
import os
from dotenv import load_dotenv
from discord import app_commands
from discord.ext import commands
from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS
from utils.permissions.check_perms import (
    is_bot_admin,
    is_bot_admin_ctx,
)

from utils.permissions.protected_commands import (
    PROTECTED_COMMANDS,
)

from db.db_helpers.channel_command_restrict import (
    get_restricted_commands,
)

load_dotenv()

BANNER_GIF = os.getenv(
    "HELP_BANNER_GIF",
)


# Command categories
COMMAND_CATEGORIES: dict[str, str] = {
    # Moderation
    "ban": "Moderation",
    "kick": "Moderation",
    "tempban": "Moderation",
    "timeout": "Moderation",
    "purge": "Moderation",
    "lockdown": "Moderation",
    # Verification
    "verification": "Verification",
    # Roles
    "roles": "Roles",
    "adminrole": "Roles",
    # System
    "help": "System",
    "command": "System",
    # Utility
    "ping": "Utility",
    "avatar": "Utility",
    "banner": "Utility",
    "server_info": "Utility",
    "shards": "Utility",
    "afk": "Utility",
    # VC Manager
    "vc_manager": "Voice",
    "drag": "Voice",
    "moveall": "Voice",
}


# Category emojis
CATEGORY_EMOJIS = {
    "Moderation": EMOJIS["moderation"],
    "Verification": EMOJIS["okay"],
    "Roles": EMOJIS["green_dot"],
    "System": EMOJIS["developer"],
    "Utility": EMOJIS["ping"],
    "Voice": "🎧",
    "General": EMOJIS["arrow_point"],
}


class Help(
    commands.Cog,
):
    def __init__(
        self,
        bot: commands.Bot,
    ):

        self.bot = bot
        self._cache: list[dict] = []

    # Build slash command cache
    def build_cache(
        self,
    ):

        cache = []

        for cmd in self.bot.tree.walk_commands():
            if not isinstance(
                cmd,
                app_commands.Command,
            ):
                continue

            base = cmd.name.lower()

            category = COMMAND_CATEGORIES.get(
                base,
                "General",
            )

            cache.append(
                {
                    "qualified": cmd.qualified_name.lower(),
                    "base": base,
                    "description": (cmd.description or "No description"),
                    "category": category,
                }
            )

        self._cache = sorted(
            cache,
            key=lambda x: (
                x["category"],
                x["qualified"],
            ),
        )

    @commands.Cog.listener()
    async def on_ready(
        self,
    ):

        self.build_cache()

    # Help command
    @commands.hybrid_command(
        name="help",
        description="Show available bot commands",
    )
    async def help(
        self,
        ctx: commands.Context,
    ):

        # Prefix help
        if ctx.interaction is None:
            is_admin = False

            if ctx.guild:
                try:
                    is_admin = await is_bot_admin_ctx(
                        ctx,
                    )
                except Exception:
                    pass

            general_cmds = [
                f"{EMOJIS['arrow_point']} `dv help`",
                f"{EMOJIS['arrow_point']} `dv ping`",
                f"{EMOJIS['arrow_point']} `dv avatar`",
                f"{EMOJIS['arrow_point']} `dv banner`",
                f"{EMOJIS['arrow_point']} `dv afk`",
            ]

            vc_cmds = [
                "🎧 `dv drag <member> <vc>`",
                "🎧 `dv moveall <source> <target>`",
                "🎧 `/vc_manager`",
            ]

            moderation_cmds = [
                f"{EMOJIS['moderation']} `dv purge`",
                f"{EMOJIS['moderation']} `dv tempban`",
                f"{EMOJIS['moderation']} `dv timeout`",
                f"{EMOJIS['moderation']} `dv lockdown`",
            ]

            description = (
                f"{EMOJIS['green_dot']} Bot operational\n\n"
                f"{EMOJIS['developer']} General\n"
                f"{chr(10).join(general_cmds)}\n\n"
                f"🎧 Voice Controls\n"
                f"{chr(10).join(vc_cmds)}"
            )

            if is_admin:
                description += (
                    "\n\n"
                    f"{EMOJIS['moderation']} Moderation\n"
                    f"{chr(10).join(moderation_cmds)}"
                )

            description += (
                "\n\n"
                f"{EMOJIS['announcement']} "
                f"Use `/help` for the full interactive directory"
            )

            embed = make_embed(
                title="Help Center",
                description=description,
                level="INFO",
                footer="Digital Vigital • Interactive Command System",
            )

            if BANNER_GIF:
                embed.set_image(
                    url=BANNER_GIF,
                )

            await ctx.reply(
                embed=embed,
                mention_author=False,
            )

            return

        # Slash help
        interaction = ctx.interaction

        guild = interaction.guild
        channel = interaction.channel

        await interaction.response.defer(
            ephemeral=True,
        )

        is_admin = await is_bot_admin(
            interaction,
        )

        restricted: set[str] = set()

        if guild and channel:
            try:
                restricted = set(
                    await get_restricted_commands(
                        guild.id,
                        channel.id,
                    )
                )
            except Exception:
                pass

        grouped: dict[str, list[str]] = {}

        for cmd in self._cache:
            if cmd["base"] in restricted and not is_admin:
                continue

            if cmd["qualified"] in PROTECTED_COMMANDS and not is_admin:
                continue

            entry = f"`/{cmd['qualified']}`\n> {cmd['description']}"

            grouped.setdefault(
                cmd["category"],
                [],
            ).append(entry)

        fields = []

        ordered_categories = [
            "Moderation",
            "Voice",
            "Verification",
            "Roles",
            "Utility",
            "System",
            "General",
        ]

        for category in ordered_categories:
            entries = grouped.get(
                category,
            )

            if not entries:
                continue

            emoji = CATEGORY_EMOJIS.get(
                category,
                EMOJIS["arrow_point"],
            )

            fields.append(
                (
                    f"{emoji} {category}",
                    "\n\n".join(entries[:8]),
                    False,
                )
            )

        stats = (
            f"{EMOJIS['green_dot']} "
            f"Total Commands: `{len(self._cache)}`\n"
            f"🎧 Voice Commands: `3`\n"
            f"{EMOJIS['moderation']} Admin Access: "
            f"`{'Enabled' if is_admin else 'Limited'}`"
        )

        embed = make_embed(
            title="Command Directory",
            description=(
                f"{EMOJIS['developer']} "
                f"Interactive command overview\n\n"
                f"{EMOJIS['arrow_point']} "
                f"Commands are automatically filtered "
                f"by your permissions\n"
                f"{EMOJIS['arrow_point']} "
                f"Use slash command autocomplete "
                f"for better discovery\n\n"
                f"{stats}"
            ),
            level="INFO",
            fields=fields,
            footer="Digital Vigital • Structured Command Interface",
        )

        if BANNER_GIF:
            embed.set_image(
                url=BANNER_GIF,
            )

        await interaction.followup.send(
            embed=embed,
            ephemeral=True,
        )


async def setup(
    bot: commands.Bot,
):

    await bot.add_cog(
        Help(bot),
    )
