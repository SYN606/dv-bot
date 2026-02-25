from discord.ext import commands
from utils.embeds import make_embed
from utils.emojis import EMOJIS
from utils.check_perms import is_bot_admin
from utils.protected_commands import PROTECTED_COMMANDS
from db.db_helpers.channel_command_restrict import get_restricted_commands


class Help(commands.Cog):
    """
    v3 Intelligent Help System

    - Slash-first design
    - Channel restriction aware
    - Permission aware
    - Cached command tree
    - Clean grouped layout
    """

    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self._cached_commands: list[dict] = []
        self._cache_ready = False

    # ─────────────────────────────
    # CACHE BUILDER
    # ─────────────────────────────
    def _build_cache(self) -> None:
        cache: list[dict] = []

        for cmd in self.bot.tree.walk_commands():
            if cmd.hidden:
                continue

            cache.append({
                "qualified":
                cmd.qualified_name.lower(),
                "base":
                cmd.name.lower(),
                "description":
                cmd.description or "No description provided",
                "group":
                cmd.parent.name.capitalize() if cmd.parent else "General",
            })

        self._cached_commands = cache
        self._cache_ready = True

    # ─────────────────────────────
    # HELP COMMAND
    # ─────────────────────────────
    @commands.hybrid_command(
        name="help",
        description="Show available bot commands",
        with_app_command=True,
    )
    async def help(self, ctx: commands.Context) -> None:

        # ─────────────────────────────
        # PREFIX HELP (quick overview)
        # ─────────────────────────────
        if ctx.interaction is None:

            embed = make_embed(
                title="Digital Vigital Help",
                description=
                (f"{EMOJIS['announcement']} This bot uses **slash commands** primarily.\n\n"
                 f"{EMOJIS['arrow_point']} Type `/` to explore all commands.\n"
                 f"{EMOJIS['arrow_point']} Use `dv help` for quick prefix support.\n\n"
                 f"{EMOJIS['green_dot']} Recommended: `/help` for full command list."
                 ),
                level="INFO",
                footer="Slash-first architecture • Fast & Modern",
            )

            await ctx.reply(embed=embed, mention_author=False)
            return

        # ─────────────────────────────
        # SLASH HELP (full system)
        # ─────────────────────────────
        interaction = ctx.interaction
        guild = interaction.guild
        channel = interaction.channel
        is_admin = is_bot_admin(interaction)

        await interaction.response.defer(ephemeral=True)

        if not self._cache_ready:
            self._build_cache()

        # ─────────────────────────────
        # Channel-based restrictions (async)
        # ─────────────────────────────
        restricted: set[str] = set()

        if guild and channel:
            restricted = set(await get_restricted_commands(
                guild.id,
                channel.id,
            ))

        # ─────────────────────────────
        # Filter & Group Commands
        # ─────────────────────────────
        grouped: dict[str, list[str]] = {}

        for cmd in self._cached_commands:
            base = cmd["base"]
            qualified = cmd["qualified"]

            # Channel restriction
            if base in restricted and not is_admin:
                continue

            # Protected commands
            if qualified in PROTECTED_COMMANDS and not is_admin:
                continue

            entry = f"• `/{qualified}` — {cmd['description']}"
            grouped.setdefault(cmd["group"], []).append(entry)

        if not grouped:
            await interaction.followup.send(
                embed=make_embed(
                    title="Help",
                    description=
                    f"{EMOJIS['warning']} No commands available in this channel.",
                    level="WARNING",
                ),
                ephemeral=True,
            )
            return

        # ─────────────────────────────
        # Build Embed Fields
        # ─────────────────────────────
        fields = []

        for group, entries in sorted(grouped.items()):
            fields.append((
                f"{EMOJIS['green_dot']} {group}",
                "\n".join(sorted(entries)),
                False,
            ))

        embed = make_embed(
            title="Available Commands",
            description=
            ("Commands you can use **in this channel**.\n"
             "Restricted or protected commands are hidden automatically.\n\n"
             f"{EMOJIS['arrow_point']} Use slash autocomplete for argument hints."
             ),
            level="INFO",
            fields=fields,
            footer="Digital Vigital • Smart help system",
        )

        await interaction.followup.send(embed=embed, ephemeral=True)


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(Help(bot))
