import discord
from discord.ext import commands
from typing import Optional
from utils.permissions.base_admin import BaseAdminCog
from utils.core.embeds import make_embed


class Roles(BaseAdminCog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    def _find_role_by_name(
        self, guild: discord.Guild, query: str
    ) -> tuple[Optional[discord.Role], list[str]]:
        query = query.lower().strip()
        exact = discord.utils.find(lambda r: r.name.lower() == query, guild.roles)
        if exact:
            return exact, []

        partials = [r for r in guild.roles if query in r.name.lower()]
        return None, [r.name for r in partials[:5]]

    async def _prefix_validate(
        self, ctx: commands.Context, target: discord.Member
    ) -> bool:
        # 1. Ensure we have a guild and a member
        if not ctx.guild or not isinstance(ctx.author, discord.Member):
            return False

        # 2. Permission Check
        actor = ctx.author
        if not (
            actor.id == ctx.guild.owner_id
            or actor.guild_permissions.administrator
            or actor.guild_permissions.manage_roles
        ):
            await ctx.send(
                embed=make_embed(
                    title="Permission Denied",
                    description="Requires `Manage Roles` permission.",
                    level="ERROR",
                )
            )
            return False

        # 3. Hierarchy Check (using guild.me which is now safely checked)
        if not ctx.guild.me or ctx.guild.me.top_role <= target.top_role:
            await ctx.send(
                embed=make_embed(
                    title="Hierarchy Error",
                    description="I cannot manage this user.",
                    level="ERROR",
                )
            )
            return False

        return True

    async def _cleanup(self, ctx: commands.Context) -> None:
        try:
            if ctx.message:
                await ctx.message.delete()
        except discord.Forbidden, discord.HTTPException:
            pass

    @commands.group(name="role", invoke_without_command=True)
    @commands.guild_only()
    async def role_group(self, ctx: commands.Context):
        await ctx.send(
            embed=make_embed(
                title="Syntax",
                description="Use `!role add <user> <role>` or `!role remove <user> <role>`",
                level="WARNING",
            )
        )
        await self._cleanup(ctx)

    @role_group.command(name="add", aliases=["give"])
    @commands.guild_only()
    async def add_role(
        self, ctx: commands.Context, member: discord.Member, *, role_name: str
    ):
        # We know guild exists because of @commands.guild_only()
        guild = ctx.guild  # Type hint helper
        if not guild or not await self._prefix_validate(ctx, member):
            return

        role, matches = self._find_role_by_name(guild, role_name)

        if not role:
            await ctx.send(
                embed=make_embed(
                    title="Not Found",
                    description=f"Role `{role_name}` not found.",
                    level="ERROR",
                )
            )
            return

        try:
            await member.add_roles(role, reason=f"Action by {ctx.author}")
            await ctx.send(
                embed=make_embed(
                    title="Success",
                    description=f"Added {role.mention} to {member.mention}.",
                    level="SUCCESS",
                )
            )
        except discord.Forbidden:
            await ctx.send(
                embed=make_embed(
                    title="Error",
                    description="Missing permissions to add this role.",
                    level="ERROR",
                )
            )

        await self._cleanup(ctx)

    @role_group.command(name="remove", aliases=["take"])
    @commands.guild_only()
    async def remove_role(
        self, ctx: commands.Context, member: discord.Member, *, role_name: str
    ):
        guild = ctx.guild
        if not guild or not await self._prefix_validate(ctx, member):
            return

        role, matches = self._find_role_by_name(guild, role_name)

        if not role:
            await ctx.send(
                embed=make_embed(
                    title="Not Found",
                    description=f"Role `{role_name}` not found.",
                    level="ERROR",
                )
            )
            return

        try:
            await member.remove_roles(role, reason=f"Action by {ctx.author}")
            await ctx.send(
                embed=make_embed(
                    title="Success",
                    description=f"Removed {role.mention} from {member.mention}.",
                    level="SUCCESS",
                )
            )
        except discord.Forbidden:
            await ctx.send(
                embed=make_embed(
                    title="Error",
                    description="Missing permissions to remove this role.",
                    level="ERROR",
                )
            )

        await self._cleanup(ctx)


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(Roles(bot))
