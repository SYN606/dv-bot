import discord
from discord.ext import commands
from discord import app_commands

from utils.permissions.base_admin import BaseAdminCog
from utils.core.embeds import make_embed
from utils.views.role_manager import RoleManagerView


class Roles(BaseAdminCog):
    """
    Role management interface.
    Admin / Manage Roles / Bot-admin allowed.
    """

    COOLDOWN_RATE = 1
    COOLDOWN_PER = 5.0

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    async def interaction_check(
        self,
        interaction: discord.Interaction,
    ) -> bool:

        guild = interaction.guild

        if guild is None:
            return True

        if not isinstance(interaction.user, discord.Member):
            return False

        if interaction.user.id == guild.owner_id:
            return True

        perms = interaction.user.guild_permissions

        if perms.administrator or perms.manage_roles:
            return True

        return await super().interaction_check(interaction)

    # COMMAND
    @app_commands.command(
        name="roles",
        description="Manage roles for a member using an interactive interface",
    )
    @app_commands.checks.cooldown(
        COOLDOWN_RATE,
        COOLDOWN_PER,
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

        # CONTEXT VALIDATION
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

        # SAFETY CHECKS
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

        # user hierarchy
        if member.top_role >= actor.top_role:
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

        # bot hierarchy
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

        # DEFER
        await interaction.response.defer(ephemeral=True)

        # VIEW
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

        # attach message safely
        try:
            view.message = await interaction.original_response()
        except discord.HTTPException:
            view.message = None

    # ERROR HANDLER
    async def cog_app_command_error(
        self,
        interaction: discord.Interaction,
        error: app_commands.AppCommandError,
    ):
        if isinstance(error, app_commands.CommandOnCooldown):

            if interaction.response.is_done():
                await interaction.followup.send(
                    embed=make_embed(
                        title="Cooldown Active",
                        description=
                        f"Try again in **{round(error.retry_after, 1)}s**.",
                        level="WARNING",
                    ),
                    ephemeral=True,
                )
            else:
                await interaction.response.send_message(
                    embed=make_embed(
                        title="Cooldown Active",
                        description=
                        f"Try again in **{round(error.retry_after, 1)}s**.",
                        level="WARNING",
                    ),
                    ephemeral=True,
                )


# SETUP
async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(Roles(bot))
