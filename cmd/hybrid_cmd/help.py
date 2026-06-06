from __future__ import annotations
import os
import json
import logging
from dotenv import load_dotenv
import discord
from discord import app_commands
from discord.ext import commands
from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS
from utils.permissions.check_perms import is_bot_admin_ctx
from utils.permissions.protected_commands import PROTECTED_COMMANDS
from db.db_helpers.channel_command_restrict import get_restricted_commands

logger = logging.getLogger("Digital Vigital")

load_dotenv()
BANNER_GIF = os.getenv("HELP_BANNER_GIF")
JSON_PATH = os.path.join("db", "static_db", "helps.json")

CATEGORY_EMOJIS = {
    "admin": EMOJIS.get("moderation", "🛡️"),
    "channels": EMOJIS.get("channels", "📁"),
    "moderation": EMOJIS.get("moderation", "🔨"),
    "prefix": EMOJIS.get("ping", "✨"),
    "vc_modules": "🔊",
    "hybrid_cmd": "📖",
    "general": EMOJIS.get("arrow_point", "🔹")
}


class HelpDropdown(discord.ui.Select):

    def __init__(self, categories: list[dict], author_id: int,
                 ctx_prefix: str):
        self.categories_map = {cat["id"]: cat for cat in categories}
        self.author_id = author_id
        self.ctx_prefix = ctx_prefix

        options = [
            discord.SelectOption(
                label=cat["name"],
                value=cat["id"],
                emoji=cat.get("emoji") or CATEGORY_EMOJIS.get(cat["id"], "🔹"),
                description=cat.get(
                    "description",
                    f"Explore {cat['name']} command set.")[:100])
            for cat in categories if cat["commands"]
        ]
        super().__init__(placeholder="📂 Select a category to explore...",
                         min_values=1,
                         max_values=1,
                         options=options)

    async def callback(self, interaction: discord.Interaction):
        if interaction.user.id != self.author_id:
            await interaction.response.send_message(embed=make_embed(
                title="Access Denied",
                description="You cannot interact with this menu.",
                level="ERROR"),
                                                    ephemeral=True)
            return

        cat_id = self.values[0]
        category_data = self.categories_map[cat_id]
        cmds = category_data["commands"]

        emoji_header = category_data.get("emoji") or CATEGORY_EMOJIS.get(
            cat_id, "🔹")
        desc = f"### {emoji_header} {category_data['name']} Commands\n"

        arrow_emoji = EMOJIS.get("arrow_point", "🔹")

        for c in cmds:
            prefix_char = "/" if c.get("is_slash") else self.ctx_prefix
            aliases_str = f" *[Aliases: {', '.join(c['aliases'])}]*" if c.get(
                "aliases") else ""

            desc += f"{arrow_emoji} `{prefix_char} {c['name']}`{aliases_str}\n"
            desc += f"> {c.get('description', 'No description provided.')}\n"

            raw_usage = c.get("usage", "N/A")
            usage_str = raw_usage if c.get("is_slash") else raw_usage.replace(
                "!", f"{self.ctx_prefix} ")

            if c.get("is_slash") and raw_usage.startswith("/"):
                usage_str = f"/ {raw_usage[1:]}"

            desc += f"> **Usage:** `{usage_str}`\n\n"

        embed = make_embed(title="Help Center Directory",
                           description=desc,
                           level="INFO")
        if BANNER_GIF:
            embed.set_image(url=BANNER_GIF)

        embed.set_footer(
            text=f"Action by : {interaction.user} • Digital Vigital",
            icon_url=interaction.user.display_avatar.url)

        await interaction.response.edit_message(embed=embed)


class HelpDropdownView(discord.ui.View):

    def __init__(self, categories: list[dict], author_id: int,
                 ctx_prefix: str):
        super().__init__(timeout=60)
        self.message: discord.Message | None = None
        self.add_item(HelpDropdown(categories, author_id, ctx_prefix))

    async def on_timeout(self) -> None:
        for item in self.children:
            if isinstance(item, discord.ui.Select):
                item.disabled = True
        if self.message:
            try:
                await self.message.edit(view=self)
            except (discord.NotFound, discord.Forbidden,
                    discord.HTTPException):
                pass


