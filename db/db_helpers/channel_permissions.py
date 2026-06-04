import asyncio
import discord
from sqlalchemy import (delete, distinct, select)
from sqlalchemy.dialects.postgresql import (insert as postgres_insert)
from sqlalchemy.dialects.sqlite import (insert as sqlite_insert)
from db.engine import (AsyncSessionLocal, DB_DIALECT)
from db.models import (ChannelPermissionSnapshot)
from db.db_helpers.verification import (get_verification_config)


# Internal insert builder
def build_insert_stmt(model, values: dict):
    if DB_DIALECT == "postgresql":
        return postgres_insert(model, ).values(**values)
    return sqlite_insert(model, ).values(**values)


# Safe overwrite updater
async def safe_set_permissions(channel: discord.abc.GuildChannel,
                               target: discord.Role, *,
                               overwrite: (discord.PermissionOverwrite
                                           | None), reason: str) -> bool:
    for _ in range(3):
        try:
            await channel.set_permissions(target,
                                          overwrite=overwrite,
                                          reason=reason)
            # Prevent overwrite spam
            await asyncio.sleep(0.45)
            return True
        except discord.HTTPException as error:
            # 429 handling
            if getattr(error, "status", None) == 429:
                retry_after = getattr(error, "retry_after", 2)
                await asyncio.sleep(float(retry_after))
                continue
            return False

    return False


# Resolve target roles
async def get_target_roles(guild: discord.Guild, ) -> list[discord.Role]:
    roles: list[discord.Role] = [
        guild.default_role,
    ]
    verification = await get_verification_config(guild.id, )
    if not verification:
        return roles
    verified_role_id = (verification.verified_role_id)

    if not verified_role_id:
        return roles

    verified_role = guild.get_role(verified_role_id)
    if verified_role is None:
        return roles

    if verified_role.id != guild.default_role.id:
        roles.append(verified_role, )

    return roles


# Create snapshots
async def create_permission_snapshots(
        guild_id: int, channel_id: int, snapshots: list[tuple[
            int,
            str,
            bool | None,
        ]]) -> None:

    if not snapshots:
        return

    async with AsyncSessionLocal() as session:
        for (target_id, permission_name, permission_value) in snapshots:
            stmt = build_insert_stmt(
                ChannelPermissionSnapshot, {
                    "guild_id": guild_id,
                    "channel_id": channel_id,
                    "target_id": target_id,
                    "permission_name": permission_name,
                    "permission_value": permission_value
                })

            # Preserve original state only
            stmt = stmt.on_conflict_do_nothing(index_elements=[
                ChannelPermissionSnapshot.guild_id, ChannelPermissionSnapshot.
                channel_id, ChannelPermissionSnapshot.target_id,
                ChannelPermissionSnapshot.permission_name
            ])
            await session.execute(stmt)
        await session.commit()


# Fetch snapshots
async def get_permission_snapshots(
        guild_id: int, channel_id: int) -> list[ChannelPermissionSnapshot]:

    async with AsyncSessionLocal() as session:
        result = await session.scalars(
            select(ChannelPermissionSnapshot, ).where(
                ChannelPermissionSnapshot.guild_id == guild_id,
                ChannelPermissionSnapshot.channel_id == channel_id))
        return list(result)


# Remove snapshots
async def remove_permission_snapshots(guild_id: int, channel_id: int) -> bool:

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            delete(ChannelPermissionSnapshot, ).where(
                ChannelPermissionSnapshot.guild_id == guild_id,
                ChannelPermissionSnapshot.channel_id == channel_id))

        await session.commit()
        return (getattr(result, "rowcount", 0) or 0) > 0


# Check snapshot existence
async def has_channel_snapshots(guild_id: int, channel_id: int) -> bool:

    async with AsyncSessionLocal() as session:
        result = await session.scalar(
            select(ChannelPermissionSnapshot.channel_id, ).where(
                ChannelPermissionSnapshot.guild_id == guild_id,
                ChannelPermissionSnapshot.channel_id == channel_id).limit(1))
        return result is not None


# Fetch snapshot channels
async def get_snapshot_channels(guild_id: int, ) -> list[int]:

    async with AsyncSessionLocal() as session:
        result = await session.scalars(
            select(distinct(ChannelPermissionSnapshot.channel_id)).where(
                ChannelPermissionSnapshot.guild_id == guild_id))
        return list(result, )


# Snapshot permissions
async def snapshot_channel_permissions(channel: discord.abc.GuildChannel,
                                       permissions: list[str]) -> None:

    guild = channel.guild
    roles = await get_target_roles(guild, )
    snapshots = []
    for role in roles:
        overwrite = channel.overwrites_for(role, )
        for permission in permissions:
            snapshots.append(
                (role.id, permission, getattr(overwrite, permission)))
    await create_permission_snapshots(guild.id, channel.id, snapshots)


# Apply permissions
async def apply_channel_permissions(channel: discord.abc.GuildChannel,
                                    permissions: dict[str, bool | None], *,
                                    reason: str) -> None:

    guild = channel.guild
    roles = await get_target_roles(guild, )
    for role in roles:
        overwrite = channel.overwrites_for(role, )
        for (permission, value) in permissions.items():
            setattr(overwrite, permission, value)
        if isinstance(channel, discord.ForumChannel):

            if "send_messages" in permissions:
                overwrite.create_public_threads = (
                    permissions["send_messages"])
                overwrite.create_private_threads = (
                    permissions["send_messages"])

        try:
            await safe_set_permissions(channel,
                                       role,
                                       overwrite=overwrite,
                                       reason=reason)

        except discord.HTTPException:
            continue


# Restore permissions
async def restore_channel_permissions(channel: discord.abc.GuildChannel, *,
                                      reason: str) -> bool:
    guild = channel.guild
    snapshots = await get_permission_snapshots(guild.id, channel.id)
    if not snapshots:
        return False
    grouped: dict[int, list[ChannelPermissionSnapshot]] = {}
    for snapshot in snapshots:
        grouped.setdefault(snapshot.target_id, []).append(snapshot, )
    for (target_id, entries) in grouped.items():
        role = guild.get_role(target_id)
        if role is None:
            continue

        overwrite = channel.overwrites_for(role)

        for entry in entries:
            setattr(overwrite, entry.permission_name, entry.permission_value)

        try:
            if overwrite.is_empty():
                await safe_set_permissions(channel,
                                           role,
                                           overwrite=None,
                                           reason=reason)
            else:
                await safe_set_permissions(channel,
                                           role,
                                           overwrite=overwrite,
                                           reason=reason)
        except discord.HTTPException:
            continue
    await remove_permission_snapshots(guild.id, channel.id)
    return True
