import discord
from discord import app_commands
from discord.ext import commands

from utils.embeds import make_embed
from utils.emojis import EMOJIS
from utils.check_perms import is_bot_admin
from db.db_helpers.tempban import set_tempban_role


class TempbanRole(commands.Cog):

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(
        name="tempban_role",
        description="Configure the role used for tempbanned members",
    )
    @app_commands.describe(
        role="Role that will be assigned when a user is tempbanned", )
    async def tempban_role(
        self,
        interaction: discord.Interaction,
        role: discord.Role,
    ):
        guild = interaction.guild
        if guild is None:
            return await interaction.response.send_message(
                embed=make_embed(
                    title="Invalid Context",
                    description=
                    "This command can only be used inside a server.",
                    level="ERROR",
                ),
                ephemeral=True,
            )

        # ── Permission check (bot admin role / admin / owner)
        if not is_bot_admin(interaction):
            return await interaction.response.send_message(
                embed=make_embed(
                    title="Permission Denied",
                    description=
                    "You are not allowed to configure tempban roles.",
                    level="ERROR",
                ),
                ephemeral=True,
            )

        bot_member = guild.me
        if bot_member is None:
            return await interaction.response.send_message(
                embed=make_embed(
                    title="Bot Error",
                    description="Unable to resolve my member instance.",
                    level="ERROR",
                ),
                ephemeral=True,
            )

        # ── Managed / integration role check
        if role.managed:
            return await interaction.response.send_message(
                embed=make_embed(
                    title="Invalid Role",
                    description=
                    "This role is managed by an integration and cannot be assigned.",
                    level="ERROR",
                ),
                ephemeral=True,
            )

        # ── Role hierarchy check
        if role >= bot_member.top_role:
            return await interaction.response.send_message(
                embed=make_embed(
                    title="Role Hierarchy Error",
                    description=
                    ("I cannot manage this role because it is **higher than or equal to** "
                     "my highest role.\n\n"
                     f"{EMOJIS['arrow_point']} Move my role above **{role.name}** and try again."
                     ),
                    level="ERROR",
                ),
                ephemeral=True,
            )

        # ── Save configuration
        set_tempban_role(guild.id, role.id)

        await interaction.response.send_message(
            embed=make_embed(
                title="Tempban Role Configured",
                description=
                (f"{EMOJIS['success']} {role.mention} has been set as the **tempban role**.\n\n"
                 f"{EMOJIS['arrow_point']} This role will be automatically assigned on tempban."
                 ),
                level="SUCCESS",
                footer="Tempban system • Digital Vigital",
            ),
            ephemeral=True,
        )


async def setup(bot: commands.Bot):
    await bot.add_cog(TempbanRole(bot))
