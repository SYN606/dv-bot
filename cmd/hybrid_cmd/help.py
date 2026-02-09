from discord.ext import commands

from utils.embeds import make_embed
from utils.emojis import EMOJIS
from utils.check_perms import is_bot_admin
from utils.protected_commands import PROTECTED_COMMANDS
from db.db_helpers.channel_command_restrict import get_restricted_commands


class Help(commands.Cog):
    """
    v2 Help Command

    - Prefix help: quick overview
    - Slash help: cached, permission-aware, FAST
    - Channel-based command restriction aware
    """

    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self._cached_commands: list[dict] = []
        self._cache_ready = False

    # ─────────────────────────────
    # CACHE BUILDER (RUNS ONCE)
    # ─────────────────────────────
    def _build_cache(self) -> None:
        if self._cache_ready:
            return

        cache: list[dict] = []

        for cmd in self.bot.tree.walk_commands():
            cache.append({
                "qualified":
                cmd.qualified_name.lower(),
                "base":
                cmd.name.lower(),
                "description":
                cmd.description or "No description available",
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
        """
        dv help → prefix help
        /help   → slash help (fast, cached)
        """

        # ─────────────────────────────
        # PREFIX HELP
        # ─────────────────────────────
        if ctx.interaction is None:
            embed = make_embed(
                title="Help",
                description=(
                    "This bot primarily uses **slash commands (`/`)**.\n"
                    "Prefix commands are available for quick actions.\n\n"
                    "**Quick Commands**\n"
                    f"{EMOJIS['ping']} `/ping` or `dv ping`\n"
                    f"{EMOJIS['okay']} `dv afk [reason]`\n"
                    f"{EMOJIS['enjoy']} `dv avatar [user]`\n"
                    f"{EMOJIS['announcement']} `/help` or `dv help`\n\n"
                    "Tip: Type **`/`** to explore all available commands."),
                level="INFO",
                footer="Digital Vigital • Slash-first bot",
            )

            await ctx.reply(embed=embed, mention_author=False)
            return

        # ─────────────────────────────
        # SLASH HELP
        # ─────────────────────────────
        interaction = ctx.interaction
        guild = interaction.guild
        channel = interaction.channel
        is_admin = is_bot_admin(interaction)

        await interaction.response.defer(ephemeral=True)

        self._build_cache()

        # Channel-based restrictions
        restricted: set[str] = set()
        if guild and channel:
            restricted = set(get_restricted_commands(
                guild.id,
                channel.id,
            ))

        command_groups: dict[str, list[str]] = {}

        for cmd in self._cached_commands:
            base = cmd["base"]
            qualified = cmd["qualified"]

            # Channel-restricted commands (non-admins)
            if base in restricted and not is_admin:
                continue

            # Protected commands (non-admins)
            if qualified in PROTECTED_COMMANDS and not is_admin:
                continue

            entry = f"• `/{qualified}` — {cmd['description']}"
            command_groups.setdefault(cmd["group"], []).append(entry)

        if not command_groups:
            await interaction.followup.send(
                embed=make_embed(
                    title="Help",
                    description=
                    (f"{EMOJIS['warning']} No commands are available in this channel."
                     ),
                    level="WARNING",
                ),
                ephemeral=True,
            )
            return

        fields = [(
            f"{EMOJIS['green_dot']} {group}",
            "\n".join(sorted(entries)),
            False,
        ) for group, entries in sorted(command_groups.items())]

        embed = make_embed(
            title="Help",
            description=
            ("Below is a list of commands you can use **in this channel**.\n"
             "Commands restricted by channel or permissions are hidden automatically.\n\n"
             "**Available Commands**"),
            level="INFO",
            fields=fields,
            footer="Use slash command autocomplete for usage hints",
        )

        await interaction.followup.send(embed=embed, ephemeral=True)


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(Help(bot))
