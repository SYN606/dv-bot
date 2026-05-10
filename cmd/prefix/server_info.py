import time
import discord

from discord.ext import commands

from utils.permissions.base_admin import BaseAdminCog
from utils.permissions.check_perms import is_bot_admin_ctx
from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS


class ServerInfoView(discord.ui.View):
    def __init__(
        self,
        guild: discord.Guild,
        author_id: int,
    ):
        super().__init__(timeout=60)

        self.guild = guild
        self.author_id = author_id
        self.message: discord.Message | None = None

        self._cooldowns: dict[int, float] = {}

        self.COOLDOWN = 5

    async def interaction_check(
        self,
        interaction: discord.Interaction,
    ) -> bool:

        if interaction.user.id != self.author_id:
            await interaction.response.send_message(
                embed=make_embed(
                    title="Access Denied",
                    description=(
                        f"{EMOJIS.get('fail', '❌')} You cannot use this interaction."
                    ),
                    level="ERROR",
                ),
                ephemeral=True,
            )

            return False

        return True

    def _check_cd(
        self,
        user_id: int,
    ) -> float:

        now = time.time()

        last = self._cooldowns.get(user_id, 0)

        remaining = self.COOLDOWN - (now - last)

        if remaining > 0:
            return remaining

        self._cooldowns[user_id] = now

        return 0

    @discord.ui.button(
        label="Statistics",
        emoji="📊",
        style=discord.ButtonStyle.secondary,
    )
    async def more_stats(
        self,
        interaction: discord.Interaction,
        _: discord.ui.Button,
    ):

        remaining = self._check_cd(interaction.user.id)

        if remaining > 0:
            await interaction.response.send_message(
                embed=make_embed(
                    title="Cooldown",
                    description=(
                        f"{EMOJIS.get('warning', '⚠️')} "
                        f"Wait `{remaining:.1f}s` before using this again."
                    ),
                    level="WARNING",
                ),
                ephemeral=True,
            )

            return

        g = self.guild

        humans = sum(1 for m in g.members if not m.bot)

        bots = (g.member_count or 0) - humans

        online = sum(
            1
            for m in g.members
            if m.status
            in (
                discord.Status.online,
                discord.Status.idle,
                discord.Status.dnd,
            )
        )

        text_channels = len(g.text_channels)

        voice_channels = len(g.voice_channels)

        forum_channels = len(g.forums)

        stage_channels = len(g.stage_channels)

        total_channels = (
            text_channels + voice_channels + forum_channels + stage_channels
        )

        embed = make_embed(
            title="📊 Advanced Statistics",
            description=(
                f"{EMOJIS.get('green_dot', '🟢')} Members: "
                f"`{g.member_count}`\n"
                f"{EMOJIS.get('developer', '👨‍💻')} Humans: "
                f"`{humans}`\n"
                f"🤖 Bots: `{bots}`\n"
                f"{EMOJIS.get('ping', '📡')} Online: "
                f"`{online}`\n\n"
                f"{EMOJIS.get('folder', '📁')} Channels: "
                f"`{total_channels}`\n"
                f"• Text: `{text_channels}`\n"
                f"• Voice: `{voice_channels}`\n"
                f"• Forum: `{forum_channels}`\n"
                f"• Stage: `{stage_channels}`\n\n"
                f"{EMOJIS.get('moderation', '🛡️')} Roles: "
                f"`{len(g.roles)}`\n"
                f"😀 Emojis: "
                f"`{len(g.emojis)}` / `{g.emoji_limit}`\n"
                f"{EMOJIS.get('boost', '🚀')} Stickers: "
                f"`{len(g.stickers)}` / `{g.sticker_limit}`"
            ),
            level="INFO",
        )

        embed.set_footer(
            text=f"Action by: {interaction.user}",
            icon_url=interaction.user.display_avatar.url,
        )

        await interaction.response.send_message(
            embed=embed,
            ephemeral=True,
        )

    @discord.ui.button(
        label="Assets",
        emoji="🖼️",
        style=discord.ButtonStyle.secondary,
    )
    async def assets(
        self,
        interaction: discord.Interaction,
        _: discord.ui.Button,
    ):

        remaining = self._check_cd(interaction.user.id)

        if remaining > 0:
            await interaction.response.send_message(
                embed=make_embed(
                    title="Cooldown",
                    description=(
                        f"{EMOJIS.get('warning', '⚠️')} "
                        f"Wait `{remaining:.1f}s` before using this again."
                    ),
                    level="WARNING",
                ),
                ephemeral=True,
            )

            return

        g = self.guild

        embed = make_embed(
            title="🖼️ Server Assets",
            description=(
                f"{EMOJIS.get('arrow_point', '➜')} Icon: "
                f"{'Available' if g.icon else 'Missing'}\n"
                f"{EMOJIS.get('arrow_point', '➜')} Banner: "
                f"{'Available' if g.banner else 'Missing'}\n"
                f"{EMOJIS.get('arrow_point', '➜')} Splash: "
                f"{'Available' if g.splash else 'Missing'}\n"
                f"{EMOJIS.get('arrow_point', '➜')} Discovery Splash: "
                f"{'Available' if g.discovery_splash else 'Missing'}"
            ),
            level="INFO",
        )

        if g.banner:
            embed.set_image(url=g.banner.url)

        elif g.icon:
            embed.set_image(url=g.icon.url)

        embed.set_footer(
            text=f"Action by: {interaction.user}",
            icon_url=interaction.user.display_avatar.url,
        )

        await interaction.response.send_message(
            embed=embed,
            ephemeral=True,
        )

    async def on_timeout(self):

        for item in self.children:
            item.disabled = True  # type: ignore

        if self.message:
            try:
                await self.message.edit(view=self)

            except (
                discord.NotFound,
                discord.Forbidden,
                discord.HTTPException,
            ):
                pass


