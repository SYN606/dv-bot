import discord
from discord import app_commands
from discord.ext import commands

from utils.base_admin import BaseAdminCog
from utils.embeds import make_embed
from utils.emojis import EMOJIS
from utils.logging.mod_log import send_mod_log

from db.db_helpers.tempban import set_tempban_role


class TempbanRole(BaseAdminCog):
    """
    Configure the role assigned to tempbanned members.
    Admin-only.
    """

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
                    description="This command must be used in a server.",
                    level="ERROR",
                ),
                ephemeral=True,
            )

        # Permission auto-handled by BaseAdminCog

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

        # ─────────────────────────
        # Role validation
        # ─────────────────────────

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

        if role >= bot_member.top_role:
            return await interaction.response.send_message(
                embed=make_embed(
                    title="Role Hierarchy Error",
                    description=
                    ("I cannot manage this role because it is higher than or equal "
                     "to my highest role.\n\n"
                     f"{EMOJIS['arrow_point']} Move my role above **{role.name}** and try again."
                     ),
                    level="ERROR",
                ),
                ephemeral=True,
            )

        await interaction.response.defer(ephemeral=True)

        # ─────────────────────────
        # Save configuration
        # ─────────────────────────
        await set_tempban_role(guild.id, role.id)

        await interaction.followup.send(
            embed=make_embed(
                title="Tempban Role Configured",
                description=
                (f"{EMOJIS['success']} {role.mention} has been set as the **tempban role**.\n\n"
                 f"{EMOJIS['arrow_point']} This role will be automatically assigned on tempban."
                 ),
                level="SUCCESS",
            ),
            ephemeral=True,
        )

        # ─────────────────────────
        # Structured Logging
        # ─────────────────────────
        await send_mod_log(
            guild=guild,
            category="BAN",
            title="Tempban Role Configured",
            description=f"{role.mention} set as tempban role.",
            level="SUCCESS",
            actor=interaction.user,
            extra_fields={
                "Role ID": role.id,
            },
        )


async def setup(bot: commands.Bot):
    await bot.add_cog(TempbanRole(bot))
