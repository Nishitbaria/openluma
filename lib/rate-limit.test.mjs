import { describe, expect, spyOn, test } from "bun:test";
import { checkRateLimit } from "./rate-limit.ts";

function recordingLimiter(success = true) {
  const keys = [];
  return {
    keys,
    limit: (key) => {
      keys.push(key);
      return Promise.resolve({ reset: Date.now() + 5000, success });
    },
  };
}

const req = (xff) =>
  new Request("http://x.test", {
    headers: xff ? { "x-forwarded-for": xff } : {},
  });

describe("checkRateLimit", () => {
  test("keys signed-in callers by user id only", async () => {
    const limiter = recordingLimiter();
    await checkRateLimit(req("1.1.1.1"), "chat", { limiter, userId: "u1" });
    await checkRateLimit(req("2.2.2.2"), "chat", { limiter, userId: "u1" });
    expect(limiter.keys).toEqual(["chat:user:u1", "chat:user:u1"]);
  });

  test("ignores a spoofable multi-hop forwarded chain", async () => {
    const limiter = recordingLimiter();
    await checkRateLimit(req("6.6.6.6"), "invitation", { limiter });
    await checkRateLimit(req("7.7.7.7, 6.6.6.6"), "invitation", { limiter });
    expect(limiter.keys[0]).toBe("invitation:ip:6.6.6.6");
    expect(limiter.keys[1]).not.toContain("7.7.7.7");
  });

  test("returns 429 over the limit", async () => {
    const res = await checkRateLimit(req(), "x", {
      limiter: recordingLimiter(false),
    });
    expect(res?.status).toBe(429);
  });

  test("rejects instead of allowing when the limiter errors", async () => {
    const errorSpy = spyOn(console, "error").mockImplementation(
      () => undefined
    );
    const res = await checkRateLimit(req(), "x", {
      limiter: { limit: () => Promise.reject(new Error("down")) },
    });
    expect(res?.status).toBe(503);
    errorSpy.mockRestore();
  });
});
