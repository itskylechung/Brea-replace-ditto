import { handler, parseAdminEmails, validateModerationInput } from "./moderation-console.ts";

function assertEquals(actual: unknown, expected: unknown): void {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    throw new Error(`Expected ${expectedJson}, received ${actualJson}`);
  }
}

const REPORT_ID = "00000000-0000-4000-8000-000000000301";

Deno.test("validateModerationInput accepts the queue action", () => {
  assertEquals(validateModerationInput({ action: "queue" }), {
    ok: true,
    value: { action: "queue" },
  });
});

Deno.test("validateModerationInput accepts a resolve action and defaults hideProfile", () => {
  assertEquals(
    validateModerationInput({ action: "resolve", reportId: REPORT_ID, resolution: "dismissed" }),
    {
      ok: true,
      value: {
        action: "resolve",
        reportId: REPORT_ID,
        resolution: "dismissed",
        hideProfile: false,
      },
    },
  );
});

Deno.test("validateModerationInput rejects bad actions, ids, and resolutions", () => {
  for (
    const body of [
      null,
      [],
      { action: "delete" },
      { action: "resolve", reportId: "not-a-uuid", resolution: "resolved" },
      { action: "resolve", reportId: REPORT_ID, resolution: "banned" },
    ]
  ) {
    const result = validateModerationInput(body);
    assertEquals(result.ok, false);
  }
});

Deno.test("parseAdminEmails trims, lowercases, and drops blanks", () => {
  assertEquals(
    [...parseAdminEmails(" Kyle@Example.com ,, ops@brea.app ")],
    ["kyle@example.com", "ops@brea.app"],
  );
  assertEquals(parseAdminEmails(undefined).size, 0);
});

Deno.test("handler rejects non-POST methods", async () => {
  const response = await handler(new Request("https://functions.test/", { method: "GET" }));
  assertEquals(response.status, 405);
});
