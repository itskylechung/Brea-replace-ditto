import {
  type ConnectionRow,
  conversationAccess,
  handler,
  messageItem,
  validateMessagesInput,
} from "./connection-messages.ts";

function assert(condition: unknown, message = "Assertion failed"): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEquals(actual: unknown, expected: unknown): void {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    throw new Error(`Expected ${expectedJson}, received ${actualJson}`);
  }
}

const CONNECTION_ID = "00000000-0000-4000-8000-000000000201";
const SENDER_ID = "00000000-0000-4000-8000-000000000101";
const RECIPIENT_ID = "00000000-0000-4000-8000-000000000102";
const STRANGER_ID = "00000000-0000-4000-8000-000000000103";

function connection(overrides: Partial<ConnectionRow> = {}): ConnectionRow {
  return {
    id: CONNECTION_ID,
    sender_id: SENDER_ID,
    recipient_id: RECIPIENT_ID,
    status: "accepted",
    ...overrides,
  };
}

Deno.test("validateMessagesInput accepts list and send, rejects malformed input", () => {
  assertEquals(validateMessagesInput({ action: "list", connectionId: CONNECTION_ID }), {
    ok: true,
    value: { action: "list", connectionId: CONNECTION_ID },
  });
  assertEquals(
    validateMessagesInput({ action: "send", connectionId: CONNECTION_ID, body: "  hey there  " }),
    { ok: true, value: { action: "send", connectionId: CONNECTION_ID, body: "hey there" } },
  );
  assert(!validateMessagesInput({ action: "delete", connectionId: CONNECTION_ID }).ok);
  assert(!validateMessagesInput({ action: "list", connectionId: "not-a-uuid" }).ok);
  assert(!validateMessagesInput({ action: "send", connectionId: CONNECTION_ID, body: "   " }).ok);
  assert(!validateMessagesInput({ action: "send", connectionId: CONNECTION_ID }).ok);
  assert(
    !validateMessagesInput({
      action: "send",
      connectionId: CONNECTION_ID,
      body: "x".repeat(2001),
    }).ok,
  );
  assert(!validateMessagesInput("not-an-object").ok);
});

Deno.test("conversationAccess admits only participants of accepted, unblocked connections", () => {
  assert(conversationAccess(connection(), SENDER_ID, false).ok);
  assert(conversationAccess(connection(), RECIPIENT_ID, false).ok);

  // Every rejection is the same 404 — the caller never learns whether the
  // connection exists, is pending/declined, or involves a block.
  for (
    const denied of [
      conversationAccess(null, SENDER_ID, false),
      conversationAccess(connection(), STRANGER_ID, false),
      conversationAccess(connection({ status: "pending" }), SENDER_ID, false),
      conversationAccess(connection({ status: "declined" }), SENDER_ID, false),
      conversationAccess(connection(), SENDER_ID, true),
    ]
  ) {
    assert(!denied.ok);
    if (!denied.ok) {
      assertEquals(denied.status, 404);
      assertEquals(denied.error.code, "CONVERSATION_NOT_FOUND");
    }
  }
});

Deno.test("messageItem maps snake_case rows to the client shape", () => {
  assertEquals(
    messageItem({
      id: "m1",
      sender_id: SENDER_ID,
      body: "hello",
      created_at: "2026-07-21T10:00:00.000Z",
    }),
    { id: "m1", senderId: SENDER_ID, body: "hello", createdAt: "2026-07-21T10:00:00.000Z" },
  );
});

Deno.test("handler rejects non-POST methods", async () => {
  const response = await handler(new Request("https://functions.test/", { method: "GET" }));
  assertEquals(response.status, 405);
  const payload = await response.json();
  assertEquals(payload.code, "METHOD_NOT_ALLOWED");
});

Deno.test("handler rejects invalid JSON bodies", async () => {
  const response = await handler(
    new Request("https://functions.test/", { method: "POST", body: "not json" }),
  );
  assertEquals(response.status, 400);
  const payload = await response.json();
  assertEquals(payload.code, "INVALID_REQUEST");
});
