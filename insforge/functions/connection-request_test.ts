import {
  bearerToken,
  connectionResponse,
  existingConnectionAction,
  handler,
  isUuid,
  parseAllowedOrigins,
  recipientAvailabilityError,
  reverseConnectionConflict,
  validateConnectionInput,
} from "./connection-request.ts";

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

const RECIPIENT_ID = "00000000-0000-4000-8000-000000000101";

Deno.test("bearerToken accepts a Bearer token and rejects other authorization schemes", () => {
  assertEquals(bearerToken(new Headers({ Authorization: "Bearer signed-token" })), "signed-token");
  assertEquals(bearerToken(new Headers({ Authorization: "Basic credentials" })), null);
  assertEquals(bearerToken(new Headers()), null);
});

Deno.test("isUuid accepts canonical UUIDs and rejects malformed values", () => {
  assert(isUuid(RECIPIENT_ID));
  assert(!isUuid("not-a-uuid"));
  assert(!isUuid("00000000-0000-0000-0000-000000000000"));
});

Deno.test("validateConnectionInput trims a valid source query", () => {
  assertEquals(
    validateConnectionInput({ recipientId: RECIPIENT_ID, sourceQuery: "  hiking partner  " }),
    {
      ok: true,
      value: { recipientId: RECIPIENT_ID, sourceQuery: "hiking partner" },
    },
  );
});

Deno.test("validateConnectionInput enforces recipient and source query contracts", () => {
  assert(!validateConnectionInput({ recipientId: "bad", sourceQuery: "hiking" }).ok);
  assert(!validateConnectionInput({ recipientId: RECIPIENT_ID, sourceQuery: "x" }).ok);
  assert(!validateConnectionInput({ recipientId: RECIPIENT_ID, sourceQuery: "x".repeat(201) }).ok);
});

Deno.test("parseAllowedOrigins trims a comma-separated exact allowlist", () => {
  assertEquals(
    [...parseAllowedOrigins("https://brea.example, https://preview.example")],
    ["https://brea.example", "https://preview.example"],
  );
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
    });
    assertEquals(response.headers.get("Access-Control-Allow-Origin"), null);
    assertEquals(response.headers.get("Access-Control-Allow-Methods"), "POST, OPTIONS");
    assertEquals(response.headers.get("Vary"), "Origin");
  } finally {
    if (previous === undefined) Deno.env.delete("BREA_ALLOWED_ORIGINS");
    else Deno.env.set("BREA_ALLOWED_ORIGINS", previous);
  }
});

Deno.test("recipientAvailabilityError reports a missing recipient as RECIPIENT_NOT_FOUND", () => {
  assertEquals(recipientAvailabilityError(null), {
    error: { code: "RECIPIENT_NOT_FOUND", message: "The selected profile was not found." },
    status: 404,
  });
});

Deno.test("recipientAvailabilityError reports an unavailable recipient with a 409", () => {
  const available = {
    id: RECIPIENT_ID,
    is_discoverable: true,
    is_available: true,
    onboarding_completed: true,
  };
  assertEquals(recipientAvailabilityError(available), null);

  for (
    const override of [
      { onboarding_completed: false },
      { is_discoverable: false },
      { is_available: false },
    ]
  ) {
    const result = recipientAvailabilityError({ ...available, ...override });
    assert(result);
    assertEquals(result.status, 409);
    assertEquals(result.error.code, "RECIPIENT_UNAVAILABLE");
  }
});

Deno.test("reverseConnectionConflict maps an incoming request to a coded 409", () => {
  assertEquals(reverseConnectionConflict({ status: "pending" }), {
    code: "INCOMING_REQUEST_EXISTS",
    message: "This person already sent you a request. Review it in Requests.",
  });
  assertEquals(reverseConnectionConflict({ status: "accepted" }), {
    code: "ALREADY_CONNECTED",
    message: "You are already connected.",
  });
  assertEquals(reverseConnectionConflict({ status: "declined" }), null);
  assertEquals(reverseConnectionConflict(null), null);
});

Deno.test("existingConnectionAction re-requests declined rows and stays idempotent otherwise", () => {
  assertEquals(existingConnectionAction(null), "insert");
  assertEquals(existingConnectionAction({ status: "declined" }), "reactivate");
  assertEquals(existingConnectionAction({ status: "pending" }), "return");
  assertEquals(existingConnectionAction({ status: "accepted" }), "return");
});

Deno.test("connectionResponse projects the row and surfaces the created flag", () => {
  const row = {
    id: "00000000-0000-4000-8000-0000000002aa",
    recipient_id: RECIPIENT_ID,
    status: "pending" as const,
    created_at: "2026-07-20T00:00:00.000Z",
  };

  // A new insert or a reactivated (previously declined) request reports created:true
  // and lands back in the pending state.
  assertEquals(connectionResponse(row, true), {
    id: row.id,
    recipientId: RECIPIENT_ID,
    status: "pending",
    createdAt: row.created_at,
    created: true,
  });

  // A duplicate of an existing pending/accepted request is idempotent: created:false.
  assertEquals(connectionResponse(row, false), {
    id: row.id,
    recipientId: RECIPIENT_ID,
    status: "pending",
    createdAt: row.created_at,
    created: false,
  });
});
