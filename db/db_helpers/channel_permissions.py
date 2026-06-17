import asyncio
import discord
from sqlalchemy import delete, distinct, select
from sqlalchemy.dialects.postgresql import insert as postgres_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from db.engine import AsyncSessionLocal, DB_TYPE
from db.models import ChannelPermissionSnapshot
from db.db_helpers.verification import get_verification_config

# Descriptive type alias for channel handling consistency
GuildChannel = (
    discord.TextChannel
    | discord.ForumChannel
    | discord.VoiceChannel
    | discord.StageChannel
)


def build_insert_stmt(model, values: dict):
    if DB_TYPE == "postgres":
        return postgres_insert(model).values(**values)
    return sqlite_insert(model).values(**values)


async def safe_set_permissions(
    channel: discord.abc.GuildChannel,
    target: discord.Role,
    *,
    overwrite: discord.PermissionOverwrite | None,
    reason: str,
) -> bool:
    for _ in range(3):
        try:
            await channel.set_permissions(target, overwrite=overwrite, reason=reason)
            await asyncio.sleep(0.45)  # Global write-cooldown buffer
            return True
        except discord.HTTPException as error:
            if getattr(error, "status", None) == 429:
                retry_after = getattr(error, "retry_after", 2)
                await asyncio.sleep(float(retry_after))
                continue
            return False
    return False


async def get_target_roles(guild: discord.Guild) -> list[discord.Role]:
    roles: list[discord.Role] = [guild.default_role]
    verification = await get_verification_config(guild.id)
    if not verification:
        return roles

    verified_role_id = verification.verified_role_id
    if verified_role_id:
        verified_role = guild.get_role(verified_role_id)
        if verified_role and verified_role.id != guild.default_role.id:
            roles.append(verified_role)

    return roles


async def create_permission_snapshots(
    guild_id: int, channel_id: int, snapshots: list[tuple[int, str, bool | None]]
) -> None:
    if not snapshots:
        return

    async with AsyncSessionLocal() as session:
        for target_id, permission_name, permission_value in snapshots:
            stmt = build_insert_stmt(
                ChannelPermissionSnapshot,
                {
                    "guild_id": guild_id,
                    "channel_id": channel_id,
                    "target_id": target_id,
                    "permission_name": permission_name,
                    "permission_value": permission_value,
                },
            ).on_conflict_do_nothing(
                index_elements=[
                    ChannelPermissionSnapshot.guild_id,
                    ChannelPermissionSnapshot.channel_id,
                    ChannelPermissionSnapshot.target_id,
                    ChannelPermissionSnapshot.permission_name,
                ]
            )
            await session.execute(stmt)
        await session.commit()


async def get_permission_snapshots(
    guild_id: int, channel_id: int
) -> list[ChannelPermissionSnapshot]:
    async with AsyncSessionLocal() as session:
        result = await session.scalars(
            select(ChannelPermissionSnapshot).where(
                ChannelPermissionSnapshot.guild_id == guild_id,
                ChannelPermissionSnapshot.channel_id == channel_id,
            )
        )
        return list(result)


async def remove_permission_snapshots(guild_id: int, channel_id: int) -> bool:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            delete(ChannelPermissionSnapshot).where(
                ChannelPermissionSnapshot.guild_id == guild_id,
                ChannelPermissionSnapshot.channel_id == channel_id,
            )
        )
        await session.commit()
        return (getattr(result, "rowcount", 0) or 0) > 0


async def has_channel_snapshots(guild_id: int, channel_id: int) -> bool:
    async with AsyncSessionLocal() as session:
        return (
            await session.scalar(
                select(ChannelPermissionSnapshot.channel_id)
                .where(
                    ChannelPermissionSnapshot.guild_id == guild_id,
                    ChannelPermissionSnapshot.channel_id == channel_id,
                )
                .limit(1)
            )
            is not None
        )


async def get_snapshot_channels(guild_id: int) -> list[int]:
    async with AsyncSessionLocal() as session:
        result = await session.scalars(
            select(distinct(ChannelPermissionSnapshot.channel_id)).where(
                ChannelPermissionSnapshot.guild_id == guild_id
            )
        )
        return list(result)


async def snapshot_channel_permissions(
    channel: discord.abc.GuildChannel, permissions: list[str]
) -> None:
    guild = channel.guild
    roles = await get_target_roles(guild)
    snapshots = []

    for role in roles:
        overwrite = channel.overwrites_for(role)
        for permission in permissions:
            snapshots.append((role.id, permission, getattr(overwrite, permission)))

    await create_permission_snapshots(guild.id, channel.id, snapshots)


async def apply_channel_permissions(
    channel: discord.abc.GuildChannel,
    permissions: dict[str, bool | None],
    *,
    reason: str,
) -> bool:
    guild = channel.guild
    roles = await get_target_roles(guild)
    overall_success = True

    for role in roles:
        overwrite = channel.overwrites_for(role)
        for permission, value in permissions.items():
            setattr(overwrite, permission, value)

        if isinstance(channel, discord.ForumChannel) and "send_messages" in permissions:
            send_val = permissions.get("send_messages")
            overwrite.create_public_threads = send_val
            overwrite.create_private_threads = send_val

        status = await safe_set_permissions(
            channel, role, overwrite=overwrite, reason=reason
        )
        if not status:
            overall_success = False

    return overall_success


async def restore_channel_permissions(
    channel: discord.abc.GuildChannel, *, reason: str
) -> bool:
    guild = channel.guild
    snapshots = await get_permission_snapshots(guild.id, channel.id)
    if not snapshots:
        return False

    grouped: dict[int, list[ChannelPermissionSnapshot]] = {}
    for snapshot in snapshots:
        grouped.setdefault(snapshot.target_id, []).append(snapshot)

    overall_success = True
    for target_id, entries in grouped.items():
        role = guild.get_role(target_id)
        if role is None:
            continue

        overwrite = channel.overwrites_for(role)
        for entry in entries:
            setattr(overwrite, entry.permission_name, entry.permission_value)

        status = await safe_set_permissions(
            channel,
            role,
            overwrite=None if overwrite.is_empty() else overwrite,
            reason=reason,
        )
        if not status:
            overall_success = False

    if overall_success:
        await remove_permission_snapshots(guild.id, channel.id)

    return overall_success
