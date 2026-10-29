import type {
  Client,
  Collection,
  ChatInputCommandInteraction,
  Message,
  SlashCommandBuilder,
  SlashCommandSubcommandsOnlyBuilder,
  PermissionResolvable,
  Interaction,
  ButtonInteraction,
  StringSelectMenuInteraction,
  ModalSubmitInteraction,
} from "discord.js";

export interface Command {
  data?: SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder | any;
  name: string;
  description: string;
  category?: string;
  aliases?: string[];
  userPermissions?: PermissionResolvable[];
  botPermissions?: PermissionResolvable[];
  cooldown?: number;
  ownerOnly?: boolean;
  executeSlash?: (interaction: ChatInputCommandInteraction, client: any) => Promise<any>;
  executeMessage?: (message: Message, args: string[], client: any) => Promise<any>;
}

export interface ComponentHandler {
  customId: string | RegExp;
  execute: (
    interaction: ButtonInteraction | StringSelectMenuInteraction | ModalSubmitInteraction,
    client: any
  ) => Promise<any>;
}

export interface BotEvent {
  name: string;
  once?: boolean;
  execute: (...args: any[]) => Promise<any> | any;
}
