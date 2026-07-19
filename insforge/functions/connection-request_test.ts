import {
  handler,
  isUuid,
  parseAllowedOrigins,
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
