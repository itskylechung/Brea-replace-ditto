import {
  type AttendeeProfileRow,
  buildAttendeeList,
  eventItem,
  type EventRow,
  handler,
  validateEventsInput,
} from "./events.ts";

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

const NOW = new Date("2026-07-22T12:00:00.000Z");
const EVENT_ID = "00000000-0000-4000-8000-000000000301";
const HOST_ID = "00000000-0000-4000-8000-000000000101";
const CALLER_ID = "00000000-0000-4000-8000-000000000102";
const OTHER_ID = "00000000-0000-4000-8000-000000000103";
const HIDDEN_ID = "00000000-0000-4000-8000-000000000104";

function createBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    action: "create",
    title: "Tech singles Taipei",
    startsAt: "2026-08-01T11:00:00.000Z",
    placeLabel: "Da'an Park entrance",
    capacity: 20,
    tags: ["tech", "founders"],
    ...overrides,
  };
}

Deno.test("validateEventsInput accepts every action and normalizes create fields", () => {
  assertEquals(validateEventsInput({ action: "list" }, NOW), {
    ok: true,
    value: { action: "list" },
  });
  assertEquals(validateEventsInput({ action: "rsvp", eventId: EVENT_ID }, NOW), {
    ok: true,
    value: { action: "rsvp", eventId: EVENT_ID },
  });
  assertEquals(
    validateEventsInput(
      createBody({ title: "  Tech singles Taipei  ", tags: ["tech", "tech", " "] }),
      NOW,
    ),
    {
      ok: true,
      value: {
        action: "create",
        title: "Tech singles Taipei",
        startsAt: "2026-08-01T11:00:00.000Z",
        placeLabel: "Da'an Park entrance",
        capacity: 20,
        tags: ["tech"],
      },
    },
  );
});

Deno.test("validateEventsInput rejects malformed input", () => {
  assert(!validateEventsInput("not-an-object", NOW).ok);
  assert(!validateEventsInput({ action: "delete" }, NOW).ok);
  assert(!validateEventsInput({ action: "rsvp", eventId: "not-a-uuid" }, NOW).ok);
  assert(!validateEventsInput(createBody({ title: "ab" }), NOW).ok);
  assert(!validateEventsInput(createBody({ startsAt: "yesterday" }), NOW).ok);
  assert(
    !validateEventsInput(createBody({ startsAt: "2026-07-22T11:00:00.000Z" }), NOW).ok,
    "past start",
  );
  assert(!validateEventsInput(createBody({ capacity: 1 }), NOW).ok);
  assert(!validateEventsInput(createBody({ capacity: 501 }), NOW).ok);
  assert(!validateEventsInput(createBody({ capacity: 10.5 }), NOW).ok);
  assert(
    !validateEventsInput(createBody({ tags: Array.from({ length: 11 }, (_, i) => `t${i}`) }), NOW)
      .ok,
  );
  assert(!validateEventsInput(createBody({ tags: ["x".repeat(31)] }), NOW).ok);
});

Deno.test("eventItem maps rows to the client shape and marks the host", () => {
  const row: EventRow = {
    id: EVENT_ID,
    host_id: HOST_ID,
    title: "Founder mixer",
    starts_at: "2026-08-01T11:00:00.000Z",
    place_label: "Songshan rooftop",
    capacity: 30,
    tags: ["founders"],
    created_at: "2026-07-22T09:00:00.000Z",
  };
  assertEquals(eventItem(row, "Maya Chen", 5, HOST_ID, true), {
    id: EVENT_ID,
    title: "Founder mixer",
    startsAt: "2026-08-01T11:00:00.000Z",
    placeLabel: "Songshan rooftop",
    capacity: 30,
    tags: ["founders"],
    hostName: "Maya Chen",
    attendeeCount: 5,
    isAttending: true,
    isHost: true,
  });
  assert(!eventItem(row, "Maya Chen", 5, CALLER_ID, false).isHost);
});

Deno.test("buildAttendeeList hides self, non-discoverable, blocked, and missing profiles", () => {
  const profile = (id: string, discoverable: boolean): AttendeeProfileRow => ({
    id,
    name: `person-${id.slice(-1)}`,
    avatar_url: null,
    photos: [{ url: "https://cdn.example/p.jpg", key: "p.jpg" }],
    headline: "Here for the mixer",
    is_discoverable: discoverable,
  });
  const profilesById = new Map<string, AttendeeProfileRow>([
    [HOST_ID, profile(HOST_ID, true)],
    [OTHER_ID, profile(OTHER_ID, false)],
    [HIDDEN_ID, profile(HIDDEN_ID, true)],
  ]);
  const result = buildAttendeeList(
    [HOST_ID, CALLER_ID, OTHER_ID, HIDDEN_ID],
    profilesById,
    CALLER_ID,
    new Set([HIDDEN_ID]),
  );
  assertEquals(result, {
    attendees: [{
      id: HOST_ID,
      name: "person-1",
      avatarUrl: "https://cdn.example/p.jpg",
      headline: "Here for the mixer",
    }],
    hiddenCount: 2,
  });
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
