import asyncio
import discord
from discord.ext import commands

from utils.permissions.base_admin import BaseAdminCog
from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS

from db.db_helpers.lockdown import (
    set_permission_snapshots,
    get_permission_snapshots,
    remove_permission_snapshots,
    is_channel_locked,
    get_security_roles,
)

SUPPORTED_CHANNELS = (
    discord.TextChannel,
    discord.VoiceChannel,
    discord.StageChannel,
    discord.ForumChannel,
)


def parse_duration(duration: str | None) -> int | None:

    if not duration:
        return None

    unit = duration[-1]
    value = duration[:-1]

    if not value.isdigit():
        return None

    value = int(value)

    if unit == "s":
        return value
    if unit == "m":
        return value * 60
    if unit == "h":
        return value * 3600

    return None


class Lockdown(BaseAdminCog):

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    # ─────────────────────────
    # LOCK CHANNEL
    # ─────────────────────────
    @commands.command(name="lock")
    async def lock(self, ctx: commands.Context, duration: str | None = None):

        guild = ctx.guild
        channel = ctx.channel

        if guild is None:
            return

        if not isinstance(channel, SUPPORTED_CHANNELS):
            await ctx.send(embed=make_embed(
                title="Unsupported Channel",
                description=
                f"{EMOJIS['warning']} This channel cannot be locked.",
                level="WARNING",
            ))
            return

        if await is_channel_locked(guild.id, channel.id):

            await ctx.send(embed=make_embed(
                title="Already Locked",
                description=
                f"{EMOJIS['warning']} This channel is already locked.",
                level="WARNING",
            ))
            return

        roles_to_lock = await get_security_roles(guild)

        snapshots = []

        for role_id in roles_to_lock:

            role = guild.get_role(role_id)

            if role is None:
                continue

            overwrite = channel.overwrites_for(role)

            snapshots.append((role_id, overwrite.send_messages))

        await set_permission_snapshots(
            guild.id,
            channel.id,
            snapshots,
            ctx.author.id,
        )

        for role_id in roles_to_lock:

            role = guild.get_role(role_id)

            if role is None:
                continue

            overwrite = channel.overwrites_for(role)
            overwrite.send_messages = False

            await channel.set_permissions(
                role,
                overwrite=overwrite,
                reason=f"Channel locked by {ctx.author}",
            )

        await ctx.send(embed=make_embed(
            title="Channel Locked",
            description=f"{EMOJIS['announcement']} {channel.mention} locked.",
            level="WARNING",
        ))

        seconds = parse_duration(duration)

        if seconds:

            async def unlock_later():
                await asyncio.sleep(seconds)
                await self._unlock_channel(channel)

            asyncio.create_task(unlock_later())

    # ─────────────────────────
    # UNLOCK CHANNEL
    # ─────────────────────────
    @commands.command(name="unlock")
    async def unlock(self, ctx: commands.Context):

        channel = ctx.channel

        if not isinstance(channel, SUPPORTED_CHANNELS):
            return

        success = await self._unlock_channel(channel)

        if not success:

            await ctx.send(embed=make_embed(
                title="Channel Not Locked",
                description=f"{EMOJIS['warning']} Channel not locked.",
                level="WARNING",
            ))

    # ─────────────────────────
    # SERVER LOCKDOWN
    # ─────────────────────────
    @commands.command(name="lockdown")
    async def lockdown(self, ctx: commands.Context):

        guild = ctx.guild

        if guild is None:
            return

        roles_to_lock = await get_security_roles(guild)

        locked = 0

        for channel in guild.channels:

            if not isinstance(channel, SUPPORTED_CHANNELS):
                continue

            if await is_channel_locked(guild.id, channel.id):
                continue

            snapshots = []

            for role_id in roles_to_lock:

                role = guild.get_role(role_id)

                if role is None:
                    continue

                overwrite = channel.overwrites_for(role)

                snapshots.append((role_id, overwrite.send_messages))

            await set_permission_snapshots(
                guild.id,
                channel.id,
                snapshots,
                ctx.author.id,
            )

            for role_id in roles_to_lock:

                role = guild.get_role(role_id)

                if role is None:
                    continue

                overwrite = channel.overwrites_for(role)
                overwrite.send_messages = False

                await channel.set_permissions(role, overwrite=overwrite)

            locked += 1

        await ctx.send(embed=make_embed(
            title="Server Lockdown Enabled",
            description=f"{EMOJIS['announcement']} {locked} channels locked.",
            level="WARNING",
        ))

    # ─────────────────────────
    # UNLOCK ENGINE
    # ─────────────────────────
    async def _unlock_channel(self, channel) -> bool:

        guild = channel.guild

        snapshots = await get_permission_snapshots(
            guild.id,
            channel.id,
        )

        if not snapshots:
            return False

        for snapshot in snapshots:

            role = guild.get_role(snapshot.target_id)

            if role is None:
                continue

            overwrite = channel.overwrites_for(role)

            overwrite.send_messages = snapshot.send_messages

            await channel.set_permissions(
                role,
                overwrite=overwrite,
                reason="Lockdown removed",
            )

        await remove_permission_snapshots(
            guild.id,
            channel.id,
        )

        await channel.send(embed=make_embed(
            title="Channel Unlocked",
            description=f"{EMOJIS['success']} {channel.mention} unlocked.",
            level="SUCCESS",
        ))

        return True


async def setup(bot: commands.Bot):
    await bot.add_cog(Lockdown(bot))
