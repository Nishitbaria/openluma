import { describe, expect, spyOn, test } from "bun:test";
import { createSecondaryStorage } from "./auth-secondary-storage.ts";

function createUnavailableRedis() {
  const unavailable = () => Promise.reject(new Error("Redis unavailable"));

  return {
    del: unavailable,
    expire: unavailable,
    get: unavailable,
    incr: unavailable,
    set: unavailable,
  };
}

describe("auth secondary storage", () => {
  test("fails open when Redis is unavailable", async () => {
    const errorLog = spyOn(console, "error").mockImplementation(() => {
      // Expected outage log; keep test output quiet.
    });
    const storage = createSecondaryStorage(createUnavailableRedis());

    expect(await storage.get("session")).toBeNull();
    expect(await storage.set("session", "value", 60)).toBeUndefined();
    expect(await storage.delete("session")).toBeUndefined();
    expect(await storage.increment("rate-limit", 10)).toBe(1);
    expect(errorLog).toHaveBeenCalledTimes(1);
    errorLog.mockRestore();
  });
});
