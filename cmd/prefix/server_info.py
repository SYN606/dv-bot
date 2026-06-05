import time
import discord
from discord.ext import commands
from utils.permissions.base_admin import BaseAdminCog
from utils.permissions.check_perms import is_bot_admin_ctx
from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS


class AssetLinks(discord.ui.View):

    def __init__(self, guild: discord.Guild):
        super().__init__(timeout=None)
        if guild.icon:
            self.add_item(
                discord.ui.Button(label="Server Avatar",
                                  emoji="🖼️",
                                  url=guild.icon.url))
        if guild.banner:
            self.add_item(
                discord.ui.Button(label="Server Banner",
                                  emoji="🌌",
                                  url=guild.banner.url))
        if guild.splash:
            self.add_item(
                discord.ui.Button(label="Invite Splash",
                                  emoji="✨",
                                  url=guild.splash.url))
        if guild.discovery_splash:
            self.add_item(
                discord.ui.Button(label="Discovery Splash",
                                  emoji="🚀",
                                  url=guild.discovery_splash.url))


class ServerInfoView(discord.ui.View):

    def __init__(self, guild: discord.Guild, author_id: int):
        super().__init__(timeout=60)
        self.guild = guild
        self.author_id = author_id
        self.message: discord.Message | None = None
        self._cooldowns: dict[int, float] = {}
        self.COOLDOWN = 5

    async def interaction_check(self,
                                interaction: discord.Interaction) -> bool:
        if interaction.user.id != self.author_id:
            await interaction.response.send_message(embed=make_embed(
                title="Access Denied",
                description=
                f"{EMOJIS.get('fail', '❌')} You cannot use this interaction.",
                level="ERROR"),
                                                    ephemeral=True)
            return False
        return True

    def _check_cd(self, user_id: int) -> float:
        now = time.time()
        remaining = self.COOLDOWN - (now - self._cooldowns.get(user_id, 0))
        if remaining > 0:
            return remaining
        self._cooldowns[user_id] = now
        return 0

    @discord.ui.button(label="Statistics",
                       emoji="📊",
                       style=discord.ButtonStyle.secondary)
    async def more_stats(self, interaction: discord.Interaction,
                         _: discord.ui.Button):
        remaining = self._check_cd(interaction.user.id)
        if remaining > 0:
            await interaction.response.send_message(embed=make_embed(
                title="Cooldown",
                description=
                f"{EMOJIS.get('warning', '⚠️')} Wait `{remaining:.1f}s` before using this again.",
                level="WARNING"),
                                                    ephemeral=True)
            return

        g = self.guild
        humans = sum(1 for m in g.members if not m.bot)
        bots = (g.member_count or 0) - humans
        online = sum(1 for m in g.members
                     if m.status in (discord.Status.online,
                                     discord.Status.idle, discord.Status.dnd))

        desc = (
            f"{EMOJIS.get('green_dot', '🟢')} Members: `{g.member_count}`\n👨 Humans: `{humans}`\n🤖 Bots: `{bots}`\n📡 Online: `{online}`\n\n"
            f"📁 Channels: `{len(g.channels)}`\n💬 Text: `{len(g.text_channels)}`\n🔊 Voice: `{len(g.voice_channels)}`\n"
            f"🧵 Forums: `{len(g.forums)}`\n🎤 Stages: `{len(g.stage_channels)}`\n\n"
            f"🛡️ Roles: `{len(g.roles)}`\n😀 Emojis: `{len(g.emojis)}`\n📌 Stickers: `{len(g.stickers)}`"
        )
        embed = make_embed(title="📊 Server Statistics",
                           description=desc,
                           level="INFO")
        embed.set_footer(text=f"Requested by: {interaction.user}",
                         icon_url=interaction.user.display_avatar.url)
        await interaction.response.send_message(embed=embed, ephemeral=True)

    @discord.ui.button(label="Assets",
                       emoji="🖼️",
                       style=discord.ButtonStyle.secondary)
    async def assets(self, interaction: discord.Interaction,
                     _: discord.ui.Button):
        remaining = self._check_cd(interaction.user.id)
        if remaining > 0:
            await interaction.response.send_message(embed=make_embed(
                title="Cooldown",
                description=
                f"{EMOJIS.get('warning', '⚠️')} Wait `{remaining:.1f}s` before using this again.",
                level="WARNING"),
                                                    ephemeral=True)
            return

        g = self.guild
        assets = []
        if g.icon: assets.append("🖼️ Server Avatar")
        if g.banner: assets.append("🌌 Server Banner")
        if g.splash: assets.append("✨ Invite Splash")
        if g.discovery_splash: assets.append("🚀 Discovery Splash")
        if not assets: assets.append("No server assets available.")

        embed = make_embed(title="🖼️ Server Assets",
                           description="\n".join(assets),
                           level="INFO")
        embed.set_image(
            url=g.banner.url if g.banner else (g.icon.url if g.icon else None))
        embed.set_footer(text=f"Requested by: {interaction.user}",
                         icon_url=interaction.user.display_avatar.url)
        await interaction.response.send_message(embed=embed,
                                                view=AssetLinks(g),
                                                ephemeral=True)

    async def on_timeout(self) -> None:
        for item in self.children:
            if isinstance(item, discord.ui.Button): item.disabled = True
        if self.message:
            try:
                await self.message.edit(view=self)
            except (discord.NotFound, discord.Forbidden,
                    discord.HTTPException):
                pass


