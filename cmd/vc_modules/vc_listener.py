import discord
from discord.ext import commands

from db.db_helpers.vc_mod_helpers.vc_manager import (
    is_vc_manager_enabled,
)

from utils.handlers.vc_mod_handlers.cache_handler import (
    build_guild_cache,
)

from utils.handlers.vc_mod_handlers.voice_state import (
    handle_voice_state_update,
)


class VCListener(
    commands.Cog,
):
    def __init__(
        self,
        bot: commands.Bot,
    ):

        self.bot = bot

        self.cache_ready = False

        print("[VC LISTENER] Initialized")

    # BUILD CACHE AFTER READY
    @commands.Cog.listener()
    async def on_ready(
        self,
    ):

        # Prevent duplicate rebuild
        if self.cache_ready:
            return

        print("[VC CACHE] Building caches...")

        for guild in self.bot.guilds:
            try:
                await build_guild_cache(
                    guild.id,
                )

                print(f"[VC CACHE] Loaded -> {guild.name}")

            except Exception as exc:
                print(f"[VC CACHE ERROR] {guild.id}: {exc}")

        self.cache_ready = True

        print("[VC CACHE] All caches ready")

    # VOICE STATE EVENTS
    @commands.Cog.listener()
    async def on_voice_state_update(
        self,
        member: discord.Member,
        before: discord.VoiceState,
        after: discord.VoiceState,
    ):

        print("[VC EVENT] Voice update fired")

        # Ignore bots
        if member.bot:
            return

        enabled = await is_vc_manager_enabled(
            member.guild.id,
        )

        print(f"[VC EVENT] Enabled={enabled}")

        # Ignore disabled guilds
        if not enabled:
            return

        # Ignore unchanged updates
        if before.channel == after.channel:
            return

        await handle_voice_state_update(
            member,
            before,
            after,
        )

        print("[VC EVENT] Processed")


async def setup(
    bot: commands.Bot,
):

    print("[VC LISTENER] Loading cog...")

    await bot.add_cog(
        VCListener(bot),
    )

    print("[VC LISTENER] Cog loaded")
