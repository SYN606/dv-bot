import { ChannelType, SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("serverinfo")
  .setDescription("Display comprehensive, beautifully formatted information about the server.");

export default createCommand({
  name: "serverinfo",
  description: "Display comprehensive, beautifully formatted information about the server.",
  category: "Utility",
  aliases: ["si", "server", "guildinfo", "ginfo"],
  slashBuilder,

  async execute(ctx) {
    const { guild, message, interaction } = ctx;
    if (!guild) return;

    // Optional text-invocation cleanup
    if (message) {
      try {
        await message.delete().catch(() => {});
      } catch (err) {}
    }

    // 1. Emoji Fetching with Safe Defaults
    const arrow_icon = EMOJIS.get("arrow_point") || "▶";
    const bullet_icon = EMOJIS.get("green_dot") || "•";
    const owner_icon = EMOJIS.get("owner") || "👑";
    const member_icon = EMOJIS.get("member") || "👥";
    const bot_icon = EMOJIS.get("bot") || "🤖";
    const booster_icon = EMOJIS.get("booster") || "🚀";

    // 2. Graceful Owner Resolution
    let owner = null;
    try {
      owner = await guild.fetchOwner().catch(() => null);
    } catch {}

    const owner_display = owner ? `<@${owner.id}>` : `Unknown ID: \`${guild.ownerId}\``;

    // 3. Member Statistics
    const total_members = guild.memberCount || 0;
    const bots = guild.members.cache.filter((m) => m.user.bot).size;
    const humans = Math.max(0, total_members - bots);

    // 4. Channel Telemetry
    const channels = guild.channels.cache;
    const text_channels = channels.filter((c) => c.type === ChannelType.GuildText).size;
    const voice_channels = channels.filter((c) => c.type === ChannelType.GuildVoice).size;
    const categories = channels.filter((c) => c.type === ChannelType.GuildCategory).size;
    const stage_channels = channels.filter((c) => c.type === ChannelType.GuildStageVoice).size;
    const forum_channels = channels.filter((c) => c.type === ChannelType.GuildForum).size;
    
    const total_channels = text_channels + voice_channels + stage_channels + forum_channels;

    const verificationLevels = ["None", "Low", "Medium", "High", "Highest"];
    const verification = verificationLevels[guild.verificationLevel] || "Unknown";

    // 5. Construct Data Fields for Embedded Presentation
    const general_info = 
      `${owner_icon} **Owner:** ${owner_display}\n` +
      `${arrow_icon} **Created:** <t:${Math.floor(guild.createdTimestamp / 1000)}:R>\n` +
      `${arrow_icon} **Server ID:** \`${guild.id}\`\n` +
      `${arrow_icon} **Verification:** \`${verification}\``;

    const member_stats = 
      `${member_icon} **Total:** \`${total_members.toLocaleString()}\`\n` +
      `${bullet_icon} **Humans:** \`${humans.toLocaleString()}\`\n` +
      `${bot_icon} **Bots:** \`${bots.toLocaleString()}\``;

    const channel_stats = 
      `${bullet_icon} **Total:** \`${total_channels}\`\n` +
      `${bullet_icon} **Text / Forum:** \`${text_channels + forum_channels}\`\n` +
      `${bullet_icon} **Voice / Stage:** \`${voice_channels + stage_channels}\`\n` +
      `${bullet_icon} **Categories:** \`${categories}\``;

    const maxEmojis = guild.premiumTier === 3 ? 250 : guild.premiumTier === 2 ? 150 : guild.premiumTier === 1 ? 100 : 50;
    const maxStickers = guild.premiumTier === 3 ? 60 : guild.premiumTier === 2 ? 30 : guild.premiumTier === 1 ? 15 : 5;

    const asset_stats = 
      `${bullet_icon} **Roles:** \`${guild.roles.cache.size}\`\n` +
      `${bullet_icon} **Emojis:** \`${guild.emojis.cache.size}/${maxEmojis}\`\n` +
      `${bullet_icon} **Stickers:** \`${guild.stickers.cache.size}/${maxStickers}\`\n` +
      `${booster_icon} **Boosts:** Level \`${guild.premiumTier}\` (\`${guild.premiumSubscriptionCount || 0}\` boosts)`;

    const fields = [
      { name: "General Information", value: general_info, inline: false },
      { name: "Members", value: member_stats, inline: true },
      { name: "Channels", value: channel_stats, inline: true },
      { name: "Assets & Boosts", value: asset_stats, inline: true },
    ];

    // 6. Build Final Embed
    const icon_url = guild.iconURL({ size: 1024, extension: "png" });
    const banner_url = guild.bannerURL({ size: 1024, extension: "png" });
    const description = guild.description || "No server description provided.";
    const authorUser = interaction ? interaction.user : message.author;

    const embed = makeEmbed({
      title: `Server Information: ${guild.name}`,
      description: description,
      level: "INFO",
      fields: fields,
      thumbnail: icon_url,
      image: banner_url,
      footer: `Requested by ${authorUser.tag}`,
      footerIcon: authorUser.displayAvatarURL({ size: 256, extension: "png" }),
      timestamp: true,
    });

    return await ctx.reply({ embeds: [embed] });
  },
});