class ServerInfo(BaseAdminCog):
    def __init__(
        self,
        bot: commands.Bot,
    ):
        self.bot = bot

    async def cog_check(
        self,
        ctx: commands.Context,
    ) -> bool:

        g = ctx.guild

        if g is None:
            return False

        if not isinstance(ctx.author, discord.Member):
            return False

        if ctx.author.id == g.owner_id:
            return True

        if ctx.author.guild_permissions.administrator:
            return True

        return await is_bot_admin_ctx(ctx)

    @commands.command(
        name="server-info",
        aliases=[
            "serverinfo",
            "si",
        ],
        help="View detailed server information",
    )
    @commands.guild_only()
    @commands.cooldown(
        1,
        8,
        commands.BucketType.user,
    )
    @commands.max_concurrency(
        1,
        per=commands.BucketType.guild,
        wait=False,
    )
    async def server_info(
        self,
        ctx: commands.Context,
    ):

        g = ctx.guild

        if g is None:
            return

        owner = g.owner

        created = discord.utils.format_dt(
            g.created_at,
            style="R",
        )

        humans = sum(1 for m in g.members if not m.bot)

        bots = (g.member_count or 0) - humans

        online = sum(
            1
            for m in g.members
            if m.status
            in (
                discord.Status.online,
                discord.Status.idle,
                discord.Status.dnd,
            )
        )

        embed = make_embed(
            title=f"{EMOJIS.get('announcement', '📢')} {g.name}",
            description=(
                f"{EMOJIS.get('arrow_point', '➜')} Owner: "
                f"{owner.mention if owner else 'Unknown'}\n"
                f"{EMOJIS.get('arrow_point', '➜')} Server ID: "
                f"`{g.id}`\n"
                f"{EMOJIS.get('arrow_point', '➜')} Created: "
                f"{created}\n\n"
                f"{EMOJIS.get('green_dot', '🟢')} Members: "
                f"`{g.member_count}`\n"
                f"{EMOJIS.get('developer', '👨‍💻')} Humans: "
                f"`{humans}`\n"
                f"🤖 Bots: `{bots}`\n"
                f"{EMOJIS.get('ping', '📡')} Online: "
                f"`{online}`\n\n"
                f"{EMOJIS.get('boost', '🚀')} Boosts: "
                f"`{g.premium_subscription_count or 0}` "
                f"(Level {g.premium_tier})\n"
                f"{EMOJIS.get('okay', '✅')} Verification: "
                f"`{str(g.verification_level).title()}`\n"
                f"{EMOJIS.get('moderation', '🛡️')} Roles: "
                f"`{len(g.roles)}`\n"
                f"😀 Emojis: "
                f"`{len(g.emojis)}` / `{g.emoji_limit}`"
            ),
            level="SYSTEM",
        )

        if g.icon:
            embed.set_thumbnail(url=g.icon.url)

        if g.banner:
            embed.set_image(url=g.banner.url)

        embed.set_footer(
            text=f"Action by: {ctx.author}",
            icon_url=ctx.author.display_avatar.url,
        )

        view = ServerInfoView(
            guild=g,
            author_id=ctx.author.id,
        )

        msg = await ctx.send(
            embed=embed,
            view=view,
        )

        view.message = msg

    @server_info.error
    async def server_info_error(
        self,
        ctx: commands.Context,
        error,
    ):

        if isinstance(
            error,
            commands.CommandOnCooldown,
        ):
            await ctx.send(
                embed=make_embed(
                    title="Cooldown",
                    description=(
                        f"{EMOJIS.get('warning', '⚠️')} "
                        f"Try again in "
                        f"`{round(error.retry_after, 1)}s`"
                    ),
                    level="WARNING",
                )
            )

            return

        if isinstance(
            error,
            commands.MaxConcurrencyReached,
        ):
            await ctx.send(
                embed=make_embed(
                    title="Busy",
                    description=(f"{EMOJIS.get('loading', '⏳')} Already running."),
                    level="WARNING",
                )
            )

            return

        if isinstance(
            error,
            commands.NoPrivateMessage,
        ):
            await ctx.send(
                embed=make_embed(
                    title="Guild Only",
                    description=(
                        f"{EMOJIS.get('fail', '❌')} "
                        "This command can only be used in a server."
                    ),
                    level="ERROR",
                )
            )

            return

        raise error


async def setup(
    bot: commands.Bot,
):
    await bot.add_cog(ServerInfo(bot))
