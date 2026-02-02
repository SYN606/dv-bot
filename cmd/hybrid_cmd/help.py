from discord.ext import commands

from utils.embeds import make_embed
from utils.emojis import EMOJIS
from utils.check_perms import is_bot_admin
from db.db_helpers.commands import is_command_disabled
from utils.protected_commands import PROTECTED_COMMANDS


class Help(commands.Cog):

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @commands.hybrid_command(
        name="help",
        description="Show available bot commands",
    )
    async def help(self, ctx: commands.Context):
        """
        dv help  → prefix help
        /help    → slash help (permission-aware)
        """

        # ─────────────────────────────
        # PREFIX HELP (dv help)
        # ─────────────────────────────
        if ctx.interaction is None:
            embed = make_embed(
                title="Help Menu",
                description=
                (f"{EMOJIS['announcement']} This bot primarily uses **slash commands (`/`)**.\n"
                 f"{EMOJIS['arrow_point']} Prefix commands exist for quick actions.\n\n"
                 f"{EMOJIS['green_dot']} **Quick Commands**\n"
                 f"{EMOJIS['ping']} `/ping` or `dv ping`\n"
                 f"{EMOJIS['okay']} `dv afk [reason]`\n"
                 f"{EMOJIS['enjoy']} `dv avatar [user]`\n"
                 f"{EMOJIS['announcement']} `/help` or `dv help`\n\n"
                 f"{EMOJIS['arrow_point']} Tip: Type **`/`** to explore everything."
                 ),
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

        command_groups: dict[str, list[str]] = {}

        for command in self.bot.tree.walk_commands():
            qualified = command.qualified_name.lower()
            base_name = command.name.lower()
            description = command.description or "No description available"

            # ── Disabled commands
            if guild and is_command_disabled(guild.id, base_name):
                if not is_admin:
                    continue

            # ── Protected / admin-only commands
            if qualified in PROTECTED_COMMANDS and not is_admin:
                continue

            # ── Grouping
            group = (command.parent.name.capitalize()
                     if command.parent else "General")

            entry = (
                f"{EMOJIS['arrow_point']} `/{command.qualified_name}` – {description}"
            )

            command_groups.setdefault(group, []).append(entry)

        if not command_groups:
            await interaction.response.send_message(
                embed=make_embed(
                    title="Help Menu",
                    description=f"{EMOJIS['warning']} No commands available.",
                    level="WARNING",
                ),
                ephemeral=True,
            )
            return

        fields = [(
            f"{EMOJIS['green_dot']} {group}",
            "\n".join(sorted(cmds)),
            False,
        ) for group, cmds in sorted(command_groups.items())]

        embed = make_embed(
            title="Help Menu",
            description=
            (f"{EMOJIS['announcement']} Showing commands you can use.\n"
             f"{EMOJIS['arrow_point']} Admin-only commands are hidden automatically.\n\n"
             f"{EMOJIS['developer']} **Available Commands**"),
            level="INFO",
            fields=fields,
            footer="Use /command for autocomplete & hints",
        )

        await interaction.response.send_message(embed=embed, ephemeral=True)


async def setup(bot: commands.Bot):
    await bot.add_cog(Help(bot))
