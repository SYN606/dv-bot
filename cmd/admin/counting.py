import discord
from discord import app_commands
from discord.ext import commands
from sqlalchemy import select

from db.engine import AsyncSessionLocal
from db.models import CountingChannel

from utils.permissions.base_admin import BaseAdminCog
from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS
from utils.logging.mod_log import send_mod_log


class Counting(BaseAdminCog):
    """
    Counting Game Configuration (Admin Only)
    """

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    # ─────────────────────────
    # ENABLE COUNTING
    # ─────────────────────────
    @app_commands.command(
        name="set_counting",
        description="Enable counting game in a channel",
    )
    @app_commands.describe(channel="Channel where counting will be enabled")
    async def set_counting(
        self,
        interaction: discord.Interaction,
        channel: discord.TextChannel,
    ) -> None:

        guild = interaction.guild
        if guild is None:
            return

        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(CountingChannel).where(
                    CountingChannel.guild_id == guild.id,
                    CountingChannel.channel_id == channel.id,
                ))
            exists = result.scalar_one_or_none()

            if exists:
                await interaction.response.send_message(
                    embed=make_embed(
                        title="Already Enabled",
                        description=(f"{EMOJIS['warning']} {channel.mention} "
                                     "is already a counting channel."),
                        level="WARNING",
                    ),
                    ephemeral=True,
                )
                return

            session.add(
                CountingChannel(
                    guild_id=guild.id,
                    channel_id=channel.id,
                ))
            await session.commit()

        await interaction.response.send_message(
            embed=make_embed(
                title="Counting Enabled",
                description=
                (f"{EMOJIS['success']} Counting enabled in {channel.mention}."
                 ),
                level="SUCCESS",
            ),
            ephemeral=True,
        )

        await channel.send(embed=make_embed(
            title="Counting Game Started",
            description=(f"{EMOJIS['announcement']} This channel is now a "
                         "**counting channel**.\n\n"
                         f"{EMOJIS['green_dot']} Count numbers in order\n"
                         f"{EMOJIS['green_dot']} One number per message\n"
                         f"{EMOJIS['green_dot']} No consecutive turns\n"
                         f"{EMOJIS['red_dot']} Wrong number resets\n\n"
                         f"{EMOJIS['ping']} Let the counting begin!"),
            level="SYSTEM",
            footer="Counting • Digital Vigital",
        ))

        # Structured logging
        await send_mod_log(
            guild=guild,
            category="CONFIG",
            title="Counting Enabled",
            description=f"Counting enabled in {channel.mention}.",
            level="SUCCESS",
            actor=interaction.user,
            extra_fields={
                "Channel ID": channel.id,
            },
        )

    # ─────────────────────────
    # DISABLE COUNTING
    # ─────────────────────────
    @app_commands.command(
        name="unset_counting",
        description="Disable counting game in a channel",
    )
    @app_commands.describe(channel="Channel where counting will be disabled")
    async def unset_counting(
        self,
        interaction: discord.Interaction,
        channel: discord.TextChannel,
    ) -> None:

        guild = interaction.guild
        if guild is None:
            return

        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(CountingChannel).where(
                    CountingChannel.guild_id == guild.id,
                    CountingChannel.channel_id == channel.id,
                ))
            row = result.scalar_one_or_none()

            if not row:
                await interaction.response.send_message(
                    embed=make_embed(
                        title="Not a Counting Channel",
                        description=(f"{EMOJIS['warning']} {channel.mention} "
                                     "is not configured for counting."),
                        level="WARNING",
                    ),
                    ephemeral=True,
                )
                return

            await session.delete(row)
            await session.commit()

        await interaction.response.send_message(
            embed=make_embed(
                title="Counting Disabled",
                description=
                (f"{EMOJIS['success']} Counting disabled in {channel.mention}."
                 ),
                level="SUCCESS",
            ),
            ephemeral=True,
        )

        await channel.send(embed=make_embed(
            title="Counting Game Disabled",
            description=(f"{EMOJIS['fail']} This channel is no longer "
                         "a counting channel.\n"
                         f"{EMOJIS['arrow_point']} Progress reset."),
            level="SYSTEM",
            footer="Counting • Digital Vigital",
        ))

        # Structured logging
        await send_mod_log(
            guild=guild,
            category="CONFIG",
            title="Counting Disabled",
            description=f"Counting disabled in {channel.mention}.",
            level="WARNING",
            actor=interaction.user,
            extra_fields={
                "Channel ID": channel.id,
            },
        )


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(Counting(bot))
