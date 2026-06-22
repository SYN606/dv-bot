import discord
import re
import difflib
from discord.ext import commands
from typing import Optional, cast
from utils.permissions.base_admin import BaseAdminCog
from utils.core.embeds import make_embed


class Roles(BaseAdminCog):

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    async def _cleanup(self, ctx: commands.Context) -> None:
        try:
            await ctx.message.delete()
        except (discord.Forbidden, discord.HTTPException):
            pass

    def _find_role(self, guild: discord.Guild,
                   query: str) -> Optional[discord.Role]:
        match = re.search(r"<@&?(\d+)>", query) or re.search(r"^(\d+)$", query)
        if match: return guild.get_role(int(match.group(1)))

        query = query.lower().strip()
        roles = {r.name.lower(): r for r in guild.roles}
        if query in roles: return roles[query]

        matches = difflib.get_close_matches(query,
                                            list(roles.keys()),
                                            n=1,
                                            cutoff=0.6)
        return roles[matches[0]] if matches else None

    async def _prefix_validate(self, ctx: commands.Context,
                               target: discord.Member,
                               role: discord.Role) -> bool:
        guild = cast(discord.Guild, ctx.guild)
        author = cast(discord.Member, ctx.author)

        if not (author.id == guild.owner_id
                or author.guild_permissions.manage_roles):
            await ctx.send(embed=make_embed(
                title="Access Denied",
                description="Requires `Manage Roles`.",
                level="ERROR"),
                           delete_after=5)
            return False

        if guild.me.top_role.position <= target.top_role.position or guild.me.top_role.position <= role.position:
            await ctx.send(embed=make_embed(
                title="Hierarchy Error",
                description="Cannot manage this target/role due to hierarchy.",
                level="ERROR"),
                           delete_after=5)
            return False
        return True

    @commands.group(name="role", invoke_without_command=True)
    @commands.guild_only()
    async def role(self, ctx: commands.Context):
        await ctx.send(embed=make_embed(
            title="Role Management",
            description="Usage: `dv role add/remove <user> <role>`",
            level="WARNING"),
                       delete_after=10)
        await self._cleanup(ctx)

    @role.command(name="add", aliases=["give", "a"])
    @commands.guild_only()
    async def add(self, ctx: commands.Context, member: discord.Member, *,
                  role_query: str):
        guild = cast(discord.Guild, ctx.guild)
        role = self._find_role(guild, role_query)
        if not role or not await self._prefix_validate(ctx, member, role):
            if not role:
                await ctx.send(embed=make_embed(
                    title="Not Found",
                    description=f"Role `{role_query}` not found.",
                    level="ERROR"),
                               delete_after=5)
            return await self._cleanup(ctx)

        if role in member.roles:
            await ctx.send(embed=make_embed(
                title="No Change",
                description=f"{member.display_name} already has this role.",
                level="WARNING"),
                           delete_after=5)
        else:
            await member.add_roles(role, reason=f"Managed by {ctx.author}")
            await ctx.send(embed=make_embed(
                title="Success",
                description=f"Added {role.mention} to {member.mention}.",
                level="SUCCESS"),
                           delete_after=5)
        await self._cleanup(ctx)

    @role.command(name="remove", aliases=["take", "r"])
    @commands.guild_only()
    async def remove(self, ctx: commands.Context, member: discord.Member, *,
                     role_query: str):
        guild = cast(discord.Guild, ctx.guild)
        role = self._find_role(guild, role_query)
        if not role or not await self._prefix_validate(ctx, member, role):
            if not role:
                await ctx.send(embed=make_embed(
                    title="Not Found",
                    description=f"Role `{role_query}` not found.",
                    level="ERROR"),
                               delete_after=5)
            return await self._cleanup(ctx)

        if role not in member.roles:
            await ctx.send(embed=make_embed(
                title="No Change",
                description=f"{member.display_name} does not have this role.",
                level="WARNING"),
                           delete_after=5)
        else:
            await member.remove_roles(role, reason=f"Managed by {ctx.author}")
            await ctx.send(embed=make_embed(
                title="Success",
                description=f"Removed {role.mention} from {member.mention}.",
                level="SUCCESS"),
                           delete_after=5)
        await self._cleanup(ctx)


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(Roles(bot))
