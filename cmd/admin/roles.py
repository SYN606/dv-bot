import discord
from discord.ext import commands
from discord import app_commands

from utils.permissions.base_admin import BaseAdminCog
from utils.core.embeds import make_embed
from utils.views.role_manager import RoleManagerView


class Roles(BaseAdminCog):
    """
    Role management interface.
    Admin-only.
    """

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(
        name="roles",
        description="Manage roles for a member using an interactive interface",
    )
    @app_commands.describe(member="Member whose roles you want to manage")
    async def roles(
        self,
        interaction: discord.Interaction,
        member: discord.Member,
    ) -> None:

        guild = interaction.guild
        actor = interaction.user
        bot_user = self.bot.user

        # =====================================================
        # CONTEXT VALIDATION
        # =====================================================
        if guild is None or not isinstance(actor, discord.Member):
            await interaction.response.send_message(
                embed=make_embed(
                    title="Invalid Context",
                    description=
                    "This command can only be used inside a server.",
                    level="ERROR",
                ),
                ephemeral=True,
            )
            return

        # =====================================================
        # SAFETY CHECKS
        # =====================================================
        if bot_user and member.bot and member.id == bot_user.id:
            await interaction.response.send_message(
                embed=make_embed(
                    title="Invalid Target",
                    description="You cannot manage my roles.",
                    level="ERROR",
                ),
                ephemeral=True,
            )
            return

        if member == actor:
            await interaction.response.send_message(
                embed=make_embed(
                    title="Invalid Target",
                    description="You cannot manage your own roles.",
                    level="ERROR",
                ),
                ephemeral=True,
            )
            return

        # Prevent managing higher/equal roles
        if isinstance(actor,
                      discord.Member) and member.top_role >= actor.top_role:
            await interaction.response.send_message(
                embed=make_embed(
                    title="Role Hierarchy Error",
                    description=(
                        "You cannot manage this user because their top role "
                        "is higher than or equal to yours."),
                    level="ERROR",
                ),
                ephemeral=True,
            )
            return

        # Bot hierarchy check (important missing piece)
        bot_member = guild.me
        if bot_member and member.top_role >= bot_member.top_role:
            await interaction.response.send_message(
                embed=make_embed(
                    title="Bot Hierarchy Error",
                    description=
                    "I cannot manage this user due to role hierarchy.",
                    level="ERROR",
                ),
                ephemeral=True,
            )
            return

        # =====================================================
        # DEFER RESPONSE
        # =====================================================
        await interaction.response.defer(ephemeral=True)

        # =====================================================
        # CREATE VIEW
        # =====================================================
        view = RoleManagerView(
            bot=self.bot,
            actor=actor,
            target=member,
            guild=guild,
        )

        embed = make_embed(
            title="Role Manager",
            description=(f"Managing roles for {member.mention}.\n\n"
                         "Use the menus below to queue role changes.\n"
                         "Click **Apply Changes** to confirm."),
            level="SYSTEM",
            footer=f"Action by {actor}",
        )

        await interaction.followup.send(
            embed=embed,
            view=view,
            ephemeral=True,
        )

        # Store message for timeout handling
        try:
            view.message = await interaction.original_response()
        except discord.HTTPException:
            view.message = None


# =========================================================
# SETUP
# =========================================================
async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(Roles(bot))
