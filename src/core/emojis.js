export class EmojiRegistry {
  constructor(emojiMap) {
    this._emojis = emojiMap;
  }

  get(key, fallback = "") {
    return this._emojis[key] || fallback;
  }

  toString(key) {
    return this.get(key);
  }
}

export function formatEmoji(name, id, animated = false) {
  return animated ? `<a:${name}:${id}>` : `<:${name}:${id}>`;
}

export const RAW_EMOJIS = {
  // Core Actions & Notifications
  announcement: formatEmoji("dv_announcement_ani", "1359629824192282759", true),
  arrow_point: formatEmoji("dv_arrow_point_ani", "1359629780424851567", true),
  ban: formatEmoji("dv_ban_ani", "1359630227445256405", true),
  kick: formatEmoji("dv_kick_ani", "1527903378238210229", true),
  timeout: formatEmoji("dv_timeout", "1528637063770144769", false),
  warning: formatEmoji("dv_warning_ani", "1467749209473159271", true),
  success: formatEmoji("dv_success_ani", "1359630048302334145", true),
  fail: formatEmoji("dv_fail_ani", "1359630009613947011", true),
  okay: formatEmoji("dv_granted_ani", "1359630397981331707", true),
  moderation: formatEmoji("dv_moderation", "1359630332747321585", false),
  heart: formatEmoji("dv_heart", "1357256039623295066", false),
  loading: formatEmoji("dv_loading_ani", "1528638529238859837", true),
  welcome: formatEmoji("dv_welcome_ani", "1528642190237110403", true),
  leave: formatEmoji("dv_leave", "1507840994517848386", false),
  giveaway_ping: formatEmoji("rw_giveawayping", "1527880659354517667", true),

  // Connection & Performance
  good_connection: formatEmoji("dv_good_con", "1528640035350646784", false),
  okay_connection: formatEmoji("dv_med_con", "1528640060340305960", false),
  bad_connection: formatEmoji("dv_bad_con", "1528640083673088020", false),
  animated_ping: formatEmoji("dv_pin_ani", "1528632599134867506", true),
  green_dot: formatEmoji("dv_green_ani", "1359633941245722839", true),
  red_dot: formatEmoji("dv_red_ani", "1359633914112774406", true),

  // Roles & Badges
  owner: formatEmoji("dv_owner", "1528641865270820866", false),
  developer: formatEmoji("dv_developer", "1527935768180424772", false),
  developer_animated: formatEmoji("dv_developer_ani", "1359626493713453199", true),
  admin: formatEmoji("dv_admin", "1527902170941489355", false),
  admin_animated: formatEmoji("dv_admin_ani", "1527906921762259095", true),
  support_team: formatEmoji("dv_support_team", "1528642078756700201", false),
  member: formatEmoji("dv_member", "1528641788502609943", false),
  bot: formatEmoji("dv_bot", "1527902743220588554", false),
  booster: formatEmoji("dv_booster", "1528641512286716084", false),
  vip: formatEmoji("dv_vip", "1528642539991597087", false),
  premium: formatEmoji("dv_premium", "1528642778106560575", false),
  popular: formatEmoji("dv_popular", "1528641693492973598", false),
  neon_crown: formatEmoji("dv_neon_crown", "1528642421850767421", false),
  boys_crew: formatEmoji("dv_boyscrew", "1527902818566930492", false),
  boys_mod: formatEmoji("dv_boysmod", "1527902867187564555", false),
  girl_crew: formatEmoji("dv_girl_crew", "1528641597888270336", false),

  // Arrows & Pointers
  curved_arrow: formatEmoji("dv_curved_arrow", "1483111830011252760", false),
  pink_arrow: formatEmoji("dv_pink_arrow", "1483111830485471354", false),
  peach_arrow: formatEmoji("dv_peach_arrow", "1483111830439071798", false),
  neonblue_arrow: formatEmoji("dv_neonblue_arrow", "1483111830485205012", false),

  // Languages & Integrations
  python: formatEmoji("dv_lang_python", "1527540483222405140", false),
  typescript: formatEmoji("dv_lang_ts", "1527540733177761863", false),
  javascript: formatEmoji("dv_lang_js", "1527540601707433994", false),
  c: formatEmoji("dv_lang_c", "1527546102398849206", false),
  cpp: formatEmoji("dv_lang_cpp", "1527540547135213649", false),
  html: formatEmoji("dv_lang_html", "1527544246943354921", false),
  java: formatEmoji("dv_lang_java", "1527540663971741706", false),
  react: formatEmoji("dv_framework_react", "1527543686408437792", false),
  github: formatEmoji("dv_github", "1359630534195544224", false),
  spotify: formatEmoji("dv_spotify", "1507966948749873362", false),
  globe: formatEmoji("dv_globe", "1359639006614388967", true),
  valorant: formatEmoji("valorant", "1359630998010069062", true),
  above18: formatEmoji("above18", "1527878089181368330", true),
};

export const EMOJIS = new EmojiRegistry(RAW_EMOJIS);
