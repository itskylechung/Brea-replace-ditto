import {
  type ConnectionRow,
  handler,
  parseAllowedOrigins,
  planConnectionResponse,
  respondedResponse,
  validateResponseInput,
} from "./connection-respond.ts";

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
const RECIPIENT_ID = "00000000-0000-4000-8000-000000000101";
const OTHER_ID = "00000000-0000-4000-8000-000000000102";
const RESPONDED_AT = "2026-07-20T10:00:00.000Z";

function connection(overrides: Partial<ConnectionRow> = {}): ConnectionRow {
  return {
    id: CONNECTION_ID,
    sender_id: OTHER_ID,
    recipient_id: RECIPIENT_ID,
    status: "pending",
    responded_at: null,
    ...overrides,
  };
}

Deno.test("validateResponseInput accepts accept/decline and rejects malformed input", () => {
  assertEquals(validateResponseInput({ connectionId: CONNECTION_ID, action: "accept" }), {
    ok: true,
    value: { connectionId: CONNECTION_ID, action: "accept" },
  });
  assertEquals(validateResponseInput({ connectionId: CONNECTION_ID, action: "decline" }), {
    ok: true,
    value: { connectionId: CONNECTION_ID, action: "decline" },
  });
  assert(!validateResponseInput({ connectionId: CONNECTION_ID, action: "maybe" }).ok);
  assert(!validateResponseInput({ connectionId: "not-a-uuid", action: "accept" }).ok);
  assert(!validateResponseInput("not-an-object").ok);
});

Deno.test("planConnectionResponse rejects a caller who is not the recipient", () => {
  const missing = planConnectionResponse(null, RECIPIENT_ID, "accept");
  assert(missing.kind === "error");
  assertEquals(missing.status, 404);
  assertEquals(missing.error.code, "REQUEST_NOT_FOUND");

  // Only the recipient may respond: a caller who owns a different profile is rejected
  // with the same not-found code, never revealing the request exists.
  const wrongUser = planConnectionResponse(connection(), OTHER_ID, "accept");
  assert(wrongUser.kind === "error");
  assertEquals(wrongUser.status, 404);
  assertEquals(wrongUser.error.code, "REQUEST_NOT_FOUND");
});

Deno.test("planConnectionResponse applies accept and decline transitions for the recipient", () => {
  assertEquals(planConnectionResponse(connection(), RECIPIENT_ID, "accept"), {
    kind: "apply",
    id: CONNECTION_ID,
    nextStatus: "accepted",
  });
  assertEquals(planConnectionResponse(connection(), RECIPIENT_ID, "decline"), {
    kind: "apply",
    id: CONNECTION_ID,
    nextStatus: "declined",
  });
});

Deno.test("planConnectionResponse is idempotent when the status already matches", () => {
  const plan = planConnectionResponse(
    connection({ status: "accepted", responded_at: RESPONDED_AT }),
    RECIPIENT_ID,
    "accept",
  );
  // A repeat accept returns the existing row (including responded_at) without a re-write.
  assertEquals(plan, {
    kind: "noop",
    body: { id: CONNECTION_ID, status: "accepted", respondedAt: RESPONDED_AT },
  });
});

Deno.test("planConnectionResponse refuses to flip an already-resolved request", () => {
  const plan = planConnectionResponse(
    connection({ status: "accepted", responded_at: RESPONDED_AT }),
    RECIPIENT_ID,
    "decline",
  );
  assert(plan.kind === "error");
  assertEquals(plan.status, 409);
  assertEquals(plan.error.code, "REQUEST_ALREADY_RESOLVED");
});

Deno.test("respondedResponse renames responded_at to respondedAt", () => {
  assertEquals(
    respondedResponse({ id: CONNECTION_ID, status: "accepted", responded_at: RESPONDED_AT }),
    { id: CONNECTION_ID, status: "accepted", respondedAt: RESPONDED_AT },
  );
  assertEquals(
    respondedResponse({ id: CONNECTION_ID, status: "pending", responded_at: null }),
    { id: CONNECTION_ID, status: "pending", respondedAt: null },
  );
});

Deno.test("parseAllowedOrigins trims a comma-separated exact allowlist", () => {
  assertEquals(
    [...parseAllowedOrigins("https://brea.example, https://preview.example")],
    ["https://brea.example", "https://preview.example"],
  );
});

Deno.test("handler applies exact-origin CORS to OPTIONS", async () => {
  const previous = Deno.env.get("BREA_ALLOWED_ORIGINS");
  Deno.env.set("BREA_ALLOWED_ORIGINS", "https://brea.example");

  try {
    const response = await handler(
      new Request("https://function.example", {
        method: "OPTIONS",
        headers: { Origin: "https://brea.example" },
      }),
    );

    assertEquals(response.status, 204);
    assertEquals(response.headers.get("Access-Control-Allow-Origin"), "https://brea.example");
    assertEquals(response.headers.get("Vary"), "Origin");
  } finally {
    if (previous === undefined) Deno.env.delete("BREA_ALLOWED_ORIGINS");
    else Deno.env.set("BREA_ALLOWED_ORIGINS", previous);
  }
});

Deno.test("handler rejects a non-allowlisted origin with CORS metadata", async () => {
  const previous = Deno.env.get("BREA_ALLOWED_ORIGINS");
  Deno.env.set("BREA_ALLOWED_ORIGINS", "https://brea.example");

  try {
    const response = await handler(
      new Request("https://function.example", {
        method: "OPTIONS",
        headers: { Origin: "https://evil.example" },
      }),
    );

    assertEquals(response.status, 403);
    assertEquals(await response.json(), {
      code: "ORIGIN_NOT_ALLOWED",
      message: "This origin is not allowed.",
      error: "ORIGIN_NOT_ALLOWED",
    });
    assertEquals(response.headers.get("Access-Control-Allow-Origin"), null);
  } finally {
    if (previous === undefined) Deno.env.delete("BREA_ALLOWED_ORIGINS");
    else Deno.env.set("BREA_ALLOWED_ORIGINS", previous);
  }
});
