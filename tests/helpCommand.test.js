import { describe, expect, it } from "bun:test";
import helpCommand from "../src/commands/utility/help.js";
import banCommand from "../src/commands/moderation/ban.js";
import lockCommand from "../src/commands/channels/lock.js";
import rolesCommand from "../src/commands/admin/roles.js";

describe("Help Command Configuration", () => {
  it("should have correct metadata and slash builder", () => {
    expect(helpCommand.name).toBe("help");
    expect(helpCommand.category).toBe("Utility");
    expect(helpCommand.aliases).toContain("h");
    expect(helpCommand.slashBuilder).toBeDefined();
    expect(helpCommand.slashBuilder.name).toBe("help");

    const json = helpCommand.slashBuilder.toJSON();
    expect(json.options).toBeDefined();
    expect(json.options.length).toBe(1);
    expect(json.options[0].name).toBe("command");
    expect(json.options[0].autocomplete).toBe(true);
    expect(json.options[0].required).toBe(false);
  });

  it("should provide autocomplete results matching user input", async () => {
    let respondedChoices = null;
    const mockInteraction = {
      options: {
        getFocused: () => "loc",
      },
      client: {
        commands: new Map([
          ["lock", lockCommand],
          ["unlock", { name: "unlock", aliases: [] }],
          ["ban", banCommand],
        ]),
      },
      respond: async (choices) => {
        respondedChoices = choices;
      },
    };

    await helpCommand.autocomplete(mockInteraction);
    expect(respondedChoices).toBeDefined();
    expect(respondedChoices.some((c) => c.name === "lock" && c.value === "lock")).toBe(true);
    expect(respondedChoices.some((c) => c.name === "unlock")).toBe(true);
    expect(respondedChoices.some((c) => c.name === "ban")).toBe(false);
  });
});

describe("Help Command Execution", () => {
  it("should display detailed help for a slash-only command with options", async () => {
    let repliedPayload = null;
    const mockCtx = {
      client: {
        commands: new Map([["lock", lockCommand]]),
        aliases: new Map(),
      },
      guild: { id: "guild-123" },
      channel: { id: "channel-123" },
      user: { id: "user-123", username: "Tester", tag: "Tester#0001" },
      member: { permissions: { has: () => false } },
      options: { command: "lock" },
      isInteraction: true,
      reply: async (payload) => {
        repliedPayload = payload;
        return payload;
      },
    };

    await helpCommand.execute(mockCtx);
    expect(repliedPayload).toBeDefined();
    expect(repliedPayload.embeds).toBeDefined();
    expect(repliedPayload.embeds.length).toBe(1);

    const embed = repliedPayload.embeds[0].data;
    expect(embed.title).toContain("Help Center");
    expect(embed.description).toContain("`lock`");
    expect(embed.description).toContain("[Slash Only]");
    expect(embed.description).toContain("Channels");
    expect(embed.description).toContain("/lock");
    expect(embed.description).toContain("Not available (Slash command only)");
    expect(embed.description).toContain("Examples:");
  });

  it("should display detailed help for a hybrid command with prefix support", async () => {
    let repliedPayload = null;
    const mockCtx = {
      client: {
        commands: new Map([["ban", banCommand]]),
        aliases: new Map([["b", "ban"]]),
      },
      guild: { id: "guild-123" },
      channel: { id: "channel-123" },
      user: { id: "user-123", username: "Tester", tag: "Tester#0001" },
      member: { permissions: { has: () => false } },
      options: { command: "ban" },
      isInteraction: false,
      reply: async (payload) => {
        repliedPayload = payload;
        return payload;
      },
    };

    await helpCommand.execute(mockCtx);
    expect(repliedPayload).toBeDefined();
    const embed = repliedPayload.embeds[0].data;
    expect(embed.description).toContain("`ban`");
    expect(embed.description).toContain("[Slash & Prefix]");
    expect(embed.description).toContain("/ban");
    expect(embed.description).toContain("ban <user> [reason]");
    expect(embed.description).toContain("Ban Members");
  });

  it("should display detailed help for a command with subcommands", async () => {
    let repliedPayload = null;
    const mockCtx = {
      client: {
        commands: new Map([["role", rolesCommand]]),
        aliases: new Map(),
      },
      guild: { id: "guild-123" },
      channel: { id: "channel-123" },
      user: { id: "user-123", username: "Tester", tag: "Tester#0001" },
      member: { permissions: { has: () => false } },
      options: { command: "role" },
      isInteraction: true,
      reply: async (payload) => {
        repliedPayload = payload;
        return payload;
      },
    };

    await helpCommand.execute(mockCtx);
    expect(repliedPayload).toBeDefined();
    const embed = repliedPayload.embeds[0].data;
    expect(embed.description).toContain("`role`");
    expect(embed.description).toContain("[Slash Only]");
    expect(embed.description).toContain("/role add");
    expect(embed.description).toContain("/role remove");
    expect(embed.description).toContain("Subcommands:");
    expect(embed.description).toContain("Manage Roles");
  });

  it("should return an error embed when command is not found", async () => {
    let repliedPayload = null;
    const mockCtx = {
      client: {
        commands: new Map(),
        aliases: new Map(),
      },
      guild: { id: "guild-123" },
      channel: { id: "channel-123" },
      user: { id: "user-123", username: "Tester", tag: "Tester#0001" },
      member: { permissions: { has: () => false } },
      options: { command: "nonexistentcmd" },
      isInteraction: true,
      reply: async (payload) => {
        repliedPayload = payload;
        return payload;
      },
    };

    await helpCommand.execute(mockCtx);
    expect(repliedPayload).toBeDefined();
    const embed = repliedPayload.embeds[0].data;
    expect(embed.title).toContain("Command Not Found");
    expect(embed.description).toContain("nonexistentcmd");
  });

  it("should render main directory overview with components when no query is passed", async () => {
    let repliedPayload = null;
    const mockCollector = {
      on: () => {},
      stop: () => {},
    };

    const mockCtx = {
      client: {
        commands: new Map([
          ["lock", lockCommand],
          ["ban", banCommand],
          ["role", rolesCommand],
          ["help", helpCommand],
        ]),
        aliases: new Map(),
      },
      guild: { id: "guild-123" },
      channel: { id: "channel-123" },
      user: { id: "user-123", username: "Tester", tag: "Tester#0001" },
      member: { permissions: { has: () => true } }, // Admin
      options: {},
      isInteraction: true,
      reply: async (payload) => {
        repliedPayload = payload;
        return {
          ...payload,
          createMessageComponentCollector: () => mockCollector,
        };
      },
    };

    await helpCommand.execute(mockCtx);
    expect(repliedPayload).toBeDefined();
    expect(repliedPayload.embeds).toBeDefined();
    expect(repliedPayload.components).toBeDefined();
    expect(repliedPayload.components.length).toBe(2);

    const embed = repliedPayload.embeds[0].data;
    expect(embed.title).toContain("Command Directory");
    expect(embed.description).toContain("Total Commands:");
    expect(embed.description).toContain("Slash Only:");
  });
});
