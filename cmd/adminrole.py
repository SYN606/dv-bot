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
    async def adminrole(self, interaction: discord.Interaction):

        guild = interaction.guild
        user = interaction.user

        # ─────────────────────────
        # SERVER CHECK
        # ─────────────────────────
        if guild is None:
            embed = make_embed(
                title="Invalid Context",
                description=f"{EMOJIS['fail']} This command can only be used in a server.",
                level="ERROR",
            )

            if interaction.response.is_done():
                await interaction.followup.send(embed=embed, ephemeral=True)
            else:
                await interaction.response.send_message(embed=embed, ephemeral=True)

            return

        # ─────────────────────────
        # OWNER CHECK
        # ─────────────────────────
        if user.id != guild.owner_id:
            embed = make_embed(
                title="Permission Denied",
                description=(
                    f"{EMOJIS['fail']} Only the **server owner** "
                    "can manage bot admin roles."
                ),
                level="ERROR",
            )

            if interaction.response.is_done():
                await interaction.followup.send(embed=embed, ephemeral=True)
            else:
                await interaction.response.send_message(embed=embed, ephemeral=True)

            return

        # ─────────────────────────
        # CREATE PANEL
        # ─────────────────────────
        view = AdminRoleView(
            guild=guild,
            actor_id=user.id,
        )

        embed = make_embed(
            title="Bot Admin Role Panel",
            description=(
                f"{EMOJIS['announcement']} Manage bot admin roles.\n\n"
                f"{EMOJIS['arrow_point']} Access restricted to **Server Owner**."
            ),
            level="SYSTEM",
            footer=f"Owner: {user}",
        )

        # SAFE RESPONSE
        if interaction.response.is_done():
            message = await interaction.followup.send(
                embed=embed,
                view=view,
                ephemeral=True,
                wait=True,
            )
        else:
            await interaction.response.send_message(
                embed=embed,
                view=view,
                ephemeral=True,
            )
            message = await interaction.original_response()

        # store message for timeout
        view.message = message


async def setup(bot: commands.Bot):
    await bot.add_cog(AdminRole(bot))
