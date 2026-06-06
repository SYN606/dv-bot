import discord
from discord.ext import commands
from utils.permissions.base_admin import BaseAdminCog
from utils.core.embeds import make_embed


class Roles(BaseAdminCog):

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    def _find_role_by_name(
            self, guild: discord.Guild,
            name_query: str) -> tuple[discord.Role | None, list[str]]:
        query = name_query.lower().strip()

        exact_match = discord.utils.find(lambda r: r.name.lower() == query,
                                         guild.roles)
        if exact_match:
            return exact_match, []

        partials = [r for r in guild.roles if query in r.name.lower()]
        if len(partials) == 1:
            return partials[0], []

        return None, [r.name for r in partials[:5]]

    async def _prefix_validate(self, ctx: commands.Context,
                               target: discord.Member) -> bool:
        guild = ctx.guild
        actor = ctx.author

        if guild is None or not isinstance(actor, discord.Member):
            return False

        is_owner = actor.id == guild.owner_id
        is_admin = actor.guild_permissions.administrator
        has_manage_roles = actor.guild_permissions.manage_roles

        if not (is_owner or is_admin or has_manage_roles):
            await ctx.send(embed=make_embed(
                title="Permission Denied",
                description=
                "You must be the Server Owner, an Administrator, or have the `Manage Roles` permission to use this command.",
                level="ERROR",
                footer=f"Action by {actor}"))
            return False

        bot_member = guild.me
        if bot_member is None or not bot_member.guild_permissions.manage_roles:
            await ctx.send(embed=make_embed(
                title="Missing Permissions",
                description=
                "I require the `Manage Roles` workspace permission.",
                level="ERROR",
                footer=f"Action by {actor}"))
            return False

        if target.id == actor.id:
            await ctx.send(embed=make_embed(
                title="Invalid Target",
                description=
                "You cannot manage your own roles using override commands.",
                level="ERROR",
                footer=f"Action by {actor}"))
            return False

        if target.id == guild.owner_id:
            await ctx.send(embed=make_embed(
                title="Invalid Target",
                description=
                "Server Creator profiles cannot have roles managed via bot macros.",
                level="ERROR",
                footer=f"Action by {actor}"))
            return False

        if not is_owner and target.top_role >= actor.top_role:
            await ctx.send(embed=make_embed(
                title="Hierarchy Error",
                description=
                "Target profile maintains an equal or higher positioning relative to your tier.",
                level="ERROR",
                footer=f"Action by {actor}"))
            return False

        return True

    async def _cleanup(self, ctx: commands.Context) -> None:
        try:
            if ctx.message:
                await ctx.message.delete()
        except (discord.Forbidden, discord.NotFound, discord.HTTPException):
            pass


    @commands.group(name="role", invoke_without_command=True)
    @commands.guild_only()
    async def role_group(self, ctx: commands.Context):
        await ctx.send(embed=make_embed(
            title="Syntax Hint",
            description=
            "Correct formats:\n`!role add <user> <role name>`\n`!role remove <user> <role name>`",
            level="WARNING",
            footer=f"Action by {ctx.author}"))
        await self._cleanup(ctx)

    @role_group.command(name="add", aliases=["give", "a"])
    @commands.guild_only()
    async def add_prefix(self, ctx: commands.Context, member: discord.Member,
                         *, role_name: str):
        if not await self._prefix_validate(ctx, member):
            await self._cleanup(ctx)
            return

        guild = ctx.guild
        if guild is None or guild.me is None:
            await self._cleanup(ctx)
            return

        role, close_matches = self._find_role_by_name(guild, role_name)

        if not role:
            desc = "Could not discover a matching server role profile."
            if close_matches:
                desc += f"\n\n**Did you mean?**\n" + "\n".join(
                    f"- `{name}`" for name in close_matches)
            await ctx.send(embed=make_embed(title="Target Error",
                                            description=desc,
                                            level="ERROR",
                                            footer=f"Action by {ctx.author}"))
            await self._cleanup(ctx)
            return

        if role >= guild.me.top_role:
            await ctx.send(embed=make_embed(
                title="Hierarchy Exception",
                description=
                "Target role positioning resides above my execution tier capabilities.",
                level="ERROR",
                footer=f"Action by {ctx.author}"))
            await self._cleanup(ctx)
            return

        if role in member.roles:
            await ctx.send(embed=make_embed(
                title="State Collision",
                description=
                f"{member.mention} already possesses the {role.mention} role tracking field.",
                level="WARNING",
                footer=f"Action by {ctx.author}"))
            await self._cleanup(ctx)
            return

        try:
            await member.add_roles(
                role, reason=f"Text configuration macro by {ctx.author}")
            await ctx.send(embed=make_embed(
                title="Role Assigned",
                description=
                f"Successfully linked {role.mention} directly to {member.mention}.",
                level="SUCCESS",
                footer=f"Action by {ctx.author}"))
        except discord.Forbidden:
            await ctx.send(embed=make_embed(
                title="API Intercept",
                description=
                "Could not modify user profiles. Check role position rules.",
                level="ERROR",
                footer=f"Action by {ctx.author}"))

        await self._cleanup(ctx)

    @role_group.command(name="remove", aliases=["take", "r"])
    @commands.guild_only()
    async def remove_prefix(self, ctx: commands.Context,
                            member: discord.Member, *, role_name: str):
        if not await self._prefix_validate(ctx, member):
            await self._cleanup(ctx)
            return

        guild = ctx.guild
        if guild is None or guild.me is None:
            await self._cleanup(ctx)
            return

        role, close_matches = self._find_role_by_name(guild, role_name)

        if not role:
            desc = "Could not discover a matching server role profile."
            if close_matches:
                desc += f"\n\n**Did you mean?**\n" + "\n".join(
                    f"- `{name}`" for name in close_matches)
            await ctx.send(embed=make_embed(title="Target Error",
                                            description=desc,
                                            level="ERROR",
                                            footer=f"Action by {ctx.author}"))
            await self._cleanup(ctx)
            return

        if role >= guild.me.top_role:
            await ctx.send(embed=make_embed(
                title="Hierarchy Exception",
                description=
                "Target role tracking profiles scale above my permission authority layers.",
                level="ERROR",
                footer=f"Action by {ctx.author}"))
            await self._cleanup(ctx)
            return

        if role not in member.roles:
            await ctx.send(embed=make_embed(
                title="State Collision",
                description=
                f"{member.mention} does not hold active associations with **{role.name}**.",
                level="WARNING",
                footer=f"Action by {ctx.author}"))
            await self._cleanup(ctx)
            return

        try:
            await member.remove_roles(
                role, reason=f"Text configuration macro by {ctx.author}")
            await ctx.send(embed=make_embed(
                title="Role Revoked",
                description=
                f"Successfully dropped **{role.name}** reference tags from {member.mention}.",
                level="SUCCESS",
                footer=f"Action by {ctx.author}"))
        except discord.Forbidden:
            await ctx.send(embed=make_embed(
                title="API Intercept",
                description=
                "Could not clear user tracking fields. Check position dependencies.",
                level="ERROR",
                footer=f"Action by {ctx.author}"))

        await self._cleanup(ctx)


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(Roles(bot))
