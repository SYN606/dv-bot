import discord
from discord import app_commands
from discord.ext import commands

from db.engine import SessionLocal
from db.models import CountingChannel
from utils.check_perms import is_bot_admin
from utils.embeds import make_embed
from utils.emojis import EMOJIS


class Counting(commands.Cog):

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    # ─────────────────────────────────────
    # SET COUNTING
    # ─────────────────────────────────────
    @app_commands.command(
        name="set_counting",
        description="Set a channel as a counting channel",
    )
    @app_commands.describe(channel="Channel to enable counting in")
    async def set_counting(
        self,
        interaction: discord.Interaction,
        channel: discord.TextChannel,
    ):
        if interaction.guild is None:
            return

        if not is_bot_admin(interaction):
            await interaction.response.send_message(
                embed=make_embed(
                    title="Permission Denied",
                    description=
                    "You are not allowed to manage counting channels.",
                    level="ERROR",
                ),
                ephemeral=True,
            )
            return

        db = SessionLocal()
        try:
            exists = (db.query(CountingChannel).filter_by(
                guild_id=interaction.guild.id,
                channel_id=channel.id,
            ).first())

            if exists:
                await interaction.response.send_message(
                    embed=make_embed(
                        title="Counting Channel",
                        description=
                        f"{EMOJIS['warning']} {channel.mention} is already a counting channel.",
                        level="WARNING",
                    ),
                    ephemeral=True,
                )
                return

            db.add(
                CountingChannel(
                    guild_id=interaction.guild.id,
                    channel_id=channel.id,
                ))
            db.commit()

            # Admin confirmation
            await interaction.response.send_message(
                embed=make_embed(
                    title="Counting Enabled",
                    description=
                    f"{EMOJIS['success']} {channel.mention} has been set as a counting channel.",
                    level="SUCCESS",
                ),
                ephemeral=True,
            )

            # Public rules message
            await channel.send(embed=make_embed(
                title="Counting Channel Activated",
                description=
                (f"{EMOJIS['announcement']} This channel is now a **counting channel**.\n\n"
                 f"{EMOJIS['arrow_point']} **Rules:**\n"
                 f"{EMOJIS['green_dot']} Count numbers in order (1, 2, 3…)\n"
                 f"{EMOJIS['green_dot']} Only one number per message\n"
                 f"{EMOJIS['green_dot']} No consecutive counts by the same user\n"
                 f"{EMOJIS['red_dot']} Wrong number resets the count\n\n"
                 f"{EMOJIS['ping']} Let the counting begin!"),
                level="SYSTEM",
                footer="Managed by Digital Vigital",
            ))

        finally:
            db.close()

    # ─────────────────────────────────────
    # UNSET COUNTING
    # ─────────────────────────────────────
    @app_commands.command(
        name="unset_counting",
        description="Disable counting in a channel",
    )
    @app_commands.describe(channel="Channel to disable counting in")
    async def unset_counting(
        self,
        interaction: discord.Interaction,
        channel: discord.TextChannel,
    ):
        if interaction.guild is None:
            return

        if not is_bot_admin(interaction):
            await interaction.response.send_message(
                embed=make_embed(
                    title="Permission Denied",
                    description=
                    "You are not allowed to manage counting channels.",
                    level="ERROR",
                ),
                ephemeral=True,
            )
            return

        db = SessionLocal()
        try:
            row = (db.query(CountingChannel).filter_by(
                guild_id=interaction.guild.id,
                channel_id=channel.id,
            ).first())

            if not row:
                await interaction.response.send_message(
                    embed=make_embed(
                        title="Counting Channel",
                        description=
                        f"{EMOJIS['warning']} {channel.mention} is not a counting channel.",
                        level="WARNING",
                    ),
                    ephemeral=True,
                )
                return

            db.delete(row)
            db.commit()

            # Admin confirmation
            await interaction.response.send_message(
                embed=make_embed(
                    title="Counting Disabled",
                    description=
                    f"{EMOJIS['success']} Counting has been disabled for {channel.mention}.",
                    level="SUCCESS",
                ),
                ephemeral=True,
            )

            # Public notice
            await channel.send(embed=make_embed(
                title="Counting Disabled",
                description=
                (f"{EMOJIS['fail']} This channel is no longer a counting channel.\n"
                 f"{EMOJIS['arrow_point']} Counting progress has been reset."),
                level="SYSTEM",
                footer="Managed by Digital Vigital",
            ))

        finally:
            db.close()


async def setup(bot: commands.Bot):
    await bot.add_cog(Counting(bot))
