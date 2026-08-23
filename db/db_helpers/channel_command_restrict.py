from typing import List, Tuple, cast
from db.models import Guild, RestrictedCommand, RestrictionScope
from tortoise.exceptions import IntegrityError


def _normalize(command_name: str) -> str:
    """Normalize command name for consistency."""
    return command_name.strip().lower()


async def restrict_command(guild_id: int,
                           channel_id: int,
                           command_name: str,
                           scope: str = "both") -> bool:
    """Restrict a command in a given guild channel.
    Returns True if created/updated, False if already exists with the same values.
    """
    command_name = _normalize(command_name)
    await Guild.get_or_create(guild_id=guild_id)
    try:
        enum_scope = RestrictionScope(scope.lower())
    except ValueError:
        enum_scope = RestrictionScope.BOTH
    try:
        _, created = await RestrictedCommand.get_or_create(
            guild_id=guild_id,
            channel_id=channel_id,
            command_name=command_name,
            defaults={"restriction_scope": enum_scope})
        return created
    except IntegrityError:
        return False


async def unrestrict_command(guild_id: int, channel_id: int,
                             command_name: str) -> bool:
    """Remove a restriction on a command for a given channel."""
    command_name = _normalize(command_name)
    deleted_count = await RestrictedCommand.filter(
        guild_id=guild_id, channel_id=channel_id,
        command_name=command_name).delete()
    return deleted_count > 0


async def is_command_restricted(guild_id: int, channel_id: int,
                                command_name: str) -> bool:
    """Check if a specific command is restricted in a channel."""
    command_name = _normalize(command_name)
    return await RestrictedCommand.filter(guild_id=guild_id,
                                          channel_id=channel_id,
                                          command_name=command_name).exists()


async def get_restricted_commands(guild_id: int, channel_id: int) -> List[str]:
    """Get a list of all restricted command names for a specific channel."""
    commands = await RestrictedCommand.filter(
        guild_id=guild_id, channel_id=channel_id).values_list("command_name",
                                                              flat=True)

    return cast(List[str], list(commands))


async def get_restricted_command_data(
        guild_id: int, channel_id: int) -> List[Tuple[str, str]]:
    """Fetch restricted command names along with their restriction scope."""
    records = await RestrictedCommand.filter(guild_id=guild_id,
                                             channel_id=channel_id).values(
                                                 "command_name",
                                                 "restriction_scope")

    return [(
        str(record["command_name"]),
        (record["restriction_scope"].value if isinstance(
            record["restriction_scope"], RestrictionScope) else str(
                record["restriction_scope"])),
    ) for record in records]


# Compatibility Aliases


async def disable_command(guild_id: int, channel_id: int,
                          command_name: str) -> bool:
    return await restrict_command(guild_id, channel_id, command_name)


async def enable_command(guild_id: int, channel_id: int,
                         command_name: str) -> bool:
    return await unrestrict_command(guild_id, channel_id, command_name)


async def get_disabled_commands(guild_id: int, channel_id: int) -> List[str]:
    return await get_restricted_commands(guild_id, channel_id)
