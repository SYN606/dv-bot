from __future__ import annotations

from typing import Any, Callable, Iterable, Optional, Union
import discord
from discord.ext import commands

from utils.core.emojis import EMOJIS
from utils.core.embeds import make_embed
from utils.permissions.check_perms import (
    has_config_access,
    has_moderation_access,
    has_role_management_access,
    is_bot_admin,
    is_bot_admin_ctx,
)
from utils.logging.mod_log import send_mod_log


def admin_command(func_or_none: Any = None, *args: Any, **kwargs: Any) -> Any:
    """Decorator marking a command as requiring Guild Owner, Administrator, or Bot Admin authority."""
    def decorator(func: Any) -> Any:
        func.admin_command = True
        func._admin_command = True
        if args or kwargs:
            return commands.command(*args, **kwargs)(func)
        return func

    if callable(func_or_none):
        return decorator(func_or_none)
    if func_or_none is not None:
        args = (func_or_none, *args)
    return lambda func: decorator(func)


def config_command(func_or_none: Any = None, *args: Any, **kwargs: Any) -> Any:
    """Decorator marking a command as requiring server configuration authority."""
    def decorator(func: Any) -> Any:
        func.config_command = True
        if args or kwargs:
            return commands.command(*args, **kwargs)(func)
        return func

    if callable(func_or_none):
        return decorator(func_or_none)
    if func_or_none is not None:
        args = (func_or_none, *args)
    return lambda func: decorator(func)


def moderator_command(
    permission: Optional[Union[str, Iterable[str]]] = None,
) -> Callable[[Any], Any]:
    """Decorator marking a command as requiring moderation authority or a specific permission."""
    def decorator(func: Any) -> Any:
        func.mod_command = True
        func.required_permission = permission
        return func

    return decorator


def require_admin() -> Callable[[Any], Any]:
    """Check decorator ensuring caller possesses administrative authority."""
    async def predicate(ctx_or_interaction: Union[commands.Context, discord.Interaction]) -> bool:
        return await is_bot_admin(ctx_or_interaction)

    return commands.check(predicate)


def require_config() -> Callable[[Any], Any]:
    """Check decorator ensuring caller possesses server configuration authority."""
    async def predicate(ctx_or_interaction: Union[commands.Context, discord.Interaction]) -> bool:
        return await has_config_access(ctx_or_interaction)

    return commands.check(predicate)


def require_mod(permission: Optional[Union[str, Iterable[str]]] = None) -> Callable[[Any], Any]:
    """Check decorator ensuring caller possesses moderation authority."""
    async def predicate(ctx_or_interaction: Union[commands.Context, discord.Interaction]) -> bool:
        return await has_moderation_access(ctx_or_interaction, required_permission=permission)

    return commands.check(predicate)


