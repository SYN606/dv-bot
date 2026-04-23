import discord
from discord.ext import commands

from utils.permissions.check_perms import is_bot_admin, is_bot_admin_ctx
from utils.core.embeds import make_embed
from utils.logging.mod_log import send_mod_log


class BaseAdminCog(commands.Cog):

    # PREFIX COMMAND PERMISSION CHECK
    async def cog_check(self, ctx: commands.Context) -> bool: # type: ignore

        guild = ctx.guild

        if guild is None:
            return True

        if not isinstance(ctx.author, discord.Member):
            return False

        # Owner bypass
        if ctx.author.id == guild.owner_id:
            return True

        if getattr(ctx.command, "requires_admin", False):
            if ctx.author.guild_permissions.administrator:
                return True

            await self._deny_prefix(ctx, strict=True)
            return False

        allowed = await is_bot_admin_ctx(ctx)

        if not allowed:
            await self._deny_prefix(ctx)
            return False

        return True

    # SLASH COMMAND PERMISSION CHECK
    async def interaction_check( # type: ignore
        self,
        interaction: discord.Interaction,
    ) -> bool:

        guild = interaction.guild

        if guild is None:
            return True

        if not isinstance(interaction.user, discord.Member):
            return False

        # Owner bypass
        if interaction.user.id == guild.owner_id:
            return True

        command = interaction.command

        if getattr(command, "requires_admin", False):
            if interaction.user.guild_permissions.administrator:
                return True

            await self._deny_slash(interaction, strict=True)
            return False

        allowed = await is_bot_admin(interaction)

        if not allowed:
            await self._deny_slash(interaction)
            return False

        return True

    # DENY HELPERS 
    async def _deny_prefix(self, ctx: commands.Context, strict: bool = False):

        description = (
            "You need **Administrator** permission to use this command."
            if strict
            else "You are not allowed to use this command."
        )

        try:
            await ctx.reply(
                embed=make_embed(
                    title="Permission Denied",
                    description=description,
                    level="ERROR",
                ),
                mention_author=False,
            )
        except discord.HTTPException:
            pass

    async def _deny_slash(
        self,
        interaction: discord.Interaction,
        strict: bool = False,
    ):

        description = (
            "You need **Administrator** permission to use this command."
            if strict
            else "You are not allowed to use this command."
        )

        embed = make_embed(
            title="Permission Denied",
            description=description,
            level="ERROR",
        )

        try:
            if interaction.response.is_done():
                await interaction.followup.send(
                    embed=embed,
                    ephemeral=True,
                )
            else:
                await interaction.response.send_message(
                    embed=embed,
                    ephemeral=True,
                )
        except discord.HTTPException:
            pass

    # AUTO LOG PREFIX COMMANDS
    async def cog_after_invoke(self, ctx: commands.Context):

        if ctx.guild is None:
            return

        if ctx.command_failed:
            return

        if getattr(ctx.command, "skip_auto_log", False):
            return

        try:
            await send_mod_log(
                guild=ctx.guild,
                category="CONFIG",
                title="Admin Command Used",
                description=f"`{ctx.command.qualified_name}` was executed.",  # type: ignore
                level="INFO",
                actor=ctx.author,
            )
        except Exception:
            pass

    # =========================================================
    # AUTO LOG SLASH COMMANDS
    # =========================================================
    @commands.Cog.listener()
    async def on_app_command_completion(
        self,
        interaction: discord.Interaction,
        command: discord.app_commands.Command,
    ):

        guild = interaction.guild

        if guild is None:
            return

        if getattr(command, "skip_auto_log", False):
            return

        try:
            await send_mod_log(
                guild=guild,
                category="CONFIG",
                title="Admin Slash Command Used",
                description=f"`/{command.qualified_name}` was executed.",
                level="INFO",
                actor=interaction.user,
            )
        except Exception:
            pass