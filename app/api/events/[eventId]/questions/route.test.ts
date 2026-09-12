import { beforeEach, describe, expect, mock, test } from "bun:test";
import { and, eq } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { eventQuestions } from "@/lib/db/schema";

const dialect = new PgDialect();

/** Renders a drizzle where-clause to SQL text + params so we can assert on it without a real DB. */
function renderWhere(where: unknown) {
  return dialect.sqlToQuery(where as Parameters<PgDialect["sqlToQuery"]>[0]);
}

const HOST_ID = "host-1";
const EVENT_ID = "event-1";
const QUESTION_ID = "question-1";

// Mutable state the fake `db` reads from, so each test can control the
// `.returning()` result without re-importing the route module (its `db`
// binding is captured once, at first import).
const state: { returningRows: unknown[]; wheres: unknown[] } = {
  returningRows: [],
  wheres: [],
};

const chain = {
  returning: () => Promise.resolve(state.returningRows),
  set: () => chain,
  where: (w: unknown) => {
    state.wheres.push(w);
    return chain;
  },
};

mock.module("@/lib/db", () => ({
  db: {
    delete: () => chain,
    query: {
      events: {
        findFirst: () => Promise.resolve({ cohosts: [], hostId: HOST_ID }),
      },
    },
    update: () => chain,
  },
}));

mock.module("@/lib/auth", () => ({
  auth: {
    api: { getSession: () => Promise.resolve({ user: { id: HOST_ID } }) },
  },
}));

mock.module("next/headers", () => ({
  headers: () => Promise.resolve(new Headers()),
}));

const { DELETE, PUT } = await import("./route");

function makeRequest(body: unknown) {
  return { json: () => Promise.resolve(body) } as Request;
}

beforeEach(() => {
  state.returningRows = [];
  state.wheres = [];
});

describe("event questions PUT/DELETE", () => {
  test("PUT scopes the update to both the question id and the event id", async () => {
    state.returningRows = [{ id: QUESTION_ID, label: "Updated" }];

    const res = await PUT(
      makeRequest({ id: QUESTION_ID, label: "Updated" }) as never,
      {
        params: Promise.resolve({ eventId: EVENT_ID }),
      }
    );

    expect(res.status).toBe(200);
    const { params } = renderWhere(state.wheres.at(-1));
    expect(params).toEqual([QUESTION_ID, EVENT_ID]);
    const expected = renderWhere(
      and(
        eq(eventQuestions.id, QUESTION_ID),
        eq(eventQuestions.eventId, EVENT_ID)
      )
    );
    expect(renderWhere(state.wheres.at(-1)).sql).toBe(expected.sql);
  });

  test("PUT returns 404 when the question does not belong to the event", async () => {
    state.returningRows = [];

    const res = await PUT(
      makeRequest({ id: QUESTION_ID, label: "Updated" }) as never,
      {
        params: Promise.resolve({ eventId: EVENT_ID }),
      }
    );

    expect(res.status).toBe(404);
  });

  test("DELETE scopes the delete to both the question id and the event id", async () => {
    state.returningRows = [{ id: QUESTION_ID }];

    const res = await DELETE(makeRequest({ id: QUESTION_ID }) as never, {
      params: Promise.resolve({ eventId: EVENT_ID }),
    });

    expect(res.status).toBe(200);
    const { params } = renderWhere(state.wheres.at(-1));
    expect(params).toEqual([QUESTION_ID, EVENT_ID]);
  });

  test("DELETE returns 404 when the question does not belong to the event", async () => {
    state.returningRows = [];

    const res = await DELETE(makeRequest({ id: QUESTION_ID }) as never, {
      params: Promise.resolve({ eventId: EVENT_ID }),
    });

    expect(res.status).toBe(404);
  });
});
