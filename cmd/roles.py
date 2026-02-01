import discord
from discord.ext import commands
from discord import app_commands

from utils.check_perms import is_bot_admin
from utils.embeds import make_embed
from utils.views.role_manager import RoleManagerView


class Roles(commands.Cog):

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(
        name="roles",
        description="Manage roles for a user (interactive UI)",
    )
    @app_commands.describe(member="Member whose roles you want to manage", )
    async def roles(
        self,
        interaction: discord.Interaction,
        member: discord.Member,
    ):
        # ─────────────────────────────
        # Type narrowing (IMPORTANT)
        # ─────────────────────────────
        if interaction.guild is None:
            return

        if not isinstance(interaction.user, discord.Member):
            return

        # ─────────────────────────────
        # Permission check
        # ─────────────────────────────
        if not is_bot_admin(interaction):
            await interaction.response.send_message(
                embed=make_embed(
                    title="Permission Denied",
                    description="You are not allowed to manage roles.",
                    level="ERROR",
                ),
                ephemeral=True,
            )
            return

        # ─────────────────────────────
        # Build interactive role manager
        # ─────────────────────────────
        view = RoleManagerView(
            bot=self.bot,
            actor=interaction.user,  # narrowed to Member
            target=member,
            guild=interaction.guild,  # narrowed to Guild
        )

        await interaction.response.send_message(
            embed=make_embed(
                title="Role Manager",
                description=(
                    f"Managing roles for {member.mention}\n\n"
                    "Use the buttons below to **add** or **remove** roles.\n"
                    "Changes will only be applied once you click **Done**."),
                level="SYSTEM",
            ),
            view=view,
            ephemeral=True,
        )


async def setup(bot: commands.Bot):
    await bot.add_cog(Roles(bot))
