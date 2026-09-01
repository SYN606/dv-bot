from __future__ import annotations

import logging
import discord
from discord.ext import commands, tasks

from db.db_helpers.tag_helper import get_tag_config

logger = logging.getLogger("DigitalVigital")


class TagAutoRoleService:
    """Manages automatic tag role assignments and background monitoring tasks."""

    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot
        self._register_listeners()
        self.tag_watcher_task.start()

    def _register_listeners(self) -> None:
        self.bot.add_listener(self.on_presence_update, "on_presence_update")
        self.bot.add_listener(self.on_member_update, "on_member_update")
        self.bot.add_listener(self.on_user_update, "on_user_update")

    def stop(self) -> None:
        """Cancels background tasks gracefully."""
        self.tag_watcher_task.cancel()

    # PURE LOGIC HELPERS
    @staticmethod
    def has_tag(member: discord.Member, tag: str) -> bool:
        """
        Checks if a member displays the server tag across any of their profile fields:
        1. Guild Nickname / Server Display Name
        2. Global Account Username / Handle
        3. Global Display Name
        4. Custom Status Text
        """
        tag_lower = tag.lower()

        # 1. Check Guild Nickname / Server Display Name
        if tag_lower in member.display_name.lower():
            return True

        # 2. Check Account Handle / Username
        if tag_lower in member.name.lower():
            return True

        # 3. Check Global Display Name
        if member.global_name and tag_lower in member.global_name.lower():
            return True

        # 4. Check Custom Status Text
        if member.activities:
            for activity in member.activities:
                if isinstance(activity,
                              discord.CustomActivity) and activity.state:
                    if tag_lower in activity.state.lower():
                        return True

        return False

    @classmethod
    async def check_and_update_member(cls, member: discord.Member, tag: str,
                                      role: discord.Role) -> bool:
        """
        Assigns or removes the tag role based on member status and profile state.
        Returns True if a role modification occurred, False otherwise.
        """
        if member.bot or not member.guild:
            return False

        has_tag = cls.has_tag(member, tag)
        modified = False

        try:
            if has_tag and role not in member.roles:
                await member.add_roles(role,
                                       reason=f"Adapted server tag: {tag}")
                logger.info("Assigned role '%s' to %s for tag '%s'", role.name,
                            member, tag)
                modified = True
            elif not has_tag and role in member.roles:
                await member.remove_roles(role,
                                          reason=f"Removed server tag: {tag}")
                logger.info("Removed role '%s' from %s for tag '%s'",
                            role.name, member, tag)
                modified = True
        except (discord.Forbidden, discord.HTTPException) as exc:
            logger.debug("Failed to sync tag role for %s: %s", member, exc)

        return modified

    @classmethod
    async def sync_guild_members(cls, guild: discord.Guild, tag: str,
                                 role: discord.Role) -> tuple[int, int]:
        """
        Scans all members in a guild and updates roles.
        Returns a tuple of (total_members_scanned, roles_updated_count).
        """
        scanned = 0
        updated = 0

        for member in guild.members:
            if not member.bot:
                scanned += 1
                if await cls.check_and_update_member(member, tag, role):
                    updated += 1

        return scanned, updated

    # BACKGROUND WATCHER TASK
    @tasks.loop(minutes=15)
    async def tag_watcher_task(self) -> None:
        """Periodically scans all guilds to ensure member tag roles remain synced."""
        await self.bot.wait_until_ready()

        for guild in self.bot.guilds:
            config = await get_tag_config(guild.id)
            if not config:
                continue

            role = guild.get_role(config.role_id)
            if not role or role >= guild.me.top_role:
                continue

            await self.sync_guild_members(guild, config.tag, role)

    # REAL-TIME EVENT LISTENERS

    async def on_presence_update(self, before: discord.Member,
                                 after: discord.Member) -> None:
        """Triggers when custom status text changes."""
        if after.guild is None:
            return

        config = await get_tag_config(after.guild.id)
        if not config:
            return

        role = after.guild.get_role(config.role_id)
        if role and role < after.guild.me.top_role:
            await self.check_and_update_member(after, config.tag, role)

    async def on_member_update(self, before: discord.Member,
                               after: discord.Member) -> None:
        """Triggers when server nickname or guild profile details change."""
        if before.display_name != after.display_name or before.roles != after.roles:
            if after.guild is None:
                return

            config = await get_tag_config(after.guild.id)
            if not config:
                return

            role = after.guild.get_role(config.role_id)
            if role and role < after.guild.me.top_role:
                await self.check_and_update_member(after, config.tag, role)

    async def on_user_update(self, before: discord.User,
                             after: discord.User) -> None:
        """Triggers when a user updates their global Username or Global Display Name."""
        if before.name == after.name and before.global_name == after.global_name:
            return

        for guild in self.bot.guilds:
            member = guild.get_member(after.id)
            if not member:
                continue

            config = await get_tag_config(guild.id)
            if not config:
                continue

            role = guild.get_role(config.role_id)
            if role and role < guild.me.top_role:
                await self.check_and_update_member(member, config.tag, role)


async def startup(bot: commands.Bot) -> None:
    """Startup runner hook registered in bot initialization."""
    logger.info("[TAG AUTOROLE] Initializing tag autorole service...")
    setattr(bot, "tag_autorole_service", TagAutoRoleService(bot))
