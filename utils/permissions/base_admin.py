import discord
from discord.ext import commands
from utils.permissions.check_perms import (is_bot_admin, is_bot_admin_ctx)
from utils.logging.mod_log import (send_mod_log)


def admin_command(*args, **kwargs):

    def decorator(func):
        func.admin_command = True
        return commands.command(*args, **kwargs)(func)

    return decorator


class BaseAdminCog(commands.Cog):

    async def _has_access(self,
                          *,
                          member: discord.Member,
                          guild: discord.Guild,
                          config_mode: bool = False,
                          interaction: discord.Interaction | None = None,
                          ctx: commands.Context | None = None) -> bool:
        # SERVER OWNER
        if member.id == guild.owner_id:
            return True
        perms = member.guild_permissions
        # ADMINISTRATOR
        if perms.administrator:
            return True
        # CONFIG MODE
        if config_mode and perms.manage_guild:
            return True
        # BOT ADMIN
        if interaction is not None:
            return await is_bot_admin(interaction)
        if ctx is not None:
            return await is_bot_admin_ctx(ctx)
        return False

    async def cog_check(  # type: ignore
            self, ctx: commands.Context) -> bool:
        guild = ctx.guild
        if guild is None:
            return True

        author = ctx.author

        if not isinstance(author, discord.Member):
            return False

        command = ctx.command

        if command is None:
            return True

        config_mode = getattr(command.callback, "config_command", False)

        admin_mode = getattr(command.callback, "admin_command", False)

        # NO ACCESS CONTROL
        if not config_mode and not admin_mode:
            return True

        return await self._has_access(member=author,
                                      guild=guild,
                                      config_mode=config_mode,
                                      ctx=ctx)

    async def interaction_check(  # type: ignore
            self, interaction: discord.Interaction) -> bool:

        guild = interaction.guild

        if guild is None:
            return True

        user = interaction.user

        if not isinstance(user, discord.Member):
            return False

        command = interaction.command

        if command is None:
            return True

        callback = getattr(command, "callback", None)

        config_mode = getattr(callback, "config_command", False)

        admin_mode = getattr(callback, "admin_command", False)

        # NO ACCESS CONTROL
        if not config_mode and not admin_mode:
            return True

        return await self._has_access(member=user,
                                      guild=guild,
                                      config_mode=config_mode,
                                      interaction=interaction)

    async def _auto_log(self,
                        *,
                        guild: discord.Guild,
                        actor: discord.abc.User,
                        command_name: str,
                        slash: bool = False):

        try:

            prefix = "/" if slash else ""

            await send_mod_log(guild=guild,
                               category="CONFIG",
                               title="Admin Command Used",
                               description=(f"`{prefix}{command_name}` "
                                            "was executed."),
                               level="INFO",
                               actor=actor)

        except Exception:
            pass

    async def cog_after_invoke(self, ctx: commands.Context):

        guild = ctx.guild

        if guild is None:
            return

        if ctx.command_failed:
            return

        command = ctx.command

        if (command is None or getattr(command, "skip_auto_log", False)):
            return

        await self._auto_log(guild=guild,
                             actor=ctx.author,
                             command_name=command.qualified_name,
                             slash=False)

    @commands.Cog.listener()
    async def on_app_command_completion(self, interaction: discord.Interaction,
                                        command: discord.app_commands.Command):

        guild = interaction.guild

        if guild is None:
            return

        if getattr(command, "skip_auto_log", False):
            return

        await self._auto_log(guild=guild,
                             actor=interaction.user,
                             command_name=command.qualified_name,
                             slash=True)
