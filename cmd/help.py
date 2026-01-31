import discord
from discord.ext import commands
from discord import app_commands

from utils.embeds import make_embed
from utils.check_perms import is_bot_admin
from db.db_helpers.commands import is_command_disabled


class Help(commands.Cog):

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(name="help",
                          description="Show available bot commands")
    async def help(self, interaction: discord.Interaction):
        guild = interaction.guild
        is_admin = is_bot_admin(interaction)

        command_groups: dict[str, list[str]] = {}

        for command in self.bot.tree.get_commands():
            if guild and is_command_disabled(guild.id, command.name):
                if not is_admin:
                    continue

            # Admin-only heuristic (commands that manage server/bot)
            admin_only = command.name.startswith(
                ("adminrole", "sticky", "command_", "addrole", "removerole"))

            if admin_only and not is_admin:
                continue

            group = command.parent.name if command.parent else "General" # type: ignore

            entry = f"`/{command.name}` – {command.description or 'No description'}" # type: ignore
            command_groups.setdefault(group, []).append(entry)

        fields = []
        for group, cmds in sorted(command_groups.items()):
            fields.append((group, "\n".join(sorted(cmds)), False))

        embed = make_embed(
            title="Help",
            description="Available slash commands",
            level="INFO",
            fields=fields,
            footer="Use slash commands to interact with the bot")

        await interaction.response.send_message(embed=embed, ephemeral=True)


async def setup(bot: commands.Bot):
    await bot.add_cog(Help(bot))
