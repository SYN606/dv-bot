import { MessageFlags, SlashCommandBuilder } from "discord.js";

function normalizePayload(content) {
  if (typeof content === "string") return { content };
  const payload = { ...content };
  if (payload.ephemeral !== undefined) {
    if (payload.ephemeral) {
      payload.flags = (payload.flags || 0) | MessageFlags.Ephemeral;
    }
    delete payload.ephemeral;
  }
  return payload;
}

export class CommandContext {
  constructor({ client, interaction = null, message = null, command, options = {}, subcommand = null }) {
    this.client = client;
    this.interaction = interaction;
    this.message = message;
    this.command = command;
    this.options = options;
    this.subcommand = subcommand;

    this.isInteraction = !!interaction;
    this.guild = interaction ? interaction.guild : message?.guild;
    this.channel = interaction ? interaction.channel : message?.channel;
    this.user = interaction ? interaction.user : message?.author;
    this.member = interaction ? interaction.member : message?.member;
  }

  async defer({ ephemeral = false, flags = 0 } = {}) {
    if (this.isInteraction && !this.interaction.deferred && !this.interaction.replied) {
      const deferFlags = ephemeral ? (flags | MessageFlags.Ephemeral) : flags;
      await this.interaction.deferReply(deferFlags ? { flags: deferFlags } : {});
    }
  }

  async reply(content) {
    const payload = normalizePayload(content);

    if (this.isInteraction) {
      if (this.interaction.deferred) {
        return await this.interaction.editReply(payload);
      }
      if (this.interaction.replied) {
        return await this.interaction.followUp(payload);
      }
      return await this.interaction.reply(payload);
    }

    if (this.message) {
      // In prefix commands, ephemeral can't be set natively; deleteAfter can be used if provided
      const msg = await this.message.reply(payload);
      if (payload.deleteAfter) {
        setTimeout(() => msg.delete().catch(() => {}), payload.deleteAfter * 1000);
      }
      return msg;
    }
  }

  async followup(content) {
    const payload = normalizePayload(content);
    if (this.isInteraction) {
      return await this.interaction.followUp(payload);
    }
    return await this.reply(payload);
  }

  async send(content) {
    if (this.channel && this.channel.send) {
      return await this.channel.send(content);
    }
    return await this.reply(content);
  }
}

export class HybridCommand {
  constructor(options = {}) {
    this.name = options.name;
    this.description = options.description || "No description provided";
    this.category = options.category || "Utility";
    this.aliases = options.aliases || [];
    this.slashOnly = options.slashOnly || false;
    this.prefixOnly = options.prefixOnly || false;
    this.adminOnly = options.adminOnly || false;
    this.configOnly = options.configOnly || false;
    this.modOnly = options.modOnly || false;
    this.requiredPermission = options.requiredPermission || null;
    this.options = options.options || [];
    this.subcommands = options.subcommands || new Map();
    this.slashBuilder = options.slashBuilder || null;
    this.execute = options.execute;
    this.autocomplete = options.autocomplete || null;
  }

  buildSlashCommand() {
    if (this.slashBuilder) return this.slashBuilder;

    const builder = new SlashCommandBuilder()
      .setName(this.name)
      .setDescription(this.description);

    return builder;
  }
}

export function createCommand(options) {
  return new HybridCommand(options);
}
