from __future__ import annotations

import discord
from discord.ext import commands

from db.db_helpers.tag_helper import delete_tag_config, set_tag_config
from utils.startups.tag_autorole_service import TagAutoRoleService
from utils.core.embeds import make_embed
from utils.permissions.base_admin import BaseAdminCog, admin_command


class TagAutoRole(BaseAdminCog):

    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    @admin_command(name="settag")
    async def settag(self, ctx: commands.Context, tag: str,
                     role: discord.Role) -> None:
        """
        Binds your Level 3 Guild Tag (or text tag) to a reward role and runs an immediate server sync.
        Example usage: !settag MYTAG @TagRole
        """
        if ctx.guild is None:
            return

        if role >= ctx.guild.me.top_role:
            embed = make_embed(
                title="Role Hierarchy Error",
                description=
                f"I cannot manage {role.mention} because it is equal to or higher than my highest role.",
                level="ERROR",
                use_emoji=True,
            )
            await ctx.send(embed=embed)
            return

        await set_tag_config(ctx.guild.id, tag, role.id)

        loading_embed = make_embed(
            title="Setting Up Tag Auto-Role",
            description=
            f"Server tag set to `{tag}` with role {role.mention}.\nScanning existing members and updating roles...",
            level="INFO",
            use_emoji=True,
        )
        status_msg = await ctx.send(embed=loading_embed)

        scanned, updated = await TagAutoRoleService.sync_guild_members(
            ctx.guild, tag, role)

        success_embed = make_embed(
            title="Tag Auto-Role Configured",
            description=
            f"Server tag target set to `{tag}` with role {role.mention}.",
            level="SUCCESS",
            use_emoji=True,
            fields=[
                ("Members Scanned", str(scanned), True),
                ("Roles Updated", str(updated), True),
            ],
            footer=f"Requested by {ctx.author}",
        )
        await status_msg.edit(embed=success_embed)

    @admin_command(name="cleartag")
    async def cleartag(self, ctx: commands.Context) -> None:
        """Removes the server tag auto-role configuration."""
        if ctx.guild is None:
            return

        deleted = await delete_tag_config(ctx.guild.id)
        if deleted:
            embed = make_embed(
                title="Tag Configuration Cleared",
                description=
                "The tag auto-role configuration for this server has been successfully deleted.",
                level="SUCCESS",
                use_emoji=True,
            )
        else:
            embed = make_embed(
                title="No Configuration Found",
                description=
                "There is no active tag auto-role configuration set for this server.",
                level="WARNING",
                use_emoji=True,
            )
        await ctx.send(embed=embed)


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(TagAutoRole(bot))
