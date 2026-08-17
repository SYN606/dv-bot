from __future__ import annotations

import json
import logging
import os
from typing import Any, Dict, List, Optional, Union

import discord
from discord import app_commands
from discord.ext import commands

from db.db_helpers.channel_command_restrict import get_restricted_commands
from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS
from utils.permissions.check_perms import is_bot_admin_ctx

logger = logging.getLogger("Digital Vigital")

BANNER_GIF = os.getenv("HELP_BANNER_GIF")
JSON_PATH = os.path.join("db", "static_db", "helps.json")

# Fully typed to work with EMOJIS.get() returning PartialEmoji or fallbacks
CATEGORY_EMOJIS: Dict[str, Union[str, discord.PartialEmoji, None]] = {
    "admin": EMOJIS.get("admin", EMOJIS.get("moderation", "🛡️")),
    "channels": EMOJIS.get("curved_arrow", "📁"),
    "moderation": EMOJIS.get("moderation", "🔨"),
    "prefix": EMOJIS.get("animated_ping", "✨"),
    "vc_modules": EMOJIS.get("peach_arrow", "🔊"),
    "hybrid_cmd": EMOJIS.get("curved_arrow", "📖"),
    "general": EMOJIS.get("arrow_point", "🔹"),
}


class HelpDropdown(discord.ui.Select):
    """Dropdown component for browsing command categories."""

    def __init__(
        self,
        categories: List[Dict[str, Any]],
        author_id: int,
        ctx_prefix: str,
    ) -> None:
        self.categories_map: Dict[str, Dict[str, Any]] = {
            cat["id"]: cat
            for cat in categories
        }
        self.author_id: int = author_id
        self.ctx_prefix: str = ctx_prefix.rstrip()

        options: List[discord.SelectOption] = []
        for cat in categories:
            if not cat.get("commands"):
                continue

            emoji_val = cat.get("emoji") or CATEGORY_EMOJIS.get(cat["id"], "🔹")
            options.append(
                discord.SelectOption(
                    label=cat["name"],
                    value=cat["id"],
                    emoji=emoji_val,
                    description=cat.get(
                        "description",
                        f"Explore {cat['name']} commands.")[:100],
                ))

        super().__init__(
            placeholder="📂 Select a category to explore...",
            min_values=1,
            max_values=1,
            options=options if options else [
                discord.SelectOption(label="No categories available",
                                     value="none")
            ],
            disabled=not options,
        )

    async def callback(self, interaction: discord.Interaction) -> None:
        if interaction.user.id != self.author_id:
            await interaction.response.send_message(
                f"{EMOJIS.get('fail', '❌')} You cannot interact with this menu.",
                ephemeral=True,
            )
            return

        cat_id = self.values[0]
        if cat_id == "none" or cat_id not in self.categories_map:
            await interaction.response.send_message(
                f"{EMOJIS.get('fail', '❌')} Category unavailable.",
                ephemeral=True,
            )
            return

        category_data = self.categories_map[cat_id]
        emoji = category_data.get("emoji") or CATEGORY_EMOJIS.get(cat_id, "🔹")
        arrow = EMOJIS.get("arrow_point", "➡️")

        desc = f"### {emoji} {category_data['name']} Module\n"
        desc += f"Browse the available commands below. Use `{self.ctx_prefix}help <command>` for specific syntax.\n\n"

        for c in category_data.get("commands", []):
            is_slash = c.get("is_slash", False)
            prefix = "/" if is_slash else self.ctx_prefix
            name = c["name"].lstrip("/")

            cmd_string = f"{prefix}{name}" if is_slash else f"{prefix} {name}"
            aliases = (f" *[Aliases: {', '.join(c['aliases'])}]*"
                       if c.get("aliases") else "")

            desc += (
                f"{arrow} **`{cmd_string}`**{aliases}\n"
                f"> *{c.get('description', 'No description provided.')}*\n\n")

        embed = make_embed(
            title="Digital Vigital • Command Directory",
            description=desc,
            level="INFO",
        )
        if BANNER_GIF:
            embed.set_image(url=BANNER_GIF)

        embed.set_footer(
            text=f"Requested by {interaction.user}",
            icon_url=interaction.user.display_avatar.url,
        )

        await interaction.response.edit_message(embed=embed)


class HelpDropdownView(discord.ui.View):
    """View container for the help dropdown menu."""

    def __init__(
        self,
        categories: List[Dict[str, Any]],
        author_id: int,
        ctx_prefix: str,
        timeout: float = 60.0,
    ) -> None:
        super().__init__(timeout=timeout)
        self.message: Optional[Union[discord.Message,
                                     discord.InteractionMessage]] = None
        self.add_item(HelpDropdown(categories, author_id, ctx_prefix))

    async def on_timeout(self) -> None:
        """Disable selection items when the view times out."""
        for item in self.children:
            if isinstance(item, (discord.ui.Select, discord.ui.Button)):
                item.disabled = True

        if self.message:
            try:
                await self.message.edit(view=self)
            except (discord.NotFound, discord.HTTPException):
                pass


