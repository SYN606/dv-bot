import discord
from discord.ext import commands
from discord import app_commands

from utils.embeds import make_embed
from utils.emojis import EMOJIS
from utils.views.adminrole_view import AdminRoleView


class AdminRole(commands.Cog):

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(
        name="adminrole",
        description="Manage bot admin roles (Server Owner Only)",
    )
    async def adminrole(
        self,
        interaction: discord.Interaction,
    ):

        guild = interaction.guild
        user = interaction.user

        if guild is None:
            return await interaction.response.send_message(
                embed=make_embed(
                    title="Invalid Context",
                    description=f"{EMOJIS['fail']} Server only command.",
                    level="ERROR",
                ),
                ephemeral=True,
            )

        # ─────────────────────────────
        # OWNER ONLY CHECK
        # ─────────────────────────────
        if user.id != guild.owner_id:
            return await interaction.response.send_message(
                embed=make_embed(
                    title="Permission Denied",
                    description=(f"{EMOJIS['fail']} Only the **server owner** "
                                 "can manage bot admin roles."),
                    level="ERROR",
                ),
                ephemeral=True,
            )

        await interaction.response.defer(ephemeral=True)

        view = AdminRoleView(
            guild=guild,
            actor_id=user.id,
        )

        embed = make_embed(
            title="Bot Admin Role Panel",
            description=
            (f"{EMOJIS['announcement']} Manage bot admin roles.\n\n"
             f"{EMOJIS['arrow_point']} Access restricted to **Server Owner**."
             ),
            level="SYSTEM",
            footer=f"Owner: {user}",
        )

        await interaction.followup.send(
            embed=embed,
            view=view,
            ephemeral=True,
        )

        view.message = await interaction.original_response()


async def setup(bot: commands.Bot):
    await bot.add_cog(AdminRole(bot))
