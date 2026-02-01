import discord
from discord import app_commands
from discord.ext import commands

from utils.embeds import make_embed
from utils.emojis import EMOJIS
from utils.check_perms import is_bot_admin
from db.db_helpers.tempban import (
    get_tempban_role,
    remove_tempban,
    is_tempbanned,
)


class UnTempban(commands.Cog):

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(
        name="untempban",
        description="Remove a tempban from a user",
    )
    @app_commands.describe(
        member="Member to remove tempban from",
        reason="Reason for removing the tempban (optional)",
    )
    async def untempban(
        self,
        interaction: discord.Interaction,
        member: discord.Member,
        reason: str | None = None,
    ):
        guild = interaction.guild
        if guild is None:
            return

        # ─────────────────────────
        # PERMISSION CHECK
        # ─────────────────────────
        if not is_bot_admin(interaction):
            return await interaction.response.send_message(
                embed=make_embed(
                    title="Permission Denied",
                    description="You are not allowed to manage tempbans.",
                    level="ERROR",
                ),
                ephemeral=True,
            )

        # ─────────────────────────
        # TEMPBAN STATUS CHECK
        # ─────────────────────────
        if not is_tempbanned(guild.id, member.id):
            return await interaction.response.send_message(
                embed=make_embed(
                    title="Not Tempbanned",
                    description=
                    (f"{EMOJIS['warning']} {member.mention} is not currently tempbanned."
                     ),
                    level="WARNING",
                ),
                ephemeral=True,
            )

        # ─────────────────────────
        # TEMPBAN ROLE CONFIG
        # ─────────────────────────
        role_id = get_tempban_role(guild.id)
        if role_id is None:
            return await interaction.response.send_message(
                embed=make_embed(
                    title="Tempban Role Not Configured",
                    description=
                    (f"{EMOJIS['warning']} No tempban role is configured.\n"
                     f"{EMOJIS['arrow_point']} Use `/tempban_role` to set one first."
                     ),
                    level="ERROR",
                ),
                ephemeral=True,
            )

        role = guild.get_role(role_id)
        bot_member = guild.me

        # ─────────────────────────
        # ROLE REMOVAL
        # ─────────────────────────
        if role and role in member.roles:
            if bot_member and role >= bot_member.top_role:
                return await interaction.response.send_message(
                    embed=make_embed(
                        title="Role Hierarchy Error",
                        description=
                        (f"{EMOJIS['fail']} I cannot remove {role.mention}.\n"
                         f"{EMOJIS['arrow_point']} My role must be above it."),
                        level="ERROR",
                    ),
                    ephemeral=True,
                )

            try:
                await member.remove_roles(
                    role,
                    reason=reason or f"Tempban removed by {interaction.user}",
                )
            except discord.Forbidden:
                return await interaction.response.send_message(
                    embed=make_embed(
                        title="Role Removal Failed",
                        description=
                        (f"{EMOJIS['fail']} I don’t have permission to remove {role.mention}."
                         ),
                        level="ERROR",
                    ),
                    ephemeral=True,
                )

        # ─────────────────────────
        # DATABASE UPDATE
        # ─────────────────────────
        remove_tempban(
            guild_id=guild.id,
            user_id=member.id,
            moderator_id=interaction.user.id,
        )

        # ─────────────────────────
        # PUBLIC CONFIRMATION
        # ─────────────────────────
        await interaction.response.send_message(embed=make_embed(
            title="Tempban Removed",
            description=
            (f"{EMOJIS['success']} {member.mention} has been **untempbanned**.\n\n"
             f"{EMOJIS['arrow_point']} **Reason:** {reason or 'No reason provided'}"
             ),
            level="SUCCESS",
            footer=f"Action by {interaction.user}",
        ))


async def setup(bot: commands.Bot):
    await bot.add_cog(UnTempban(bot))
