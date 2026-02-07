import discord
from discord.ext import commands
from discord import app_commands

from utils.embeds import make_embed
from utils.emojis import EMOJIS
from utils.check_perms import is_bot_admin
from utils.views.adminrole_view import AdminRoleView


class AdminRole(commands.Cog):
    """
    Bot admin role management (v2).

    Uses a single interactive control panel instead
    of multiple commands.
    """

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(
        name="adminrole",
        description="Manage bot admin roles using an interactive panel",
    )
    async def adminrole(
        self,
        interaction: discord.Interaction,
    ) -> None:

        guild = interaction.guild
        if guild is None:
            await interaction.response.send_message(
                embed=make_embed(
                    title="Invalid Context",
                    description=
                    f"{EMOJIS['fail']} This command can only be used in a server.",
                    level="ERROR",
                ),
                ephemeral=True,
            )
            return

        if not is_bot_admin(interaction):
            await interaction.response.send_message(
                embed=make_embed(
                    title="Permission Denied",
                    description=
                    f"{EMOJIS['fail']} You are not allowed to manage bot admin roles.",
                    level="ERROR",
                ),
                ephemeral=True,
            )
            return

        view = AdminRoleView(
            guild=guild,
            actor_id=interaction.user.id,
        )

        embed = make_embed(
            title="Bot Admin Role Panel",
            description=
            (f"{EMOJIS['announcement']} Manage **bot admin roles** below.\n\n"
             f"{EMOJIS['arrow_point']} Bot admins can use bot features\n"
             f"{EMOJIS['arrow_point']} Discord administrator permission is **not required**"
             ),
            level="SYSTEM",
        )

        await interaction.response.send_message(
            embed=embed,
            view=view,
            ephemeral=True,
        )

        view.message = await interaction.original_response()


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(AdminRole(bot))
