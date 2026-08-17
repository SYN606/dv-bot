import difflib
import logging
import re

import discord
from discord.ext import commands

from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS
from utils.logging.mod_log import send_mod_log
from utils.permissions.base_admin import BaseAdminCog

logger = logging.getLogger("bot")


class Roles(BaseAdminCog):
    """Cog responsible for managing server roles and role assignments."""

    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    async def _cleanup(self, ctx: commands.Context) -> None:
        try:
            await ctx.message.delete()
        except (discord.Forbidden, discord.HTTPException):
            pass

    def _find_role(self, guild: discord.Guild,
                   query: str) -> discord.Role | None:
        match = re.search(r"<@&?(\d+)>", query) or re.search(r"^(\d+)$", query)
        if match:
            return guild.get_role(int(match.group(1)))

        cleaned_query = query.lower().strip()
        roles_map = {r.name.lower(): r for r in guild.roles}

        if cleaned_query in roles_map:
            return roles_map[cleaned_query]

        substring_matches = [
            r for name, r in roles_map.items() if cleaned_query in name
        ]
        if substring_matches:
            substring_matches.sort(key=lambda r: len(r.name))
            return substring_matches[0]

        matches = difflib.get_close_matches(cleaned_query,
                                            list(roles_map.keys()),
                                            n=1,
                                            cutoff=0.5)
        return roles_map[matches[0]] if matches else None

    async def _prefix_validate(self, ctx: commands.Context,
                               target: discord.Member,
                               role: discord.Role) -> bool:
        guild = ctx.guild
        if guild is None or not isinstance(ctx.author, discord.Member):
            return False

        author = ctx.author

        if not (author.id == guild.owner_id
                or author.guild_permissions.manage_roles):
            await ctx.send(
                embed=make_embed(
                    title="Access Denied",
                    description="Requires `Manage Roles` permission.",
                    level="ERROR",
                ),
                delete_after=5,
            )
            return False

        if author.id != guild.owner_id:
            if author.top_role.position <= target.top_role.position:
                await ctx.send(
                    embed=make_embed(
                        title="Hierarchy Error",
                        description=
                        ("Your highest role must be higher than the target's highest role."
                         ),
                        level="ERROR",
                    ),
                    delete_after=5,
                )
                return False

            if author.top_role.position <= role.position:
                await ctx.send(
                    embed=make_embed(
                        title="Hierarchy Error",
                        description=
                        ("Your highest role must be higher than the role you are managing."
                         ),
                        level="ERROR",
                    ),
                    delete_after=5,
                )
                return False

        if (guild.me.top_role.position <= target.top_role.position
                or guild.me.top_role.position <= role.position):
            await ctx.send(
                embed=make_embed(
                    title="Hierarchy Error",
                    description=
                    ("I cannot manage this target or role due to my position in the role hierarchy."
                     ),
                    level="ERROR",
                ),
                delete_after=5,
            )
            return False

        return True

    @commands.group(name="role", invoke_without_command=True)
    @commands.guild_only()
    async def role(self, ctx: commands.Context) -> None:
        prefix = ctx.clean_prefix
        warning_emoji = EMOJIS.get("warning") or "⚠️"
        await ctx.send(
            embed=make_embed(
                title="Role Management",
                description=(f"{warning_emoji} Usage:\n"
                             f"`{prefix}role add <user> <role>`\n"
                             f"`{prefix}role remove <user> <role>`"),
                level="WARNING",
            ),
            delete_after=10,
        )
        await self._cleanup(ctx)

    @role.command(name="add", aliases=["give", "a"])
    @commands.guild_only()
    async def add(self, ctx: commands.Context, member: discord.Member, *,
                  role_query: str) -> None:
        guild = ctx.guild
        if guild is None or not isinstance(ctx.author, discord.Member):
            return

        role = self._find_role(guild, role_query)
        if not role:
            await ctx.send(
                embed=make_embed(
                    title="Not Found",
                    description=f"Role `{role_query}` could not be found.",
                    level="ERROR",
                ),
                delete_after=5,
            )
            await self._cleanup(ctx)
            return

        if not await self._prefix_validate(ctx, member, role):
            await self._cleanup(ctx)
            return

        if role in member.roles:
            await ctx.send(
                embed=make_embed(
                    title="No Change",
                    description=f"{member.display_name} already has this role.",
                    level="WARNING",
                ),
                delete_after=5,
            )
        else:
            try:
                await member.add_roles(role, reason=f"Managed by {ctx.author}")
                success_emoji = EMOJIS.get("success") or "✅"
                await ctx.send(
                    embed=make_embed(
                        title="Success",
                        description=
                        f"{success_emoji} Added {role.mention} to {member.mention}.",
                        level="SUCCESS",
                    ),
                    delete_after=5,
                )

                try:
                    await send_mod_log(
                        guild=guild,
                        category="MODERATION",
                        title="Role Added",
                        description=
                        f"{ctx.author.mention} gave {role.mention} to {member.mention}",
                        level="INFO",
                        actor=ctx.author,
                        target=member,
                        extra_fields={"Role": role.name},
                    )
                except Exception:
                    logger.exception(
                        "Failed to send role addition moderation log")

            except discord.HTTPException:
                await ctx.send(embed=make_embed(
                    title="Execution Error",
                    description="Failed to apply role modifications.",
                    level="ERROR"),
                               delete_after=5)

        await self._cleanup(ctx)

    @role.command(name="remove", aliases=["take", "r"])
    @commands.guild_only()
    async def remove(self, ctx: commands.Context, member: discord.Member, *,
                     role_query: str) -> None:
        guild = ctx.guild
        if guild is None or not isinstance(ctx.author, discord.Member):
            return

        role = self._find_role(guild, role_query)
        if not role:
            await ctx.send(embed=make_embed(
                title="Not Found",
                description=f"Role `{role_query}` could not be found.",
                level="ERROR"),
                           delete_after=5)
            await self._cleanup(ctx)
            return

        if not await self._prefix_validate(ctx, member, role):
            await self._cleanup(ctx)
            return

        if role not in member.roles:
            await ctx.send(embed=make_embed(
                title="No Change",
                description=f"{member.display_name} does not have this role.",
                level="WARNING"),
                           delete_after=5)
        else:
            try:
                await member.remove_roles(role,
                                          reason=f"Managed by {ctx.author}")
                success_emoji = EMOJIS.get("success") or "✅"
                await ctx.send(embed=make_embed(
                    title="Success",
                    description=
                    f"{success_emoji} Removed {role.mention} from {member.mention}.",
                    level="SUCCESS"),
                               delete_after=5)

                try:
                    await send_mod_log(
                        guild=guild,
                        category="MODERATION",
                        title="Role Removed",
                        description=
                        f"{ctx.author.mention} removed {role.mention} from {member.mention}",
                        level="INFO",
                        actor=ctx.author,
                        target=member,
                        extra_fields={"Role": role.name})
                except Exception:
                    logger.exception(
                        "Failed to send role removal moderation log")

            except discord.HTTPException:
                await ctx.send(embed=make_embed(
                    title="Execution Error",
                    description="Failed to remove role modifications.",
                    level="ERROR"),
                               delete_after=5)

        await self._cleanup(ctx)


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(Roles(bot))
