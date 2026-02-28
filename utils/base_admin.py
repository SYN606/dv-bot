from discord.ext import commands
import discord

from utils.check_perms import is_bot_admin, is_bot_admin_ctx
from utils.embeds import make_embed
from utils.logging.mod_log import send_mod_log


class BaseAdminCog(commands.Cog):
    """
    Base class for all admin commands.
    Automatically enforces permissions + logs usage.
    """

    # PREFIX CHECK
    async def cog_check(self, ctx: commands.Context) -> bool:
        if not await is_bot_admin_ctx(ctx):
            await ctx.reply(
                embed=make_embed(
                    title="Permission Denied",
                    description="You are not allowed to use this command.",
                    level="ERROR",
                ),
                mention_author=False,
            )
            return False
        return True

    # SLASH CHECK
    async def interaction_check(self,
                                interaction: discord.Interaction) -> bool:
        if not await is_bot_admin(interaction):
            await interaction.response.send_message(
                embed=make_embed(
                    title="Permission Denied",
                    description="You are not allowed to use this command.",
                    level="ERROR",
                ),
                ephemeral=True,
            )
            return False
        return True

    # AUTO LOG PREFIX COMMANDS
    async def cog_after_invoke(self, ctx: commands.Context):
        if ctx.guild:
            await send_mod_log(
                guild=ctx.guild,
                category="CONFIG",
                title="Admin Command Used",
                description=f"`{ctx.command.qualified_name}` was executed.",
                level="INFO",
                actor=ctx.author,
            )

    # AUTO LOG SLASH COMMANDS
    async def on_app_command_completion(
        self,
        interaction: discord.Interaction,
        command: discord.app_commands.Command,
    ):
        if interaction.guild:
            await send_mod_log(
                guild=interaction.guild,
                category="CONFIG",
                title="Admin Slash Command Used",
                description=f"`/{command.qualified_name}` was executed.",
                level="INFO",
                actor=interaction.user,
            )