class Help(commands.Cog):
    """Cog for generating directory menus and command usage instructions."""

    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot
        self._static_data: Dict[str, Any] = {"categories": []}

    def load_static_help(self) -> None:
        """Load help configuration structure from static JSON storage."""
        if os.path.exists(JSON_PATH):
            try:
                with open(JSON_PATH, "r", encoding="utf-8") as f:
                    self._static_data = json.load(f)
            except Exception as exc:
                logger.error("Failed to load helps.json: %s", exc)
                self._static_data = {"categories": []}
        else:
            logger.warning("helps.json file not found at path: %s", JSON_PATH)

    async def _get_authorized_help_tree(
        self,
        guild: Optional[discord.Guild],
        channel: Optional[Union[
            discord.abc.GuildChannel,
            discord.abc.PrivateChannel,
            discord.Thread,
        ]],
        is_admin: bool,
    ) -> List[Dict[str, Any]]:
        """Filter command categories according to guild permissions and restricted channel lists."""
        restricted: set[str] = set()
        if guild and channel:
            try:
                restricted = set(await
                                 get_restricted_commands(guild.id, channel.id))
            except Exception as exc:
                logger.error("Failed fetching restricted commands: %s", exc)

        filtered_categories: List[Dict[str, Any]] = []
        for cat in self._static_data.get("categories", []):
            filtered_cmds = [
                c for c in cat.get("commands", [])
                if (c["name"].split()[0].lower() not in restricted or is_admin)
            ]
            if filtered_cmds:
                cat_copy = cat.copy()
                cat_copy["commands"] = filtered_cmds
                filtered_categories.append(cat_copy)

        return filtered_categories

    @commands.hybrid_command(
        name="help",
        description="Show bot command directory.",
        aliases=["h"],
    )
    @app_commands.describe(
        command_name=
        "Specific command name to view detailed syntax and usage rules")
    async def help(
        self,
        ctx: commands.Context,
        command_name: Optional[str] = None,
    ) -> None:
        """Execute help menu dispatch."""
        self.load_static_help()

        raw_prefix = ctx.clean_prefix
        current_prefix = raw_prefix.rstrip()

        # Detailed Command Search
        if command_name:
            search_query = command_name.strip().lower()
            found_cmd: Optional[Dict[str, Any]] = None

            for cat in self._static_data.get("categories", []):
                for cmd in cat.get("commands", []):
                    names = [cmd["name"].lower()
                             ] + [a.lower() for a in cmd.get("aliases", [])]
                    if search_query in names:
                        found_cmd = cmd
                        break
                if found_cmd:
                    break

            if found_cmd:
                is_slash = found_cmd.get("is_slash", False)
                prefix = "/" if is_slash else current_prefix
                usage = found_cmd.get("usage", "").lstrip("/")

                usage_str = f"{prefix}{usage}" if is_slash else f"{prefix} {usage}"
                aliases_str = (", ".join([
                    f"`{a}`" for a in found_cmd.get("aliases", [])
                ]) if found_cmd.get("aliases") else "None")

                desc = (
                    f"### {EMOJIS.get('announcement', '📖')} Command Detail: `{found_cmd['name']}`\n\n"
                    f"**Description:** {found_cmd.get('description', 'No description.')}\n"
                    f"**Usage:** `{usage_str}`\n"
                    f"**Aliases:** {aliases_str}\n"
                    f"**Permissions:** `{found_cmd.get('permissions', 'None')}`"
                )

                embed = make_embed(
                    title="Help Center • Syntax Overview",
                    description=desc,
                    level="INFO",
                )
                embed.set_footer(
                    text=f"Action by: {ctx.author}",
                    icon_url=ctx.author.display_avatar.url,
                )

                if ctx.interaction:
                    if ctx.interaction.response.is_done():
                        await ctx.interaction.followup.send(embed=embed,
                                                            ephemeral=True)
                    else:
                        await ctx.interaction.response.send_message(
                            embed=embed, ephemeral=True)
                else:
                    await ctx.send(embed=embed)
                return

            notFound_msg = f"{EMOJIS.get('fail', '❌')} Command `{command_name}` not found in system directory."
            if ctx.interaction:
                if ctx.interaction.response.is_done():
                    await ctx.interaction.followup.send(notFound_msg,
                                                        ephemeral=True)
                else:
                    await ctx.interaction.response.send_message(notFound_msg,
                                                                ephemeral=True)
            else:
                await ctx.send(notFound_msg)
            return

        # Category Overview Menu
        is_admin = await is_bot_admin_ctx(ctx) if ctx.guild else False
        tree = await self._get_authorized_help_tree(
            ctx.guild,
            ctx.channel,  # type: ignore
            is_admin)

        desc = (
            f"### {EMOJIS.get('animated_ping', '✨')} Welcome to the Help Center\n"
            "Select a module from the dropdown below to view category-specific actions.\n\n"
            f"{EMOJIS.get('arrow_point', '➡️')} **Need specific info?** Use `{current_prefix} help <command_name>`\n"
            f"{EMOJIS.get('arrow_point', '➡️')} **System Status:** Operational"
        )

        embed = make_embed(
            title="Digital Vigital • Main Menu",
            description=desc,
            level="INFO",
        )
        if BANNER_GIF:
            embed.set_image(url=BANNER_GIF)

        embed.set_footer(text=f"Requested by {ctx.author}",
                         icon_url=ctx.author.display_avatar.url)

        view = HelpDropdownView(tree, ctx.author.id, raw_prefix)

        if ctx.interaction:
            if ctx.interaction.response.is_done():
                await ctx.interaction.followup.send(embed=embed, view=view)
                view.message = await ctx.interaction.original_response()
            else:
                await ctx.interaction.response.send_message(embed=embed,
                                                            view=view)
                view.message = await ctx.interaction.original_response()
        else:
            view.message = await ctx.send(embed=embed, view=view)


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(Help(bot))
