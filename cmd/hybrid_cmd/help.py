from __future__ import annotations
from discord.ext import commands
from discord import app_commands
from utils.embeds import make_embed
from utils.emojis import EMOJIS
from utils.check_perms import is_bot_admin
from utils.protected_commands import PROTECTED_COMMANDS
from db.db_helpers.channel_command_restrict import get_restricted_commands

# region COMMAND CATEGORY MAP
COMMAND_CATEGORIES: dict[str, str] = {

    # Moderation
    "tempban_role": "Moderation",
    "tempban_list": "Moderation",
    "setup_log": "Moderation",
    "reset_verification": "Moderation",

    # Verification
    "verify_setup": "Verification",

    # Channel Management
    "media_only": "Channel",
    "sticky_set": "Channel",
    "sticky_disable": "Channel",
    "sticky_status": "Channel",
    "set_counting": "Channel",
    "unset_counting": "Channel",

    # Role Management
    "roles": "Roles",
    "adminrole": "Roles",

    # System
    "command": "System",
    "help": "System",

    # Utility
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


class Help(commands.Cog):

    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self._cached_commands: list[dict] = []
        self._cache_ready = False

    # region CACHE BUILDER
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

    # region HELP COMMAND
    @commands.hybrid_command(
        name="help",
        description="Show available bot commands",
        with_app_command=True,
    )
    async def help(self, ctx: commands.Context) -> None:

        # region PREFIX HELP
        if ctx.interaction is None:

            embed = make_embed(
                title="Digital Vigital Help",
                description=
                (f"{EMOJIS['announcement']} This bot primarily uses **slash commands**.\n\n"
                 f"{EMOJIS['arrow_point']} Type `/` to explore commands.\n"
                 f"{EMOJIS['arrow_point']} Use `/help` for a full categorised list.\n\n"
                 f"{EMOJIS['green_dot']} Fast • Channel-aware • Modern"),
                level="INFO",
                footer="Digital Vigital • Slash-first architecture",
            )

            await ctx.reply(embed=embed, mention_author=False)
            return

        # region SLASH HELP
        interaction = ctx.interaction
        guild = interaction.guild
        channel = interaction.channel
        is_admin = is_bot_admin(interaction)

        await interaction.response.defer(ephemeral=True)

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

        if not grouped:
            await interaction.followup.send(
                embed=make_embed(
                    title="Help",
                    description=
                    (f"{EMOJIS['warning']} No commands available in this channel."
                     ),
                    level="WARNING",
                ),
                ephemeral=True,
            )
            return

        fields = []

        for category, entries in sorted(grouped.items()):
            emoji = CATEGORY_EMOJIS.get(category, EMOJIS["arrow_point"])

            fields.append((
                f"{emoji} {category}",
                "\n".join(sorted(entries)),
                False,
            ))

        embed = make_embed(
            title="Available Commands",
            description=
            ("Commands you can use **in this channel**.\n"
             "Restricted and protected commands are hidden automatically.\n\n"
             f"{EMOJIS['arrow_point']} Use slash autocomplete for argument hints."
             ),
            level="INFO",
            fields=fields,
            footer="Digital Vigital • Categorised Help System",
        )

        await interaction.followup.send(embed=embed, ephemeral=True)


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(Help(bot))
