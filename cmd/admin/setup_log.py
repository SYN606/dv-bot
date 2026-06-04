import discord
from discord.ext import commands
from discord import app_commands
from utils.permissions.base_admin import (BaseAdminCog)
from utils.core.embeds import (make_embed)
from utils.core.emojis import (EMOJIS)
from utils.logging.mod_log import (send_mod_log, _log_cache)
from db.db_helpers.mod_logs import (set_log_channel)


class SetupLog(
        BaseAdminCog, ):

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    async def _reply(self,
                     interaction: discord.Interaction,
                     *,
                     title: str,
                     description: str,
                     level: str = "ERROR") -> None:
        embed = make_embed(title=title, description=description, level=level)
        try:
            if interaction.response.is_done():
                await interaction.followup.send(embed=embed, ephemeral=True)
            else:
                await interaction.response.send_message(embed=embed,
                                                        ephemeral=True)
        except discord.HTTPException:
            pass

    @app_commands.command(name="setup_log",
                          description=("Set the moderation "
                                       "log channel for this server"))
    @app_commands.describe(channel=("Channel where moderation "
                                    "logs will be sent"))
    async def setup_log(self, interaction: discord.Interaction,
                        channel: discord.TextChannel) -> None:
        guild = interaction.guild
        actor = interaction.user
        # CONTEXT
        if guild is None:
            await self._reply(interaction,
                              title="Invalid Context",
                              description=("This command can only "
                                           "be used in a server."))
            return

        if not isinstance(actor, discord.Member):
            return

        # BOT MEMBER
        bot_member = guild.me
        if bot_member is None:
            return

        # BOT PERMISSIONS
        perms = (channel.permissions_for(bot_member))
        missing = []
        if not perms.send_messages:
            missing.append("Send Messages")

        if not perms.embed_links:
            missing.append("Embed Links")

        if missing:
            await self._reply(interaction,
                              title="Missing Permissions",
                              description=("I am missing:\n\n" +
                                           "\n".join(f"• `{perm}`"
                                                     for perm in missing) +
                                           (f"\n\nin "
                                            f"{channel.mention}.")))
            return

        # SAVE
        try:
            await set_log_channel(guild.id, channel.id)
        except Exception:
            await self._reply(interaction,
                              title="Database Error",
                              description=("Failed to save the "
                                           "log channel configuration."))
            return

        # CLEAR CACHE
        _log_cache.pop(guild.id, None)
        # SUCCESS
        await self._reply(interaction,
                          title="Log Channel Configured",
                          description=(f"{EMOJIS['success']} "
                                       f"Logs will now be sent to "
                                       f"{channel.mention}.\n\n"
                                       f"{EMOJIS['arrow_point']} "
                                       "Moderation actions "
                                       "will now be tracked."),
                          level="SUCCESS")

        # LOGGING
        try:
            await send_mod_log(guild=guild,
                               category="CONFIG",
                               title=("Moderation "
                                      "Log Channel Set"),
                               description=("Log channel configured "
                                            f"to {channel.mention}."),
                               level="SUCCESS",
                               actor=actor,
                               extra_fields={"Channel ID": channel.id})
        except Exception:
            pass


# CENTRALIZED CONFIG ACCESS
setattr(SetupLog.setup_log, "config_command", True)


async def setup(bot: commands.Bot):
    await bot.add_cog(SetupLog(bot))