class ServerInfo(BaseAdminCog):

    def __init__(self, bot: commands.Bot):
        super().__init__()
        self.bot = bot

    @staticmethod
    async def is_admin_tier(ctx: commands.Context) -> bool:
        if ctx.guild is None or not isinstance(ctx.author, discord.Member):
            return False
        if ctx.author.id == ctx.guild.owner_id or ctx.author.guild_permissions.administrator:
            return True
        return await is_bot_admin_ctx(ctx)

    @commands.command(
        name="server-info",
        aliases=["serverinfo", "si"],
        help=
        "[Admin Only] View detailed structural configuration and server statistics."
    )
    @commands.guild_only()
    @commands.check(is_admin_tier)
    @discord.app_commands.default_permissions(
        administrator=True)  # <-- Fixed attribute name
    @commands.cooldown(1, 5, commands.BucketType.user)
    async def server_info(self, ctx: commands.Context):
        try:
            await ctx.message.delete()
        except (discord.Forbidden, discord.NotFound, discord.HTTPException):
            pass

        g = ctx.guild
        if g is None: return
        owner = g.owner
        created = discord.utils.format_dt(g.created_at, style="R")

        desc = (
            f"👑 Owner: {owner.mention if owner else 'Unknown'}\n🆔 ID: `{g.id}`\n📅 Created: {created}\n\n"
            f"👥 Members: `{g.member_count}`\n🚀 Boosts: `{g.premium_subscription_count or 0}` (Level {g.premium_tier})\n"
            f"🛡️ Verification: `{str(g.verification_level).title()}`\n🌍 Preferred Locale: `{g.preferred_locale}`"
        )
        embed = make_embed(title=f"{EMOJIS.get('announcement', '📢')} {g.name}",
                           description=desc,
                           level="SYSTEM")
        if g.icon: embed.set_thumbnail(url=g.icon.url)
        if g.banner: embed.set_image(url=g.banner.url)
        embed.set_footer(text=f"Executed by: {ctx.author}",
                         icon_url=ctx.author.display_avatar.url)

        view = ServerInfoView(guild=g, author_id=ctx.author.id)
        msg = await ctx.send(embed=embed, view=view)
        view.message = msg


async def setup(bot: commands.Bot):
    await bot.add_cog(ServerInfo(bot))
