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

        # ─────────────────────────
        # Context validation
        # ─────────────────────────
        if guild is None:
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

        # 🚀 Immediate defer (fast UI response)
        await interaction.response.defer(ephemeral=True)

        # ─────────────────────────
        # Permission check
        # ─────────────────────────
        if not await is_bot_admin(interaction):
            await interaction.followup.send(embed=make_embed(
                title="Permission Denied",
                description="You are not allowed to configure tempban roles.",
                level="ERROR",
            ), )
            return

        bot_member = guild.me
        if bot_member is None:
            await interaction.followup.send(embed=make_embed(
                title="Bot Error",
                description="Unable to resolve my member instance.",
                level="ERROR",
            ), )
            return

        # Managed role check
        if role.managed:
            await interaction.followup.send(embed=make_embed(
                title="Invalid Role",
                description=
                "This role is managed by an integration and cannot be assigned.",
                level="ERROR",
            ), )
            return

        # Role hierarchy check
        if role >= bot_member.top_role:
            await interaction.followup.send(embed=make_embed(
                title="Role Hierarchy Error",
                description=
                ("I cannot manage this role because it is higher than or equal to my highest role.\n\n"
                 f"{EMOJIS['arrow_point']} Move my role above **{role.name}** and try again."
                 ),
                level="ERROR",
            ), )
            return

        # Save configuration
        await set_tempban_role(guild.id, role.id)

        # Confirmation
        await interaction.followup.send(embed=make_embed(
            title="Tempban Role Configured",
            description=
            (f"{EMOJIS['success']} {role.mention} has been set as the **tempban role**.\n\n"
             f"{EMOJIS['arrow_point']} This role will be automatically assigned on tempban."
             ),
            level="SUCCESS",
        ), )


async def setup(bot: commands.Bot):
    await bot.add_cog(TempbanRole(bot))
