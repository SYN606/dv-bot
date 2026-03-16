import discord
from discord.ext import commands

from utils.check_perms import is_bot_admin, is_bot_admin_ctx
from utils.embeds import make_embed
from utils.logging.mod_log import send_mod_log


class BaseAdminCog(commands.Cog):
    """
    Base class for all admin commands.

    Features:
    • Permission enforcement
    • Server owner bypass
    • Automatic moderation logging
    • Works for both prefix and slash commands
    """

    # =========================================================
    # PREFIX COMMAND PERMISSION CHECK
    # =========================================================
    async def cog_check(self, ctx: commands.Context) -> bool:

        guild = ctx.guild

        if guild is None:
            return True

        # Owner bypass
        if ctx.author.id == guild.owner_id:
            return True

        allowed = await is_bot_admin_ctx(ctx)

        if not allowed:

            try:
                await ctx.reply(
                    embed=make_embed(
                        title="Permission Denied",
                        description="You are not allowed to use this command.",
                        level="ERROR",
                    ),
                    mention_author=False,
                )
            except discord.HTTPException:
                pass

            return False

        return True

    # =========================================================
    # SLASH COMMAND PERMISSION CHECK
    # =========================================================
    async def interaction_check(
        self,
        interaction: discord.Interaction,
    ) -> bool:

        guild = interaction.guild

        if guild is None:
            return True

        # Owner bypass
        if interaction.user.id == guild.owner_id:
            return True

        allowed = await is_bot_admin(interaction)

        if not allowed:

            embed = make_embed(
                title="Permission Denied",
                description="You are not allowed to use this command.",
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

            return False

        return True

    # =========================================================
    # AUTO LOG PREFIX COMMANDS
    # =========================================================
    async def cog_after_invoke(self, ctx: commands.Context):

        if ctx.guild is None:
            return

        # Skip commands that failed
        if ctx.command_failed:
            return

        # Skip commands that disable logging
        if getattr(ctx.command, "skip_auto_log", False):
            return

        try:
            await send_mod_log(
                guild=ctx.guild,
                category="CONFIG",
                title="Admin Command Used",
                description=f"`{ctx.command.qualified_name}` was executed.", # type: ignore
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

        # Skip commands that disable logging
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
