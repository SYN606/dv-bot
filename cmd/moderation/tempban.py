import discord

from discord import app_commands
from discord.ext import commands

from utils.permissions.base_admin import BaseAdminCog
from utils.permissions.check_perms import (
    is_bot_admin_ctx, )

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

from db.db_helpers.verification import (
    get_verification_config, )


class Tempban(BaseAdminCog):

    def __init__(
        self,
        bot: commands.Bot,
    ):
        self.bot = bot

    async def has_tempban_permission(
        self,
        ctx: commands.Context,
    ) -> bool:

        guild = ctx.guild

        if guild is None:
            return True

        author = ctx.author

        if not isinstance(
                author,
                discord.Member,
        ):
            return False

        # SERVER OWNER
        if author.id == guild.owner_id:
            return True

        perms = (author.guild_permissions)

        # SERVER ADMINISTRATOR
        if perms.administrator:
            return True

        # BOT ADMIN
        return await is_bot_admin_ctx(ctx, )

    async def resolve_member(
        self,
        ctx,
        user_input,
    ):

        if isinstance(
                user_input,
                discord.Member,
        ):
            return user_input

        if user_input:

            try:

                return await commands.MemberConverter().convert(
                    ctx,
                    user_input,
                )

            except commands.BadArgument:
                return None

        return None

    async def _cleanup(
        self,
        ctx,
    ):

        try:
            await ctx.message.delete()

        except (
                discord.Forbidden,
                discord.NotFound,
        ):
            pass

    tempban_group = app_commands.Group(
        name="tempban-config",
        description="Manage tempban system",
        default_permissions=discord.Permissions(administrator=True, ),
    )

    @tempban_group.command(
        name="set",
        description="Set tempban role",
    )
    async def set_role(
        self,
        interaction: discord.Interaction,
        role: discord.Role,
    ):

        guild = interaction.guild

        if guild is None:
            return

        if guild.me is None:
            return

        if (role >= guild.me.top_role):

            await interaction.response.send_message(
                embed=make_embed(
                    title="Hierarchy Error",
                    description=("Role must be below "
                                 "bot role."),
                    level="ERROR",
                ),
                ephemeral=True,
            )

            return

        await set_tempban_role(
            guild.id,
            role.id,
        )

        await interaction.response.send_message(
            embed=make_embed(
                title="Tempban Role Set",
                description=(f"{EMOJIS['success']} "
                             f"{role.mention} configured."),
                level="SUCCESS",
            ),
            ephemeral=True,
        )

    @tempban_group.command(
        name="list",
        description="List active tempbans",
    )
    async def list_tempbans(
        self,
        interaction: discord.Interaction,
    ):

        guild = interaction.guild

        if guild is None:
            return

        await interaction.response.defer(ephemeral=True, )

        records = await get_active_tempbans(guild.id, )

        if not records:

            await interaction.followup.send(
                embed=make_embed(
                    title="Active Tempbans",
                    description=(f"{EMOJIS['success']} "
                                 "No active tempbans."),
                    level="INFO",
                ),
                ephemeral=True,
            )

            return

        entries = []

        for row in records:

            user = guild.get_member(row.user_id, )

            mod = guild.get_member(row.moderator_id, )

            entries.append((f"{EMOJIS['red_dot']} "
                            f"{user.mention if user else row.user_id}\n"
                            f"Moderator: "
                            f"{mod.mention if mod else row.moderator_id}\n"
                            f"Reason: "
                            f"{row.tempban_reason or 'No reason'}"))

        await interaction.followup.send(
            embed=make_embed(
                title="Active Tempbans",
                description="\n\n".join(entries[:10], ),
                level="INFO",
            ),
            ephemeral=True,
        )

    @commands.command(name="tempban", )
    @commands.guild_only()
    async def tempban(
        self,
        ctx: commands.Context,
        user=None,
        *,
        reason=None,
    ):

        if not await self.has_tempban_permission(ctx, ):

            return await ctx.reply(
                embed=make_embed(
                    title="Permission Denied",
                    description=(f"{EMOJIS['fail']} "
                                 "You do not have permission "
                                 "to use this command."),
                    level="ERROR",
                ),
                mention_author=False,
            )

        guild = ctx.guild

        if guild is None:
            return

        if guild.me is None:
            return

        user = await self.resolve_member(
            ctx,
            user,
        )

        if not user:

            await ctx.reply(
                embed=make_embed(
                    title="Invalid User",
                    description=("Provide a valid user."),
                    level="ERROR",
                ),
                mention_author=False,
            )

            return

        role_id = await get_tempban_role(guild.id, )

        if role_id is None:

            await ctx.reply(
                embed=make_embed(
                    title="Not Configured",
                    description=("Tempban role not set."),
                    level="WARNING",
                ),
                mention_author=False,
            )

            return

        tempban_role = guild.get_role(role_id, )

        if not tempban_role:

            await ctx.reply(
                embed=make_embed(
                    title="Role Missing",
                    description=("Configured tempban role "
                                 "no longer exists."),
                    level="ERROR",
                ),
                mention_author=False,
            )

            return

        if (tempban_role >= guild.me.top_role):

            await ctx.reply(
                embed=make_embed(
                    title="Hierarchy Error",
                    description=("Tempban role must be "
                                 "below bot role."),
                    level="ERROR",
                ),
                mention_author=False,
            )

            return

        config = await get_verification_config(guild.id, )

        verified_role = (guild.get_role(config.verified_role_id, )
                         if config and config.verified_role_id else None)

        # SEND DM
        try:

            embed = make_embed(
                title="You Were Tempbanned",
                description=(f"{EMOJIS['warning']} "
                             f"You were tempbanned in "
                             f"**{guild.name}**\n\n"
                             f"{EMOJIS['arrow_point']} "
                             f"Moderator: {ctx.author}\n"
                             f"{EMOJIS['arrow_point']} "
                             f"Reason: "
                             f"{reason or 'No reason'}"),
                level="WARNING",
            )

            await user.send(embed=embed, )

        except (
                discord.Forbidden,
                discord.HTTPException,
        ):
            pass

        try:

            if (verified_role and verified_role in user.roles):

                await user.remove_roles(
                    verified_role,
                    reason="Tempban applied",
                )

            await user.add_roles(
                tempban_role,
                reason=(reason or "Tempban applied"),
            )

        except discord.Forbidden:

            await ctx.reply(
                embed=make_embed(
                    title="Permission Error",
                    description=("I cannot manage roles "
                                 "due to hierarchy."),
                    level="ERROR",
                ),
                mention_author=False,
            )

            return

        except discord.HTTPException:

            await ctx.reply(
                embed=make_embed(
                    title="Discord Error",
                    description=("Failed to update roles."),
                    level="ERROR",
                ),
                mention_author=False,
            )

            return

        await add_tempban(
            guild_id=guild.id,
            user_id=user.id,
            moderator_id=ctx.author.id,
            reason=(reason or "No reason"),
        )

        await ctx.reply(
            embed=make_embed(
                title="User Tempbanned",
                description=(f"{EMOJIS['ban']} "
                             f"{user.mention}\n"
                             f"Reason: "
                             f"{reason or 'No reason'}"),
                level="SUCCESS",
            ),
            mention_author=False,
        )

        await send_mod_log(
            guild=guild,
            category="MODERATION",
            title="User Tempbanned",
            description=(
                f"User: {user.mention} "
                f"(`{user.id}`)\n"
                f"Moderator: "
                f"{ctx.author.mention}\n"
                f"Tempban Role: "
                f"{tempban_role.mention}\n"
                f"Removed Verified Role: "
                f"{verified_role.mention if verified_role else 'None'}\n"
                f"Reason: "
                f"{reason or 'No reason'}"),
            level="WARNING",
            actor=ctx.author,
        )

        await self._cleanup(ctx, )

    @commands.command(name="untempban", )
    @commands.guild_only()
    async def untempban(
        self,
        ctx: commands.Context,
        user=None,
        *,
        reason=None,
    ):

        if not await self.has_tempban_permission(ctx, ):

            return await ctx.reply(
                embed=make_embed(
                    title="Permission Denied",
                    description=(f"{EMOJIS['fail']} "
                                 "You do not have permission "
                                 "to use this command."),
                    level="ERROR",
                ),
                mention_author=False,
            )

        guild = ctx.guild

        if guild is None:
            return

        user = await self.resolve_member(
            ctx,
            user,
        )

        if not user:

            await ctx.reply(
                embed=make_embed(
                    title="Invalid User",
                    description=("Provide a valid user."),
                    level="ERROR",
                ),
                mention_author=False,
            )

            return

        if not await is_tempbanned(
                guild.id,
                user.id,
        ):

            await ctx.reply(
                embed=make_embed(
                    title="Not Tempbanned",
                    description=(f"{user.mention} "
                                 "is not tempbanned."),
                    level="WARNING",
                ),
                mention_author=False,
            )

            return

        role_id = await get_tempban_role(guild.id, )

        if role_id is None:

            await ctx.reply(
                embed=make_embed(
                    title="Not Configured",
                    description=("Tempban role not set."),
                    level="WARNING",
                ),
                mention_author=False,
            )

            return

        tempban_role = guild.get_role(role_id, )

        if not tempban_role:

            await ctx.reply(
                embed=make_embed(
                    title="Role Missing",
                    description=("Configured tempban role "
                                 "no longer exists."),
                    level="ERROR",
                ),
                mention_author=False,
            )

            return

        try:

            await user.remove_roles(tempban_role, )

            config = await get_verification_config(guild.id, )

            if (config and config.verified_role_id):

                verified_role = guild.get_role(config.verified_role_id, )

                if verified_role:

                    await user.add_roles(
                        verified_role,
                        reason="Tempban removed",
                    )

        except discord.Forbidden:

            await ctx.reply(
                embed=make_embed(
                    title="Permission Error",
                    description=("I cannot update roles "
                                 "due to hierarchy."),
                    level="ERROR",
                ),
                mention_author=False,
            )

            return

        except discord.HTTPException:

            await ctx.reply(
                embed=make_embed(
                    title="Discord Error",
                    description=("Failed to update roles."),
                    level="ERROR",
                ),
                mention_author=False,
            )

            return

        await remove_tempban(
            guild_id=guild.id,
            user_id=user.id,
            moderator_id=ctx.author.id,
        )

        await ctx.reply(
            embed=make_embed(
                title="Tempban Removed",
                description=(f"{EMOJIS['success']} "
                             f"{user.mention}"),
                level="SUCCESS",
            ),
            mention_author=False,
        )

        await send_mod_log(
            guild=guild,
            category="MODERATION",
            title="Tempban Removed",
            description=(f"User: {user.mention} "
                         f"(`{user.id}`)\n"
                         f"Moderator: "
                         f"{ctx.author.mention}\n"
                         f"Reason: "
                         f"{reason or 'No reason'}"),
            level="SUCCESS",
            actor=ctx.author,
        )

        await self._cleanup(ctx, )


async def setup(bot: commands.Bot, ):

    cog = Tempban(bot, )

    await bot.add_cog(cog, )

    if not bot.tree.get_command("tempban-config", ):

        bot.tree.add_command(cog.tempban_group, )
