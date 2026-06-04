import discord
from discord.ext import commands
from discord import app_commands
from utils.permissions.base_admin import (BaseAdminCog)
from utils.core.embeds import (make_embed)
from utils.views.role_manager import (RoleManagerView)


class Roles(BaseAdminCog):

    COOLDOWN_RATE = 1
    COOLDOWN_PER = 5.0

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    async def _reply(self,
                     interaction: discord.Interaction,
                     *,
                     title: str,
                     description: str,
                     level: str = "ERROR") -> None:
        embed = make_embed(title=title, description=description, level=level)

        try:
            if interaction.response.is_done():
                await interaction.followup.send(embed=embed, ephemeral=True)

            else:
                await interaction.response.send_message(embed=embed,
                                                        ephemeral=True)
        except discord.HTTPException:
            pass

    @app_commands.command(name="roles",
                          description=("Manage roles for a member "
                                       "using an interactive interface"))
    @app_commands.checks.cooldown(COOLDOWN_RATE, COOLDOWN_PER)
    @app_commands.describe(member=("Member whose roles "
                                   "you want to manage"))
    async def roles(self, interaction: discord.Interaction,
                    member: discord.Member) -> None:
        guild = interaction.guild
        actor = interaction.user
        bot_user = self.bot.user

        # CONTEXT
        if (guild is None or not isinstance(actor, discord.Member)):

            await self._reply(interaction,
                              title="Invalid Context",
                              description=("This command can only "
                                           "be used inside a server."))

            return

        # BOT MEMBER
        bot_member = guild.me
        if bot_member is None:
            return

        # BOT PERMISSIONS
        if (not bot_member.guild_permissions.manage_roles):
            await self._reply(interaction,
                              title="Missing Permission",
                              description=("I need the "
                                           "`Manage Roles` "
                                           "permission."))

            return

        # SELF TARGET
        if member.id == actor.id:
            await self._reply(interaction,
                              title="Invalid Target",
                              description=("You cannot manage "
                                           "your own roles."))

            return

        # BOT TARGET
        if (bot_user and member.bot and member.id == bot_user.id):
            await self._reply(interaction,
                              title="Invalid Target",
                              description=("You cannot manage "
                                           "my roles."))

            return

        # OWNER TARGET
        if member.id == guild.owner_id:
            await self._reply(interaction,
                              title="Invalid Target",
                              description=("You cannot manage "
                                           "the server owner's roles."))
            return

        # USER HIERARCHY
        if (actor != guild.owner and member.top_role >= actor.top_role):
            await self._reply(interaction,
                              title="Role Hierarchy Error",
                              description=("This user has a role "
                                           "equal to or higher "
                                           "than yours."))
            return

        # BOT HIERARCHY
        if (member.top_role >= bot_member.top_role):
            await self._reply(interaction,
                              title="Bot Hierarchy Error",
                              description=("I cannot manage this "
                                           "user due to role hierarchy."))
            return

        # DEFER
        try:
            await interaction.response.defer(ephemeral=True)
        except discord.HTTPException:
            await self._reply(interaction,
                              title="Interaction Failed",
                              description=("Failed to initialize "
                                           "the role manager."))

            return

        # VIEW
        view = RoleManagerView(bot=self.bot,
                               actor=actor,
                               target=member,
                               guild=guild)
        embed = make_embed(title="Role Manager",
                           description=(f"Managing roles for "
                                        f"{member.mention}.\n\n"
                                        "Use the menus below "
                                        "to queue role changes.\n"
                                        "Click **Apply Changes** "
                                        "to confirm."),
                           level="SYSTEM",
                           footer=f"Action by {actor}")

        # SEND
        try:
            await interaction.followup.send(embed=embed,
                                            view=view,
                                            ephemeral=True)
            view.message = (await interaction.original_response())
        except discord.HTTPException:
            await self._reply(interaction,
                              title="Panel Error",
                              description=("Failed to create the "
                                           "role manager panel."))

            return

    async def cog_app_command_error(self, interaction: discord.Interaction,
                                    error: app_commands.AppCommandError):
        if isinstance(error, app_commands.CommandOnCooldown):
            embed = make_embed(
                title="Cooldown Active",
                description=("Try again in "
                             f"**{round(error.retry_after, 1)}s**."),
                level="WARNING")

            try:
                if interaction.response.is_done():
                    await interaction.followup.send(embed=embed,
                                                    ephemeral=True)
                else:
                    await interaction.response.send_message(embed=embed,
                                                            ephemeral=True)
            except discord.HTTPException:
                pass


# CENTRALIZED ROLE ACCESS
setattr(Roles.roles, "role_management_command", True)


async def setup(bot: commands.Bot, ) -> None:
    await bot.add_cog(Roles(bot))
