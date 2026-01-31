import discord
from discord.ext import commands

from utils.embeds import make_embed
from utils.check_perms import is_bot_admin
from db.db_helpers.commands import is_command_disabled


class Help(commands.Cog):

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @commands.hybrid_command(
        name="help",
        description="Show available bot commands",
    )
    async def help(self, ctx: commands.Context):
        # ── PREFIX HELP (dv help)
        if ctx.interaction is None:
            embed = make_embed(
                title="Help",
                description=(
                    "<a:anouncement:1359629824192282759>This bot primarily uses **slash commands (`/`)**.\n"
                    "Some basic commands also support the **`dv` prefix**.\n\n"
                    "**Quick Commands:**\n"
                    "`/ping` or `dv ping` – Check bot latency\n"
                    "`/afk [reason]` or `dv afk` – Mark yourself as AFK\n"
                    "`/help` or `dv help` – Show this menu\n\n"
                    "<a:arrow_point:1359629780424851567> Use **`/`** to explore all commands with autocomplete."
                ),
                level="INFO",
            )
            await ctx.reply(embed=embed, mention_author=False)
            return

        # ── SLASH HELP (/help)
        interaction = ctx.interaction
        guild = interaction.guild
        admin = is_bot_admin(interaction)

        command_groups: dict[str, list[str]] = {}

        for command in self.bot.tree.walk_commands():
            name = command.qualified_name
            base_name = command.name

            # Disabled command handling
            if guild and is_command_disabled(guild.id, base_name):
                if not admin:
                    continue

            # Admin-only heuristic
            admin_only = base_name.startswith((
                "adminrole",
                "sticky",
                "command_",
                "addrole",
                "removerole",
                "media_only",
            ))

            if admin_only and not admin:
                continue

            group = command.parent.name if command.parent else "General"  # type: ignore

            entry = (f"`/{name}` – "
                     f"{command.description or 'No description available'}")

            command_groups.setdefault(group, []).append(entry)

        fields = [(group, "\n".join(sorted(cmds)), False)
                  for group, cmds in sorted(command_groups.items())]

        embed = make_embed(
            title="Help",
            description=(
                "This bot primarily uses **slash commands (`/`)**.\n"
                "Some basic commands also support the **`dv` prefix**.\n\n"
                "**Available Commands:**"),
            level="INFO",
            fields=fields,
            footer="Tip: Type / and select a command to get autocomplete help",
        )

        await interaction.response.send_message(embed=embed, ephemeral=True)


async def setup(bot: commands.Bot):
    await bot.add_cog(Help(bot))
