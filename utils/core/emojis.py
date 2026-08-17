from __future__ import annotations

from typing import Dict, Optional, Union
from discord import PartialEmoji


class EmojiRegistry:
    """Registry wrapper for manage, fetch, and format PartialEmoji instances cleanly."""

    def __init__(self, emoji_map: Dict[str, PartialEmoji]) -> None:
        self._emojis: Dict[str, PartialEmoji] = emoji_map

    def get(
        self, key: str, default: Optional[Union[str, PartialEmoji]] = None
    ) -> Union[PartialEmoji, str, None]:
        """Fetch an emoji by key, returning a specified default if missing."""
        return self._emojis.get(key, default)

    def __getitem__(self, key: str) -> PartialEmoji:
        return self._emojis[key]

    def __contains__(self, key: str) -> bool:
        return key in self._emojis

    def items(self):
        return self._emojis.items()

    def keys(self):
        return self._emojis.keys()

    def values(self):
        return self._emojis.values()


RAW_EMOJIS: Dict[str, PartialEmoji] = {
    # Core Actions & Notifications
    "announcement": PartialEmoji(
        name="dv_announcement_ani", id=1359629824192282759, animated=True
    ),
    "arrow_point": PartialEmoji(
        name="dv_arrow_point_ani", id=1359629780424851567, animated=True
    ),
    "ban": PartialEmoji(name="dv_ban_ani", id=1359630227445256405, animated=True),
    "kick": PartialEmoji(name="dv_kick_ani", id=1527903378238210229, animated=True),
    "timeout": PartialEmoji(name="dv_timeout", id=1528637063770144769, animated=False),
    "warning": PartialEmoji(
        name="dv_warning_ani", id=1467749209473159271, animated=True
    ),
    "success": PartialEmoji(
        name="dv_success_ani", id=1359630048302334145, animated=True
    ),
    "fail": PartialEmoji(name="dv_fail_ani", id=1359630009613947011, animated=True),
    "okay": PartialEmoji(
        name="dv_granted_ani", id=1359630397981331707, animated=True
    ),
    "moderation": PartialEmoji(
        name="dv_moderation", id=1359630332747321585, animated=False
    ),
    "heart": PartialEmoji(name="dv_heart", id=1357256039623295066, animated=False),
    "loading": PartialEmoji(
        name="dv_loading_ani", id=1528638529238859837, animated=True
    ),
    "welcome": PartialEmoji(
        name="dv_welcome_ani", id=1528642190237110403, animated=True
    ),
    "leave": PartialEmoji(name="dv_leave", id=1507840994517848386, animated=False),
    "giveaway_ping": PartialEmoji(
        name="rw_giveawayping", id=1527880659354517667, animated=True
    ),
    # Connection & Performance
    "good_connection": PartialEmoji(
        name="dv_good_con", id=1528640035350646784, animated=False
    ),
    "okay_connection": PartialEmoji(
        name="dv_med_con", id=1528640060340305960, animated=False
    ),
    "bad_connection": PartialEmoji(
        name="dv_bad_con", id=1528640083673088020, animated=False
    ),
    "animated_ping": PartialEmoji(
        name="dv_pin_ani", id=1528632599134867506, animated=True
    ),
    "green_dot": PartialEmoji(
        name="dv_green_ani", id=1359633941245722839, animated=True
    ),
    "red_dot": PartialEmoji(
        name="dv_red_ani", id=1359633914112774406, animated=True
    ),
    # Roles, Hierarchy & Badges
    "owner": PartialEmoji(name="dv_owner", id=1528641865270820866, animated=False),
    "developer": PartialEmoji(
        name="dv_developer", id=1527935768180424772, animated=False
    ),
    "developer_animated": PartialEmoji(
        name="dv_developer_ani", id=1359626493713453199, animated=True
    ),
    "admin": PartialEmoji(name="dv_admin", id=1527902170941489355, animated=False),
    "admin_animated": PartialEmoji(
        name="dv_admin_ani", id=1527906921762259095, animated=True
    ),
    "support_team": PartialEmoji(
        name="dv_support_team", id=1528642078756700201, animated=False
    ),
    "member": PartialEmoji(name="dv_member", id=1528641788502609943, animated=False),
    "bot": PartialEmoji(name="dv_bot", id=1527902743220588554, animated=False),
    "booster": PartialEmoji(name="dv_booster", id=1528641512286716084, animated=False),
    "vip": PartialEmoji(name="dv_vip", id=1528642539991597087, animated=False),
    "premium": PartialEmoji(name="dv_premium", id=1528642778106560575, animated=False),
    "popular": PartialEmoji(name="dv_popular", id=1528641693492973598, animated=False),
    "neon_crown": PartialEmoji(
        name="dv_neon_crown", id=1528642421850767421, animated=False
    ),
    "boys_crew": PartialEmoji(
        name="dv_boyscrew", id=1527902818566930492, animated=False
    ),
    "boys_mod": PartialEmoji(name="dv_boysmod", id=1527902867187564555, animated=False),
    "girl_crew": PartialEmoji(
        name="dv_girl_crew", id=1528641597888270336, animated=False
    ),
    # Arrows & Pointers
    "curved_arrow": PartialEmoji(
        name="dv_curved_arrow", id=1483111830011252760, animated=False
    ),
    "pink_arrow": PartialEmoji(
        name="dv_pink_arrow", id=1483111830485471354, animated=False
    ),
    "peach_arrow": PartialEmoji(
        name="dv_peach_arrow", id=1483111830439071798, animated=False
    ),
    "neonblue_arrow": PartialEmoji(
        name="dv_neonblue_arrow", id=1483111830485205012, animated=False
    ),
    # Languages & Frameworks
    "python": PartialEmoji(
        name="dv_lang_python", id=1527540483222405140, animated=False
    ),
    "typescript": PartialEmoji(
        name="dv_lang_ts", id=1527540733177761863, animated=False
    ),
    "javascript": PartialEmoji(
        name="dv_lang_js", id=1527540601707433994, animated=False
    ),
    "c": PartialEmoji(name="dv_lang_c", id=1527546102398849206, animated=False),
    "cpp": PartialEmoji(name="dv_lang_cpp", id=1527540547135213649, animated=False),
    "html": PartialEmoji(name="dv_lang_html", id=1527544246943354921, animated=False),
    "java": PartialEmoji(name="dv_lang_java", id=1527540663971741706, animated=False),
    "react": PartialEmoji(
        name="dv_framework_react", id=1527543686408437792, animated=False
    ),
    "github": PartialEmoji(name="dv_github", id=1359630534195544224, animated=False),
    # Integrations & Other
    "spotify": PartialEmoji(name="dv_spotify", id=1507966948749873362, animated=False),
    "globe": PartialEmoji(name="dv_globe", id=1359639006614388967, animated=True),
    "valorant": PartialEmoji(name="valorant", id=1359630998010069062, animated=True),
    "above18": PartialEmoji(name="above18", id=1527878089181368330, animated=True),
}

# Unified registry instance exported for app components
EMOJIS = EmojiRegistry(RAW_EMOJIS)