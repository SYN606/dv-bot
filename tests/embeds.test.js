import { describe, expect, it } from "bun:test";
import { makeEmbed, DIVIDER_LINE, COLORS } from "../src/core/embeds.js";

describe("Embed System Tests", () => {
  it("should prepend header divider line by default", () => {
    const embed = makeEmbed({
      title: "System Alert",
      description: "High CPU detected",
      level: "WARNING",
    });

    const data = embed.toJSON();
    expect(data.description.startsWith(DIVIDER_LINE)).toBe(true);
    expect(data.description).toContain("High CPU detected");
    expect(data.color).toBe(COLORS.WARNING);
  });

  it("should support disabling header divider line", () => {
    const embed = makeEmbed({
      title: "Raw Embed",
      description: "No line here",
      headerDivider: false,
    });

    const data = embed.toJSON();
    expect(data.description).toBe("No line here");
  });

  it("should safely handle empty description with divider line", () => {
    const embed = makeEmbed({
      title: "Empty Description",
    });

    const data = embed.toJSON();
    expect(data.description).toBe(DIVIDER_LINE);
  });
});
