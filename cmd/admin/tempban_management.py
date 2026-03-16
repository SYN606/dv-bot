import discord
from discord import app_commands
from discord.ext import commands

from utils.permissions.base_admin import BaseAdminCog
from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS
from utils.logging.mod_log import send_mod_log

from db.db_helpers.tempban import (
    get_active_tempbans,
    set_tempban_role,
)


class TempbanManagement(BaseAdminCog):
    """
    Slash Commands:
    /tempban_list
    /tempban_role
    """

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    # TEMPBAN LIST

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

        await interaction.response.defer(ephemeral=True)

        records = await get_active_tempbans(guild.id)

        if not records:
            return await interaction.followup.send(
                embed=make_embed(
                    title="Active Tempbans",
                    description=f"{EMOJIS['success']} No active tempbans.",
                    level="INFO",
                ),
                ephemeral=True,
            )

        # Sort: Soonest expiry first, manual last
        records.sort(key=lambda r: (
            r.expires_at is None,
            r.expires_at.timestamp() if r.expires_at else float("inf"),
        ))

        entries = []

        for row in records:
            member = guild.get_member(row.user_id)
            moderator = guild.get_member(row.moderator_id)

            user_display = (member.mention
                            if member else f"`{row.user_id}` (left)")
            mod_display = (moderator.mention
                           if moderator else f"`{row.moderator_id}`")
            expires = (f"<t:{int(row.expires_at.timestamp())}:R>"
                       if row.expires_at else "Manual")

            entries.append(
                f"{EMOJIS['red_dot']} **{user_display}**\n"
                f"{EMOJIS['arrow_point']} Moderator: {mod_display}\n"
                f"{EMOJIS['arrow_point']} Reason: {row.reason or 'No reason provided'}\n"
                f"{EMOJIS['arrow_point']} Expires: {expires}")

        # Paginate safely
        pages = []
        chunk = ""

        for block in entries:
            if len(chunk) + len(block) > 3500:
                pages.append(chunk)
                chunk = block + "\n\n"
            else:
                chunk += block + "\n\n"

        if chunk:
            pages.append(chunk)

        for index, page in enumerate(pages, start=1):
            embed = make_embed(
                title="Active Tempbans",
                description=page,
                level="INFO",
                footer=f"Page {index}/{len(pages)} • Total: {len(records)}",
            )
            await interaction.followup.send(embed=embed, ephemeral=True)

        await send_mod_log(
            guild=guild,
            category="BAN",
            title="Tempban List Viewed",
            description=f"{len(records)} active tempban record(s) inspected.",
            level="INFO",
            actor=interaction.user,
        )

    # TEMPBAN ROLE CONFIG

    @app_commands.command(
        name="tempban_role",
        description="Configure the role used for tempbanned members",
    )
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

        bot_member = guild.me
        moderator: discord.Member = interaction.user # type: ignore

        # Role Safety Validation

        if role.is_default():
            return await interaction.response.send_message(
                embed=make_embed(
                    title="Invalid Role",
                    description="You cannot use @everyone as tempban role.",
                    level="ERROR",
                ),
                ephemeral=True,
            )

        if role.managed:
            return await interaction.response.send_message(
                embed=make_embed(
                    title="Invalid Role",
                    description="This role is managed by an integration.",
                    level="ERROR",
                ),
                ephemeral=True,
            )

        if role.permissions.administrator:
            return await interaction.response.send_message(
                embed=make_embed(
                    title="Unsafe Role",
                    description=
                    "You cannot assign a role with Administrator permission.",
                    level="ERROR",
                ),
                ephemeral=True,
            )

        if role >= bot_member.top_role:
            return await interaction.response.send_message(
                embed=make_embed(
                    title="Role Hierarchy Error",
                    description=(
                        f"I must be above **{role.name}** to assign it.\n\n"
                        f"{EMOJIS['arrow_point']} Move my role higher."),
                    level="ERROR",
                ),
                ephemeral=True,
            )

        if role >= moderator.top_role:
            return await interaction.response.send_message(
                embed=make_embed(
                    title="Hierarchy Error",
                    description=
                    "You cannot configure a role equal or higher than yours.",
                    level="ERROR",
                ),
                ephemeral=True,
            )

        await interaction.response.defer(ephemeral=True)

        await set_tempban_role(guild.id, role.id)

        await interaction.followup.send(
            embed=make_embed(
                title="Tempban Role Configured",
                description=
                (f"{EMOJIS['success']} {role.mention} is now the tempban role.\n\n"
                 f"{EMOJIS['arrow_point']} This role will be assigned during tempbans."
                 ),
                level="SUCCESS",
            ),
            ephemeral=True,
        )

        await send_mod_log(
            guild=guild,
            category="BAN",
            title="Tempban Role Configured",
            description=f"{role.mention} set as tempban role.",
            level="SUCCESS",
            actor=interaction.user,
            extra_fields={"Role ID": role.id},
        )


async def setup(bot: commands.Bot):
    await bot.add_cog(TempbanManagement(bot))
