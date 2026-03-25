import discord
from discord import app_commands
from discord.ext import commands

from utils.permissions.base_admin import BaseAdminCog
from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS

from db.db_helpers.tempban import (
    get_active_tempbans,
    set_tempban_role,
    get_tempban_role,
    add_tempban,
    remove_tempban,
    is_tempbanned,
)


class Tempban(BaseAdminCog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    # =========================================================
    # UTILITIES
    # =========================================================
    async def resolve_member(self, ctx, user_input):
        if isinstance(user_input, discord.Member):
            return user_input

        ref = ctx.message.reference
        if not user_input and ref:
            if isinstance(ref.resolved, discord.Message):
                return ctx.guild.get_member(ref.resolved.author.id)

        if user_input:
            try:
                return await commands.MemberConverter().convert(ctx, user_input)
            except commands.BadArgument:
                return None

        return None

    async def _validate_target(self, ctx, target):
        guild = ctx.guild
        moderator = ctx.author
        bot_member = guild.me

        if not isinstance(target, discord.Member):
            return "Invalid user."

        if target == moderator:
            return "You cannot target yourself."

        if target == guild.owner:
            return "You cannot target the server owner."

        if target == bot_member:
            return "You cannot target me."

        if not bot_member.guild_permissions.manage_roles:
            return "I do not have permission to manage roles."

        if moderator != guild.owner:
            if target.guild_permissions.administrator:
                return "You cannot modify another administrator."

            if target.top_role >= moderator.top_role:
                return "You cannot modify a member with equal or higher role."

        if bot_member.top_role <= target.top_role:
            return "I cannot manage this member due to role hierarchy."

        return None

    async def _cleanup(self, ctx):
        try:
            await ctx.message.delete()
        except (discord.Forbidden, discord.NotFound):
            pass

    # =========================================================
    # SLASH COMMANDS
    # =========================================================

    @app_commands.command(name="tempban_list", description="List active tempbans")
    async def tempban_list(self, interaction: discord.Interaction):

        guild = interaction.guild
        if guild is None:
            return await interaction.response.send_message(
                embed=make_embed(
                    title="Invalid Context",
                    description="Use in a server.",
                    level="ERROR",
                ),
                ephemeral=True,
            )

        await interaction.response.defer(ephemeral=True)

        records = await get_active_tempbans(guild.id)

        if not records:
            return await interaction.followup.send(
                embed=make_embed(
                    title="Active Tempbans",
                    description=f"{EMOJIS['success']} No active tempbans.",
                    level="INFO",
                ),
                ephemeral=True,
            )

        records.sort(
            key=lambda r: (
                r.expires_at is None,
                r.expires_at.timestamp() if r.expires_at else float("inf"),
            )
        )

        entries = []
        for row in records:
            member = guild.get_member(row.user_id)
            moderator = guild.get_member(row.moderator_id)

            user_display = member.mention if member else f"`{row.user_id}`"
            mod_display = moderator.mention if moderator else f"`{row.moderator_id}`"
            expires = (
                f"<t:{int(row.expires_at.timestamp())}:R>"
                if row.expires_at
                else "Manual"
            )

            entries.append(
                f"{EMOJIS['red_dot']} **{user_display}**\n"
                f"{EMOJIS['arrow_point']} Moderator: {mod_display}\n"
                f"{EMOJIS['arrow_point']} Reason: {row.reason or 'No reason'}\n"
                f"{EMOJIS['arrow_point']} Expires: {expires}"
            )

        await interaction.followup.send(
            embed=make_embed(
                title="Active Tempbans",
                description="\n\n".join(entries[:10]),
                level="INFO",
            ),
            ephemeral=True,
        )

    @app_commands.command(name="tempban_role", description="Set tempban role")
    async def tempban_role(self, interaction: discord.Interaction, role: discord.Role):

        guild = interaction.guild
        if guild is None:
            return

        if role.is_default() or role.managed or role.permissions.administrator:
            return await interaction.response.send_message(
                embed=make_embed(
                    title="Invalid Role",
                    description="Unsafe role.",
                    level="ERROR",
                ),
                ephemeral=True,
            )

        if role >= guild.me.top_role:
            return await interaction.response.send_message(
                embed=make_embed(
                    title="Hierarchy Error",
                    description="Move bot role higher.",
                    level="ERROR",
                ),
                ephemeral=True,
            )

        await set_tempban_role(guild.id, role.id)

        await interaction.response.send_message(
            embed=make_embed(
                title="Tempban Role Set",
                description=f"{EMOJIS['success']} {role.mention} configured.",
                level="SUCCESS",
            ),
            ephemeral=True,
        )

    # =========================================================
    # PREFIX COMMANDS
    # =========================================================

    @commands.command(name="tempban")
    @commands.guild_only()
    async def tempban(self, ctx, user=None, *, reason=None):

        user = await self.resolve_member(ctx, user)
        if not user:
            return await ctx.reply(
                embed=make_embed(
                    title="Invalid User",
                    description="Provide a valid user.",
                    level="ERROR",
                )
            )

        error = await self._validate_target(ctx, user)
        if error:
            return await ctx.reply(
                embed=make_embed(
                    title="Permission Denied",
                    description=error,
                    level="ERROR",
                )
            )

        role_id = await get_tempban_role(ctx.guild.id)
        role = ctx.guild.get_role(role_id)

        if not role:
            return await ctx.reply(
                embed=make_embed(
                    title="Not Configured",
                    description="Tempban role not set.",
                    level="WARNING",
                )
            )

        await user.add_roles(role, reason=reason)

        await add_tempban(
            guild_id=ctx.guild.id,
            user_id=user.id,
            moderator_id=ctx.author.id,
            reason=reason or "No reason",
        )

        await ctx.reply(
            embed=make_embed(
                title="User Tempbanned",
                description=f"{EMOJIS['ban']} {user.mention}",
                level="SUCCESS",
            )
        )

        await self._cleanup(ctx)

    @commands.command(name="untempban")
    @commands.guild_only()
    async def untempban(self, ctx, user=None, *, reason=None):

        user = await self.resolve_member(ctx, user)
        if not user:
            return await ctx.reply(
                embed=make_embed(
                    title="Invalid User",
                    description="Provide a valid user.",
                    level="ERROR",
                )
            )

        if not await is_tempbanned(ctx.guild.id, user.id):
            return await ctx.reply(
                embed=make_embed(
                    title="Not Tempbanned",
                    description=f"{user.mention} is not tempbanned.",
                    level="WARNING",
                )
            )

        role_id = await get_tempban_role(ctx.guild.id)
        role = ctx.guild.get_role(role_id)

        if role:
            await user.remove_roles(role)

        await remove_tempban(
            guild_id=ctx.guild.id,
            user_id=user.id,
            moderator_id=ctx.author.id,
        )

        await ctx.reply(
            embed=make_embed(
                title="Tempban Removed",
                description=f"{EMOJIS['success']} {user.mention}",
                level="SUCCESS",
            )
        )

        await self._cleanup(ctx)


async def setup(bot: commands.Bot):
    await bot.add_cog(Tempban(bot))