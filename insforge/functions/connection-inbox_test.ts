import {
  buildInbox,
  connectionItem,
  type ConnectionRow,
  handler,
  parseAllowedOrigins,
  type ProfileRow,
} from "./connection-inbox.ts";

function assertEquals(actual: unknown, expected: unknown): void {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    throw new Error(`Expected ${expectedJson}, received ${actualJson}`);
  }
}

const SELF_ID = "00000000-0000-4000-8000-000000000100";
const SENDER_ID = "00000000-0000-4000-8000-000000000101";
const RECIPIENT_ID = "00000000-0000-4000-8000-000000000102";

function person(overrides: Partial<ProfileRow> = {}): ProfileRow {
  return {
    id: SENDER_ID,
    name: "Maya Chen",
    avatar_url: null,
    headline: "Product designer",
    location_label: "Taipei",
    linkedin_profile_url: "https://www.linkedin.com/in/maya",
    ...overrides,
  };
}

function connection(overrides: Partial<ConnectionRow> = {}): ConnectionRow {
  return {
    id: "00000000-0000-4000-8000-000000000201",
    sender_id: SENDER_ID,
    recipient_id: RECIPIENT_ID,
    status: "pending",
    source_query: "hiking partner",
    created_at: "2026-07-20T00:00:00.000Z",
    responded_at: null,
    ...overrides,
  };
}

Deno.test("connectionItem projects the person and withholds LinkedIn until accepted", () => {
  assertEquals(connectionItem(connection(), "incoming", person()), {
    id: "00000000-0000-4000-8000-000000000201",
    direction: "incoming",
    status: "pending",
    sourceQuery: "hiking partner",
    createdAt: "2026-07-20T00:00:00.000Z",
    respondedAt: null,
    person: {
      id: SENDER_ID,
      name: "Maya Chen",
      avatarUrl: null,
      headline: "Product designer",
      locationLabel: "Taipei",
      // LinkedIn URL stays hidden while the request is still pending.
      linkedinProfileUrl: null,
    },
  });

  const accepted = connectionItem(
    connection({ status: "accepted", responded_at: "2026-07-20T01:00:00.000Z" }),
    "outgoing",
    person(),
  );
  assertEquals(accepted.direction, "outgoing");
  assertEquals(accepted.status, "accepted");
  assertEquals(accepted.respondedAt, "2026-07-20T01:00:00.000Z");
  // Once accepted, the connection unlocks the LinkedIn URL.
  assertEquals(accepted.person.linkedinProfileUrl, "https://www.linkedin.com/in/maya");
});

Deno.test("buildInbox groups incoming/outgoing and drops rows without a matching person", () => {
  const incomingPerson = person({ id: SENDER_ID, name: "Incoming Person" });
  const outgoingPerson = person({ id: RECIPIENT_ID, name: "Outgoing Person" });
  const profilesById = new Map<string, ProfileRow>([
    [incomingPerson.id, incomingPerson],
    [outgoingPerson.id, outgoingPerson],
  ]);

  // Incoming rows are keyed by sender_id; outgoing rows by recipient_id.
  const incomingRow = connection({
    id: "00000000-0000-4000-8000-000000000301",
    sender_id: SENDER_ID,
    recipient_id: SELF_ID,
  });
  const outgoingRow = connection({
    id: "00000000-0000-4000-8000-000000000302",
    sender_id: SELF_ID,
    recipient_id: RECIPIENT_ID,
  });
  // Orphan row: its sender is absent from profilesById, so it is dropped.
  const orphanRow = connection({
    id: "00000000-0000-4000-8000-000000000303",
    sender_id: "00000000-0000-4000-8000-0000000009ff",
    recipient_id: SELF_ID,
  });

  const inbox = buildInbox([incomingRow, orphanRow], [outgoingRow], profilesById);

  assertEquals(inbox.incoming.length, 1);
  assertEquals(inbox.incoming[0].id, "00000000-0000-4000-8000-000000000301");
  assertEquals(inbox.incoming[0].direction, "incoming");
  assertEquals(inbox.incoming[0].person.name, "Incoming Person");

  assertEquals(inbox.outgoing.length, 1);
  assertEquals(inbox.outgoing[0].id, "00000000-0000-4000-8000-000000000302");
  assertEquals(inbox.outgoing[0].direction, "outgoing");
  assertEquals(inbox.outgoing[0].person.name, "Outgoing Person");
});

Deno.test("buildInbox returns empty arrays when there are no connections", () => {
  assertEquals(buildInbox([], [], new Map()), { incoming: [], outgoing: [] });
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
    });
    assertEquals(response.headers.get("Access-Control-Allow-Origin"), null);
  } finally {
    if (previous === undefined) Deno.env.delete("BREA_ALLOWED_ORIGINS");
    else Deno.env.set("BREA_ALLOWED_ORIGINS", previous);
  }
});
