import discord
from discord.ext import commands
from discord import app_commands

from utils.embeds import make_embed
from utils.emojis import EMOJIS
from utils.check_perms import is_bot_admin
from utils.views.adminrole_view import AdminRoleView


class AdminRole(commands.Cog):

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(
        name="adminrole",
        description="Manage bot admin roles using an interactive panel",
    )
    async def adminrole(
        self,
        interaction: discord.Interaction,
    ):

        await interaction.response.defer(ephemeral=True)

        guild = interaction.guild
        if guild is None:
            await interaction.followup.send(
                embed=make_embed(
                    title="Invalid Context",
                    description=f"{EMOJIS['fail']} Server only command.",
                    level="ERROR",
                ),
                ephemeral=True,
            )
            return

        if not is_bot_admin(interaction):
            await interaction.followup.send(
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
            (f"{EMOJIS['announcement']} Manage bot admin roles.\n\n"
             f"{EMOJIS['arrow_point']} Discord administrator permission is not required."
             ),
            level="SYSTEM",
        )

        await interaction.followup.send(
            embed=embed,
            view=view,
            ephemeral=True,
        )

        view.message = await interaction.original_response()


async def setup(bot: commands.Bot):
    await bot.add_cog(AdminRole(bot))
