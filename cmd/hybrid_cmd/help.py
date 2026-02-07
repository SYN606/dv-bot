from discord.ext import commands

from utils.embeds import make_embed
from utils.emojis import EMOJIS
from utils.check_perms import is_bot_admin
from db.db_helpers.channel_command_restrict import is_command_disabled
from utils.protected_commands import PROTECTED_COMMANDS


class Help(commands.Cog):
    """
    Help and command discovery.

    - Prefix help provides a quick overview
    - Slash help lists available commands dynamically,
      respecting permissions and disabled commands
    """

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @commands.hybrid_command(
        name="help",
        description="Show available bot commands",
        with_app_command=True,
    )
    async def help(self, ctx: commands.Context) -> None:
        """
        dv help  → prefix help (quick overview)
        /help    → slash help (permission-aware)
        """

        # ─────────────────────────────
        # PREFIX HELP (dv help)
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
        # SLASH HELP (/help)
        # ─────────────────────────────
        interaction = ctx.interaction
        guild = interaction.guild
        is_admin = is_bot_admin(interaction)

        # Acknowledge interaction early
        await interaction.response.defer(ephemeral=True)

        command_groups: dict[str, list[str]] = {}

        for command in self.bot.tree.walk_commands():
            qualified = command.qualified_name.lower()
            base_name = command.name.lower()
            description = command.description or "No description available"

            # Skip disabled commands (non-admins)
            if guild and is_command_disabled(guild.id, base_name):
                if not is_admin:
                    continue

            # Skip protected commands (non-admins)
            if qualified in PROTECTED_COMMANDS and not is_admin:
                continue

            group_name = (command.parent.name.capitalize()
                          if command.parent else "General")

            entry = f"• `/{command.qualified_name}` — {description}"
            command_groups.setdefault(group_name, []).append(entry)

        # No commands available
        if not command_groups:
            await interaction.followup.send(
                embed=make_embed(
                    title="Help",
                    description="No commands are currently available to you.",
                    level="WARNING",
                ),
                ephemeral=True,
            )
            return

        # Build embed fields
        fields = [(
            f"{EMOJIS['green_dot']} {group}",
            "\n".join(sorted(commands)),
            False,
        ) for group, commands in sorted(command_groups.items())]

        embed = make_embed(
            title="Help",
            description=
            ("Below is a list of commands you can use.\n"
             "Commands restricted by permissions are hidden automatically.\n\n"
             "**Available Commands**"),
            level="INFO",
            fields=fields,
            footer="Use slash command autocomplete for usage hints",
        )

        await interaction.followup.send(embed=embed, ephemeral=True)


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(Help(bot))
