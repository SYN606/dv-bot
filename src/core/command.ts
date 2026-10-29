import { MessageFlags, SlashCommandBuilder, type CommandInteraction, type Message, type Guild, type TextBasedChannel, type User, type GuildMember } from "discord.js";

function normalizePayload(content: any): any {
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

export interface CommandContextOptions {
  client: any;
  interaction?: CommandInteraction | any | null;
  message?: Message | any | null;
  command?: any;
  options?: Record<string, any>;
  subcommand?: string | null;
}

export class CommandContext {
  client: any;
  interaction: any;
  message: Message | null;
  command: any;
  options: Record<string, any>;
  subcommand: string | null;
  isInteraction: boolean;
  guild: Guild | null;
  channel: TextBasedChannel | any;
  user: User;
  member: GuildMember | any;

  constructor({ client, interaction = null, message = null, command, options = {}, subcommand = null }: CommandContextOptions) {
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

  async defer({ ephemeral = false, flags = 0 }: { ephemeral?: boolean; flags?: number } = {}) {
    if (this.isInteraction && !this.interaction.deferred && !this.interaction.replied) {
      const deferFlags = ephemeral ? (flags | MessageFlags.Ephemeral) : flags;
      await this.interaction.deferReply(deferFlags ? { flags: deferFlags } : {});
    }
  }

  async reply(content: any) {
    const payload = normalizePayload(content);

    if (this.isInteraction) {
      if (this.interaction.deferred) {
        return await this.interaction.editReply(payload);
      }
      if (this.interaction.replied) {
        return await this.interaction.followUp(payload);
      }
      return await this.interaction.reply({ ...payload, fetchReply: true });
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

  async followup(content: any) {
    const payload = normalizePayload(content);
    if (this.isInteraction) {
      return await this.interaction.followUp(payload);
    }
    return await this.reply(payload);
  }

  async send(content: any) {
    if (this.channel && this.channel.send) {
      return await this.channel.send(content);
    }
    return await this.reply(content);
  }
}

export interface HybridCommandOptions {
  name: string;
  description?: string;
  category?: string;
  aliases?: string[];
  slashOnly?: boolean;
  prefixOnly?: boolean;
  adminOnly?: boolean;
  configOnly?: boolean;
  modOnly?: boolean;
  requiredPermission?: any;
  options?: any[];
  subcommands?: Map<string, any>;
  slashBuilder?: any;
  usage?: string | null;
  examples?: string[];
  execute: (ctx: CommandContext, ...args: any[]) => Promise<any> | any;
  autocomplete?: (interaction: any) => Promise<any> | any;
}

export class HybridCommand {
  name: string;
  description: string;
  category: string;
  aliases: string[];
  slashOnly: boolean;
  prefixOnly: boolean;
  adminOnly: boolean;
  configOnly: boolean;
  modOnly: boolean;
  requiredPermission: any;
  options: any[];
  subcommands: Map<string, any>;
  slashBuilder: any;
  usage: string | null;
  examples: string[];
  execute: (ctx: CommandContext, ...args: any[]) => Promise<any> | any;
  autocomplete: ((interaction: any) => Promise<any> | any) | null;

  constructor(options: HybridCommandOptions) {
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
    this.usage = options.usage || null;
    this.examples = options.examples || [];
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

export function createCommand(options: HybridCommandOptions) {
  return new HybridCommand(options);
}