class Help(commands.Cog):

    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self._static_data: dict = {"categories": []}

    def load_static_help(self) -> bool:
        try:
            if os.path.exists(JSON_PATH):
                with open(JSON_PATH, "r", encoding="utf-8") as f:
                    self._static_data = json.load(f)
                return True
            else:
                logger.error(
                    f"[HELP] Data asset dictionary not located at path: {JSON_PATH}"
                )
                return False
        except Exception as e:
            logger.error(
                f"[HELP] Exception parsed unpacking helps.json definition files: {e}"
            )
            return False

    @commands.Cog.listener()
    async def on_ready(self):
        self.load_static_help()

    async def _get_authorized_help_tree(self, guild: discord.Guild | None,
                                        channel: discord.abc.GuildChannel
                                        | None, is_admin: bool) -> list[dict]:
        restricted: set[str] = set()
        if guild and channel:
            try:
                restricted = set(await
                                 get_restricted_commands(guild.id, channel.id))
            except Exception:
                pass

        filtered_categories = []
        for category in self._static_data.get("categories", []):
            filtered_cmds = []

            for cmd in category.get("commands", []):
                base_name = cmd["name"].split()[0].lower()
                if base_name in restricted and not is_admin:
                    continue
                if cmd["name"].lower() in PROTECTED_COMMANDS and not is_admin:
                    continue

                filtered_cmds.append(cmd)

            if filtered_cmds:
                cat_copy = category.copy()
                cat_copy["commands"] = filtered_cmds
                filtered_categories.append(cat_copy)

        return filtered_categories

    @commands.hybrid_command(
        name="help",
        description=
        "Show structured and filtered interactive bot command directory.")
    @commands.cooldown(1, 3, commands.BucketType.user)
    async def help(self, ctx: commands.Context):
        self.load_static_help()

        is_admin = False
        if ctx.guild:
            try:
                is_admin = await is_bot_admin_ctx(ctx)
            except Exception:
                pass

        authorized_tree = await self._get_authorized_help_tree(
            ctx.guild, ctx.channel, is_admin)  # type: ignore
        total_visible = sum(len(cat["commands"]) for cat in authorized_tree)
        current_prefix = ctx.clean_prefix if ctx.clean_prefix else "!"
        system_emoji = EMOJIS.get("ping", "⚡")
        stats_desc = (
            f"{system_emoji} **System Status:** Operational\n"
            f"📂 **Available Modules:** `{len(authorized_tree)}`\n"
            f"📊 **Visible Commands:** `{total_visible}` (Filtered by Permissions)\n\n"
            f"Select a command module from the drop-down selection list below to view individual descriptions and structural execution choices syntax."
        )

        embed = make_embed(title="Digital Vigital • Help Center",
                           description=stats_desc,
                           level="INFO")
        if BANNER_GIF:
            embed.set_image(url=BANNER_GIF)

        # Added 'Action by' line syntax formatting structure to primary parent dashboard initialization reply state
        embed.set_footer(text=f"Action by : {ctx.author}",
                         icon_url=ctx.author.display_avatar.url)
        view = HelpDropdownView(authorized_tree, ctx.author.id, current_prefix)

        if ctx.interaction:
            await ctx.interaction.response.send_message(embed=embed,
                                                        view=view,
                                                        ephemeral=True)
            view.message = await ctx.interaction.original_response()
        else:
            try:
                await ctx.message.delete()
            except (discord.Forbidden, discord.NotFound,
                    discord.HTTPException):
                pass
            msg = await ctx.send(embed=embed, view=view)
            view.message = msg


async def setup(bot: commands.Bot):
    await bot.add_cog(Help(bot))
