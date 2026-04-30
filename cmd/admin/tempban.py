import discord
from discord import app_commands
from discord.ext import commands

from utils.permissions.base_admin import BaseAdminCog
from utils.permissions.check_perms import is_bot_admin, is_bot_admin_ctx
from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS
from utils.logging.mod_log import send_mod_log

from db.db_helpers.tempban import (
    get_active_tempbans,
    set_tempban_role,
    get_tempban_role,
    add_tempban,
    remove_tempban,
    is_tempbanned,
)

from db.db_helpers.verification import get_verification_config


class Tempban(BaseAdminCog):

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    # =========================================================
    # EXTEND BASE PERMISSION (OWNER + ADMIN + BOT ADMIN)
    # =========================================================
    async def cog_check(self, ctx: commands.Context) -> bool:
        allowed = await super().cog_check(ctx)
        if allowed:
            return True

        return await is_bot_admin_ctx(ctx)

    async def interaction_check(self,
                                interaction: discord.Interaction) -> bool:
        allowed = await super().interaction_check(interaction)
        if allowed:
            return True

        return await is_bot_admin(interaction)

    # =========================================================
    # SLASH GROUP (UI LEVEL RESTRICTION)
    # =========================================================
    tempban_group = app_commands.Group(
        name="tempban-config",
        description="Manage tempban system",
        default_permissions=discord.Permissions(administrator=True),
    )

    # ------------------ SET ROLE ------------------
    @tempban_group.command(name="set", description="Set tempban role")
    async def set_role(self, interaction: discord.Interaction,
                       role: discord.Role):

        guild = interaction.guild
        if not guild:
            return

        if role >= guild.me.top_role:
            await interaction.response.send_message(
                embed=make_embed(
                    title="Hierarchy Error",
                    description="Role must be below bot role.",
                    level="ERROR",
                ),
                ephemeral=True,
            )
            return

        await set_tempban_role(guild.id, role.id)

        await interaction.response.send_message(
            embed=make_embed(
                title="Tempban Role Set",
                description=f"{EMOJIS['success']} {role.mention} configured.",
                level="SUCCESS",
            ),
            ephemeral=True,
        )

    # ------------------ LIST ------------------
    @tempban_group.command(name="list", description="List active tempbans")
    async def list_tempbans(self, interaction: discord.Interaction):

        guild = interaction.guild
        if not guild:
            return

        await interaction.response.defer(ephemeral=True)

        records = await get_active_tempbans(guild.id)

        if not records:
            await interaction.followup.send(
                embed=make_embed(
                    title="Active Tempbans",
                    description=f"{EMOJIS['success']} No active tempbans.",
                    level="INFO",
                ),
                ephemeral=True,
            )
            return

        entries = []
        for row in records:
            user = guild.get_member(row.user_id)
            mod = guild.get_member(row.moderator_id)

            entries.append(
                f"{EMOJIS['red_dot']} {user.mention if user else row.user_id}\n"
                f"Moderator: {mod.mention if mod else row.moderator_id}\n"
                f"Reason: {row.reason or 'No reason'}")

        await interaction.followup.send(
            embed=make_embed(
                title="Active Tempbans",
                description="\n\n".join(entries[:10]),
                level="INFO",
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
            await ctx.reply(embed=make_embed(
                title="Invalid User",
                description="Provide a valid user.",
                level="ERROR",
            ))
            return

        role_id = await get_tempban_role(ctx.guild.id)
        tempban_role = ctx.guild.get_role(role_id)

        if not tempban_role:
            await ctx.reply(embed=make_embed(
                title="Not Configured",
                description="Tempban role not set.",
                level="WARNING",
            ))
            return

        if tempban_role >= ctx.guild.me.top_role:
            await ctx.reply(embed=make_embed(
                title="Hierarchy Error",
                description="Tempban role must be below bot role.",
                level="ERROR",
            ))
            return

        config = await get_verification_config(ctx.guild.id)
        verified_role = ctx.guild.get_role(
            config.verified_role_id) if config else None

        try:
            if verified_role and verified_role in user.roles:
                await user.remove_roles(verified_role,
                                        reason="Tempban applied")

            await user.add_roles(tempban_role,
                                 reason=reason or "Tempban applied")

        except discord.Forbidden:
            await ctx.reply(embed=make_embed(
                title="Permission Error",
                description="I cannot manage roles due to hierarchy.",
                level="ERROR",
            ))
            return

        except discord.HTTPException:
            await ctx.reply(embed=make_embed(
                title="Discord Error",
                description="Failed to update roles.",
                level="ERROR",
            ))
            return

        await add_tempban(
            guild_id=ctx.guild.id,
            user_id=user.id,
            moderator_id=ctx.author.id,
            reason=reason or "No reason",
        )

        await ctx.reply(embed=make_embed(
            title="User Tempbanned",
            description=(f"{EMOJIS['ban']} {user.mention}\n"
                         f"Reason: {reason or 'No reason'}"),
            level="SUCCESS",
        ))

        await send_mod_log(
            guild=ctx.guild,
            category="MODERATION",
            title="User Tempbanned",
            description=
            (f"User: {user.mention} (`{user.id}`)\n"
             f"Moderator: {ctx.author.mention}\n"
             f"Tempban Role: {tempban_role.mention}\n"
             f"Removed Verified Role: {verified_role.mention if verified_role else 'None'}\n"
             f"Reason: {reason or 'No reason'}"),
            level="WARNING",
            actor=ctx.author,
        )

        await self._cleanup(ctx)

    @commands.command(name="untempban")
    @commands.guild_only()
    async def untempban(self, ctx, user=None, *, reason=None):

        user = await self.resolve_member(ctx, user)
        if not user:
            await ctx.reply(embed=make_embed(
                title="Invalid User",
                description="Provide a valid user.",
                level="ERROR",
            ))
            return

        if not await is_tempbanned(ctx.guild.id, user.id):
            await ctx.reply(embed=make_embed(
                title="Not Tempbanned",
                description=f"{user.mention} is not tempbanned.",
                level="WARNING",
            ))
            return

        role_id = await get_tempban_role(ctx.guild.id)
        tempban_role = ctx.guild.get_role(role_id)

        try:
            if tempban_role:
                await user.remove_roles(tempban_role)

            config = await get_verification_config(ctx.guild.id)
            if config:
                verified_role = ctx.guild.get_role(config.verified_role_id)
                if verified_role:
                    await user.add_roles(verified_role,
                                         reason="Tempban removed")

        except discord.Forbidden:
            await ctx.reply(embed=make_embed(
                title="Permission Error",
                description="I cannot update roles due to hierarchy.",
                level="ERROR",
            ))
            return

        except discord.HTTPException:
            await ctx.reply(embed=make_embed(
                title="Discord Error",
                description="Failed to update roles.",
                level="ERROR",
            ))
            return

        await remove_tempban(
            guild_id=ctx.guild.id,
            user_id=user.id,
            moderator_id=ctx.author.id,
        )

        await ctx.reply(embed=make_embed(
            title="Tempban Removed",
            description=f"{EMOJIS['success']} {user.mention}",
            level="SUCCESS",
        ))

        await send_mod_log(
            guild=ctx.guild,
            category="MODERATION",
            title="Tempban Removed",
            description=(f"User: {user.mention} (`{user.id}`)\n"
                         f"Moderator: {ctx.author.mention}\n"
                         f"Reason: {reason or 'No reason'}"),
            level="SUCCESS",
            actor=ctx.author,
        )

        await self._cleanup(ctx)

    # =========================================================
    # UTIL
    # =========================================================
    async def resolve_member(self, ctx, user_input):
        if isinstance(user_input, discord.Member):
            return user_input

        if user_input:
            try:
                return await commands.MemberConverter().convert(
                    ctx, user_input)
            except commands.BadArgument:
                return None

        return None

    async def _cleanup(self, ctx):
        try:
            await ctx.message.delete()
        except (discord.Forbidden, discord.NotFound):
            pass


async def setup(bot: commands.Bot):
    cog = Tempban(bot)
    await bot.add_cog(cog)

    if not bot.tree.get_command("tempban-config"):
        bot.tree.add_command(cog.tempban_group)
