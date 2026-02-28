import discord
from discord import app_commands
from discord.ext import commands

from utils.base_admin import BaseAdminCog
from utils.embeds import make_embed
from utils.emojis import EMOJIS
from utils.logging.mod_log import send_mod_log

from db.db_helpers.tempban import get_active_tempbans


class TempbanList(BaseAdminCog):
    """
    View all active tempbans in the server.
    Admin-only.
    """

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(
        name="tempban_list",
        description="List all active tempbanned members in this server",
    )
    async def tempban_list(self, interaction: discord.Interaction):

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

        # Permission handled by BaseAdminCog

        await interaction.response.defer(ephemeral=True)

        records = await get_active_tempbans(guild.id)

        if not records:
            return await interaction.followup.send(
                embed=make_embed(
                    title="Active Tempbans",
                    description=
                    f"{EMOJIS['success']} No active tempbans in this server.",
                    level="INFO",
                ),
                ephemeral=True,
            )

        entries: list[str] = []

        for row in records[:10]:  # Hard cap for safety

            member = guild.get_member(row.user_id)
            moderator = guild.get_member(row.moderator_id)

            user_display = (member.mention
                            if member else f"`{row.user_id}` (left server)")

            mod_display = (moderator.mention
                           if moderator else f"`{row.moderator_id}`")

            expires = (f"<t:{int(row.expires_at.timestamp())}:R>"
                       if row.expires_at else "Manual")

            entries.append(
                f"{EMOJIS['red_dot']} **User:** {user_display}\n"
                f"{EMOJIS['arrow_point']} **Moderator:** {mod_display}\n"
                f"{EMOJIS['arrow_point']} **Reason:** {row.reason or 'No reason provided'}\n"
                f"{EMOJIS['arrow_point']} **Expires:** {expires}")

        embed = make_embed(
            title="Active Tempbans",
            description="\n\n".join(entries),
            level="INFO",
            footer=
            f"Showing {min(len(records), 10)} of {len(records)} active tempbans",
        )

        await interaction.followup.send(embed=embed, ephemeral=True)

        # Structured Logging
        await send_mod_log(
            guild=guild,
            category="BAN",
            title="Tempban List Viewed",
            description=f"{len(records)} active tempban record(s) inspected.",
            level="INFO",
            actor=interaction.user,
            extra_fields={
                "Total Records": len(records),
            },
        )


async def setup(bot: commands.Bot):
    await bot.add_cog(TempbanList(bot))