class BaseAdminCog(commands.Cog):
    """
    Base cog providing centralized permission checks, audit logging,
    and standardized response formatting for administrative and moderation commands.
    """

    async def has_admin_access(
        self,
        target: Union[discord.Interaction, commands.Context, discord.Member, discord.User, Any],
    ) -> bool:
        """Check if target has Bot Admin, Administrator, or Owner access."""
        return await is_bot_admin(target)

    async def has_config_access(
        self,
        target: Union[discord.Interaction, commands.Context, discord.Member, discord.User, Any],
    ) -> bool:
        """Check if target has Server Configuration access."""
        return await has_config_access(target)

    async def has_mod_access(
        self,
        target: Union[discord.Interaction, commands.Context, discord.Member, discord.User, Any],
        required_permission: Optional[Union[str, Iterable[str]]] = None,
    ) -> bool:
        """Check if target has Moderation access or the specified permission(s)."""
        return await has_moderation_access(target, required_permission=required_permission)

    async def has_role_access(
        self,
        target: Union[discord.Interaction, commands.Context, discord.Member, discord.User, Any],
    ) -> bool:
        """Check if target has Role Management access."""
        return await has_role_management_access(target)

    async def _has_access(
        self,
        *,
        member: Union[discord.Member, discord.User, Any],
        guild: discord.Guild,
        config_mode: bool = False,
        required_permission: Optional[Union[str, Iterable[str]]] = None,
        interaction: discord.Interaction | None = None,
        ctx: commands.Context | None = None,
    ) -> bool:
        """Internal access evaluation preserved for backward compatibility."""
        if getattr(guild, "owner_id", None) == getattr(member, "id", None):
            return True

        perms = getattr(member, "guild_permissions", None)
        if perms is not None and getattr(perms, "administrator", False):
            return True

        if config_mode and perms is not None and getattr(perms, "manage_guild", False):
            return True

        target: Union[discord.Interaction, commands.Context, discord.Member] = (
            interaction if interaction is not None else (ctx if ctx is not None else member)
        )
        if await is_bot_admin(target):
            return True

        if required_permission and perms is not None:
            perm_list = [required_permission] if isinstance(required_permission, str) else list(required_permission)
            return any(getattr(perms, p, False) for p in perm_list)

        return False

    async def _reply(
        self,
        target: Union[commands.Context, discord.Interaction],
        title: str,
        description: str,
        level: str = "ERROR",
        ephemeral: bool = True,
        show_footer: bool = False,
        delete_after: Optional[float] = None,
    ) -> Optional[discord.Message]:
        """Send a standardized response embed handling both Context and Interaction across admin cogs."""
        footer_text = None
        footer_icon = None
        author = getattr(target, "user", None) or getattr(target, "author", None)
        if show_footer and author:
            footer_text = f"Action by: {author}"
            footer_icon = author.display_avatar.url

        embed = make_embed(
            title=title,
            description=description,
            level=level,
            footer=footer_text,
            footer_icon=footer_icon,
        )

        if isinstance(target, discord.Interaction):
            try:
                if target.response.is_done():
                    return await target.followup.send(embed=embed, ephemeral=ephemeral)
                await target.response.send_message(embed=embed, ephemeral=ephemeral)
                return None
            except Exception:
                return None

        # commands.Context / HybridContext
        if getattr(target, "interaction", None):
            interaction = target.interaction
            try:
                assert interaction is not None
                if interaction.response.is_done():
                    return await interaction.followup.send(embed=embed, ephemeral=ephemeral)
                await interaction.response.send_message(embed=embed, ephemeral=ephemeral)
                return None
            except Exception:
                pass

        if delete_after is not None:
            try:
                return await target.reply(embed=embed, mention_author=False, delete_after=delete_after)
            except (discord.NotFound, discord.HTTPException):
                try:
                    return await target.send(embed=embed, delete_after=delete_after)
                except Exception:
                    return None
        else:
            try:
                return await target.reply(embed=embed, mention_author=False)
            except (discord.NotFound, discord.HTTPException):
                try:
                    return await target.send(embed=embed)
                except Exception:
                    return None

    async def cog_check(self, ctx: commands.Context) -> bool:  # type: ignore
        guild = ctx.guild
        if guild is None:
            return True

        author = ctx.author
        if not isinstance(author, discord.Member) and not hasattr(author, "guild_permissions"):
            return False

        command = ctx.command
        if command is None:
            return True

        callback = getattr(command, "callback", command)
        config_mode = getattr(callback, "config_command", False) or getattr(command, "config_command", False)
        admin_mode = getattr(callback, "admin_command", False) or getattr(command, "admin_command", False)
        mod_mode = getattr(callback, "mod_command", False) or getattr(command, "mod_command", False)
        required_perm = getattr(callback, "required_permission", None) or getattr(command, "required_permission", None)

        # Allow pass-through if no access restrictions defined
        if not config_mode and not admin_mode and not mod_mode and not required_perm:
            return True

        if mod_mode or required_perm:
            return await self.has_mod_access(author, required_permission=required_perm)

        return await self._has_access(
            member=author,
            guild=guild,
            config_mode=config_mode,
            ctx=ctx,
        )

    async def interaction_check(self, interaction: discord.Interaction) -> bool:  # type: ignore
        guild = interaction.guild
        if guild is None:
            return True

        user = interaction.user
        if not isinstance(user, discord.Member) and not hasattr(user, "guild_permissions"):
            return False

        command = interaction.command
        if command is None:
            return True

        callback = getattr(command, "callback", None)
        config_mode = getattr(callback, "config_command", False) or getattr(command, "config_command", False)
        admin_mode = getattr(callback, "admin_command", False) or getattr(command, "admin_command", False)
        mod_mode = getattr(callback, "mod_command", False) or getattr(command, "mod_command", False)
        required_perm = getattr(callback, "required_permission", None) or getattr(command, "required_permission", None)

        # Allow pass-through if no access restrictions defined
        if not config_mode and not admin_mode and not mod_mode and not required_perm:
            return True

        allowed = False
        if mod_mode or required_perm:
            allowed = await self.has_mod_access(user, required_permission=required_perm)
        else:
            allowed = await self._has_access(
                member=user,
                guild=guild,
                config_mode=config_mode,
                interaction=interaction,
            )

        if not allowed:
            try:
                embed = make_embed(
                    title="Permission Denied",
                    description=f"{EMOJIS.get('fail', '❌')} You lack the required administrative or moderation permissions to execute this command.",
                    level="ERROR",
                )
                if interaction.response.is_done():
                    await interaction.followup.send(embed=embed, ephemeral=True)
                else:
                    await interaction.response.send_message(embed=embed, ephemeral=True)
            except Exception:
                pass
            return False

        return True

    async def cog_command_error(self, ctx: commands.Context, error: Exception) -> None:
        """Catches CheckFailure and provides an informative embed response."""
        if isinstance(error, commands.CheckFailure):
            try:
                embed = make_embed(
                    title="Permission Denied",
                    description=f"{EMOJIS.get('fail', '❌')} You lack the required permissions to execute this command.",
                    level="ERROR",
                )
                if ctx.interaction:
                    if ctx.interaction.response.is_done():
                        await ctx.interaction.followup.send(embed=embed, ephemeral=True)
                    else:
                        await ctx.interaction.response.send_message(embed=embed, ephemeral=True)
                else:
                    try:
                        await ctx.reply(embed=embed, mention_author=False)
                    except Exception:
                        await ctx.send(embed=embed)
            except Exception:
                pass
            return

        # Let unhandled errors bubble up to global command error handler
        raise error

    async def _auto_log(
        self,
        *,
        guild: discord.Guild,
        actor: discord.abc.User,
        command_name: str,
        slash: bool = False,
    ) -> None:
        try:
            prefix = "/" if slash else ""
            await send_mod_log(
                guild=guild,
                category="CONFIG",
                title="Admin Command Used",
                description=f"`{prefix}{command_name}` was executed.",
                level="INFO",
                actor=actor,
            )
        except Exception:
            pass

    async def cog_after_invoke(self, ctx: commands.Context) -> None:
        guild = ctx.guild
        if guild is None:
            return

        if ctx.command_failed:
            return

        command = ctx.command
        if command is None or getattr(command, "skip_auto_log", False):
            return

        await self._auto_log(
            guild=guild,
            actor=ctx.author,
            command_name=command.qualified_name,
            slash=False,
        )

    @commands.Cog.listener()
    async def on_app_command_completion(
        self,
        interaction: discord.Interaction,
        command: discord.app_commands.Command,
    ) -> None:
        guild = interaction.guild
        if guild is None:
            return

        # Every BaseAdminCog receives completions for every slash command.
        if command.binding is not self:
            return
        # Hybrid commands already log through cog_after_invoke.
        if isinstance(getattr(command, "wrapped", None), commands.HybridCommand):
            return

        if getattr(command, "skip_auto_log", False):
            return

        await self._auto_log(
            guild=guild,
            actor=interaction.user,
            command_name=command.qualified_name,
            slash=True,
        )


__all__ = [
    "admin_command",
    "config_command",
    "moderator_command",
    "require_admin",
    "require_config",
    "require_mod",
    "BaseAdminCog",
]
