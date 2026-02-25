import discord
from utils.views.verification_views.verify_button_view import VerifyButtonView
from db.db_helpers.verification import get_verification_config


async def setup_verification_on_ready(bot: discord.Client) -> None:
    """
    Registers persistent verification components on bot startup.

    Must be called inside on_ready().
    Safe for reconnect / resume.
    """

    # region REGISTER PERSISTENT UI VIEWS
    try:
        bot.add_view(VerifyButtonView())
        print("[SYSTEM] VerifyButtonView registered (persistent)")
    except Exception as exc:
        print(f"[SYSTEM] Failed to register VerifyButtonView: {exc}")

    # region VERIFICATION CONFIG SANITY LOG
    for guild in bot.guilds:
        try:
            config = await get_verification_config(guild.id)

        except Exception as exc:
            print(f"[SYSTEM] Failed to load verification config for "
                  f"{guild.name} ({guild.id}): {exc}")
            continue

        if not config:
            continue

        print(f"[SYSTEM] Verification enabled in guild: "
              f"{guild.name} ({guild.id}) | "
              f"verify_channel={config.verify_channel_id} | "
              f"verified_role={config.verified_role_id}")
