import { createHmac, timingSafeEqual } from "node:crypto";

const VERSION = "t1";

function sign(rsvpId: string): string {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new Error("BETTER_AUTH_SECRET is required to sign tickets");
  }
  return createHmac("sha256", secret)
    .update(`ticket:${VERSION}:${rsvpId}`)
    .digest("base64url");
}

/** The QR payload for an RSVP's ticket. Only the server can mint one. */
export function createTicketCode(rsvpId: string): string {
  return `${VERSION}.${rsvpId}.${sign(rsvpId)}`;
}

/** Returns the RSVP id a ticket code was issued for, or null if forged. */
export function verifyTicketCode(code: unknown): string | null {
  if (typeof code !== "string") {
    return null;
  }
  const [version, rsvpId, signature, ...rest] = code.split(".");
  if (version !== VERSION || !rsvpId || !signature || rest.length > 0) {
    return null;
  }
  const expected = Buffer.from(sign(rsvpId));
  const given = Buffer.from(signature);
  return given.length === expected.length && timingSafeEqual(given, expected)
    ? rsvpId
    : null;
}
