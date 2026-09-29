import { expect, test } from "bun:test";

process.env.BETTER_AUTH_SECRET = "test-secret";
const { createTicketCode, verifyTicketCode } = await import("./tickets.ts");

test("verifies codes it issued and rejects forgeries", () => {
  const code = createTicketCode("rsvp-1");
  expect(verifyTicketCode(code)).toBe("rsvp-1");

  const [version, , signature] = code.split(".");
  expect(verifyTicketCode(`${version}.rsvp-2.${signature}`)).toBeNull();
  expect(verifyTicketCode(`${code}x`)).toBeNull();
  expect(verifyTicketCode(`${code}.extra`)).toBeNull();
  expect(
    verifyTicketCode(JSON.stringify({ eventId: "e", userId: "u" }))
  ).toBeNull();
  expect(verifyTicketCode(undefined)).toBeNull();

  process.env.BETTER_AUTH_SECRET = "other-secret";
  expect(verifyTicketCode(code)).toBeNull();
});
