import { describe, expect, it } from "bun:test";
import { GlobalCooldownManager } from "../src/core/cooldown.js";

describe("Cooldown Token-Bucket Tests", () => {
  it("should enforce token acquisition limit", () => {
    const cd = new GlobalCooldownManager(2, 5); // 2 tokens per 5s
    const userId = "user1";

    expect(cd.acquire(userId)).toBe(true);
    expect(cd.acquire(userId)).toBe(true);
    expect(cd.acquire(userId)).toBe(false);

    const retry = cd.retryAfter(userId);
    expect(retry).toBeGreaterThan(0);
    expect(retry).toBeLessThanOrEqual(5);
  });
});
