import { describe, expect, spyOn, test } from "bun:test";
import { createRateLimitStorage } from "./auth-rate-limit-storage.ts";

const rule = { max: 2, window: 60 };

describe("auth rate-limit storage", () => {
  test("uses the atomic Redis counter", async () => {
    const calls = [];
    let count = 0;
    const storage = createRateLimitStorage({
      eval: (script, keys, args) => {
        calls.push({ args, keys, script });
        count += 1;
        return Promise.resolve([count, 42]);
      },
    });

    expect(await storage.consume("k", rule)).toEqual({
      allowed: true,
      retryAfter: null,
    });
    expect(await storage.consume("k", rule)).toEqual({
      allowed: true,
      retryAfter: null,
    });
    expect(await storage.consume("k", rule)).toEqual({
      allowed: false,
      retryAfter: 42,
    });
    // INCR and EXPIRE happen inside one script, never as separate calls.
    expect(calls[0].script).toContain("INCR");
    expect(calls[0].script).toContain("EXPIRE");
    expect(calls[0]).toMatchObject({ args: [60], keys: ["k"] });
  });

  test("keeps limiting when Redis is unavailable", async () => {
    const errorLog = spyOn(console, "error").mockImplementation(() => {
      // Expected outage log; keep test output quiet.
    });
    const storage = createRateLimitStorage({
      eval: () => Promise.reject(new Error("Redis unavailable")),
    });

    expect((await storage.consume("k", rule)).allowed).toBe(true);
    expect((await storage.consume("k", rule)).allowed).toBe(true);
    const blocked = await storage.consume("k", rule);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);
    expect((await storage.consume("other", rule)).allowed).toBe(true);
    errorLog.mockRestore();
  });
});
