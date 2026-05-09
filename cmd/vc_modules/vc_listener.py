import discord
from discord.ext import commands
from db.db_helpers.vc_mod_helpers.vc_manager import (
    is_vc_manager_enabled,
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
    @commands.Cog.listener()
    async def on_voice_state_update(
        self,
        member: discord.Member,
        before: discord.VoiceState,
        after: discord.VoiceState,
    ):
        # Ignore bots
        if member.bot:
            return
        # Ignore disabled guilds
        if not await is_vc_manager_enabled(member.guild.id):
            return
        # Ignore non-channel updates
        if before.channel == after.channel:
            return

        # Process VC role syncing
        print("VOICE EVENT")
        await handle_voice_state_update(
            member,
            before,
            after,
        )


async def setup(
    bot: commands.Bot,
):
    await bot.add_cog(VCListener(bot))
