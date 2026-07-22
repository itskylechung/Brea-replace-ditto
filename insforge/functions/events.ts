import { createAdminClient, createClient } from "npm:@insforge/sdk@1.4.5";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
// ponytail: fixed window, no pagination — clients see the next 50 upcoming
// events. Add a cursor when any city has more than a page of live events.
const LIST_LIMIT = 50;
const MAX_TAGS = 10;
const MAX_TAG_LENGTH = 30;

type ApiError = { code: string; message: string };
type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: ApiError };

export type EventsInput =
  | { action: "list" }
  | {
    action: "create";
    title: string;
    startsAt: string;
    placeLabel: string;
    capacity: number;
    tags: string[];
  }
  | { action: "rsvp"; eventId: string }
  | { action: "cancel"; eventId: string }
  | { action: "attendees"; eventId: string };

export type EventRow = {
  id: string;
  host_id: string;
  title: string;
  starts_at: string;
  place_label: string;
  capacity: number;
  tags: string[];
  created_at: string;
};

export type AttendeeProfileRow = {
  id: string;
  name: string;
  avatar_url: string | null;
  photos: unknown;
  headline: string | null;
  is_discoverable: boolean;
};

function invalid(message: string): { ok: false; error: ApiError } {
  return { ok: false, error: { code: "INVALID_REQUEST", message } };
}

function eventIdInput(
  action: "rsvp" | "cancel" | "attendees",
  body: Record<string, unknown>,
): ValidationResult<EventsInput> {
  if (typeof body.eventId !== "string" || !UUID_PATTERN.test(body.eventId)) {
    return invalid("eventId must be a valid UUID.");
  }
  return { ok: true, value: { action, eventId: body.eventId } };
}

export function validateEventsInput(value: unknown, now: Date): ValidationResult<EventsInput> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return invalid("Request body must be a JSON object.");
  }
  const body = value as Record<string, unknown>;
  if (body.action === "list") return { ok: true, value: { action: "list" } };
  if (body.action === "rsvp" || body.action === "cancel" || body.action === "attendees") {
    return eventIdInput(body.action, body);
  }
  if (body.action !== "create") {
    return invalid("action must be list, create, rsvp, cancel, or attendees.");
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (title.length < 3 || title.length > 120) {
    return invalid("A title must be between 3 and 120 characters.");
  }
  const placeLabel = typeof body.placeLabel === "string" ? body.placeLabel.trim() : "";
  if (placeLabel.length < 2 || placeLabel.length > 160) {
    return invalid("A place must be between 2 and 160 characters.");
  }
  const startsAtMs = typeof body.startsAt === "string" ? Date.parse(body.startsAt) : NaN;
  if (!Number.isFinite(startsAtMs)) {
    return invalid("startsAt must be a valid date-time.");
  }
  if (startsAtMs <= now.getTime()) {
    return invalid("An event must start in the future.");
  }
  const capacity = body.capacity;
  if (
    typeof capacity !== "number" || !Number.isInteger(capacity) || capacity < 2 || capacity > 500
  ) {
    return invalid("Capacity must be a whole number between 2 and 500.");
  }
  const rawTags = Array.isArray(body.tags) ? body.tags : [];
  const tags = [
    ...new Set(
      rawTags.filter((tag): tag is string => typeof tag === "string")
        .map((tag) => tag.trim()).filter(Boolean),
    ),
  ];
  if (tags.length > MAX_TAGS || tags.some((tag) => tag.length > MAX_TAG_LENGTH)) {
    return invalid(`Use at most ${MAX_TAGS} tags of up to ${MAX_TAG_LENGTH} characters each.`);
  }
  return {
    ok: true,
    value: {
      action: "create",
      title,
      startsAt: new Date(startsAtMs).toISOString(),
      placeLabel,
      capacity,
      tags,
    },
  };
}

export function eventItem(
  event: EventRow,
  hostName: string,
  attendeeCount: number,
  callerProfileId: string,
  isAttending: boolean,
) {
  return {
    id: event.id,
    title: event.title,
    startsAt: event.starts_at,
    placeLabel: event.place_label,
    capacity: event.capacity,
    tags: event.tags,
    hostName,
    attendeeCount,
    isAttending,
    isHost: event.host_id === callerProfileId,
  };
}

export function parsePhotoUrls(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((photo) => {
    if (!photo || typeof photo !== "object" || Array.isArray(photo)) return [];
    const url = (photo as Record<string, unknown>).url;
    return typeof url === "string" && url.trim() ? [url.trim()] : [];
  }).slice(0, 6);
}

// The attendee list is a discovery surface: only members who RSVP'd may see
// it, and it only shows discoverable attendees who have no block in either
// direction with the caller. Everyone else is folded into hiddenCount.
export function buildAttendeeList(
  attendeeProfileIds: string[],
  profilesById: Map<string, AttendeeProfileRow>,
  callerProfileId: string,
  blockedProfileIds: Set<string>,
): {
  attendees: { id: string; name: string; avatarUrl: string | null; headline: string | null }[];
  hiddenCount: number;
} {
  const attendees: {
    id: string;
    name: string;
    avatarUrl: string | null;
    headline: string | null;
  }[] = [];
  let hiddenCount = 0;
  for (const profileId of attendeeProfileIds) {
    if (profileId === callerProfileId) continue;
    const person = profilesById.get(profileId);
    if (!person || !person.is_discoverable || blockedProfileIds.has(profileId)) {
      hiddenCount += 1;
      continue;
    }
    attendees.push({
      id: person.id,
      name: person.name,
      avatarUrl: parsePhotoUrls(person.photos)[0] ?? person.avatar_url,
      headline: person.headline,
    });
  }
  return { attendees, hiddenCount };
}

export function parseAllowedOrigins(value: string | undefined): Set<string> {
  return new Set((value ?? "").split(",").map((origin) => origin.trim()).filter(Boolean));
}

function bearerToken(headers: Headers): string | null {
  const authorization = headers.get("Authorization")?.trim();
  return authorization?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || null;
}

function corsHeaders(origin: string | null, allowedOrigins: Set<string>): Headers {
  const headers = new Headers({
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  });
  if (origin && allowedOrigins.has(origin)) headers.set("Access-Control-Allow-Origin", origin);
  return headers;
}

function jsonResponse(
  body: unknown,
  status: number,
  origin: string | null,
  allowedOrigins: Set<string>,
): Response {
  const headers = corsHeaders(origin, allowedOrigins);
  headers.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(body), { status, headers });
}

// Mirror the coded `code` into the SDK-standard `error` key so @insforge/sdk's
// parseResponse surfaces the real code/message instead of a generic fallback.
function errorResponse(
  error: ApiError,
  status: number,
  origin: string | null,
  allowedOrigins: Set<string>,
): Response {
  return jsonResponse({ ...error, error: error.code }, status, origin, allowedOrigins);
}

function configuration(): ValidationResult<{ baseUrl: string; apiKey: string }> {
  const baseUrl = Deno.env.get("INSFORGE_BASE_URL")?.trim();
  const apiKey = Deno.env.get("API_KEY")?.trim();
  if (!baseUrl || !apiKey) {
    return {
      ok: false,
      error: { code: "SERVICE_UNAVAILABLE", message: "Events are temporarily unavailable." },
    };
  }
  return { ok: true, value: { baseUrl, apiKey } };
}

const internalError = (): ApiError => ({
  code: "INTERNAL_ERROR",
  message: "Events are temporarily unavailable.",
});

type Admin = ReturnType<typeof createAdminClient>;

async function rsvpProfileIds(admin: Admin, eventId: string): Promise<string[] | null> {
  const { data, error } = await admin.database
    .from("event_rsvps")
    .select("profile_id, created_at")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });
  if (error) return null;
  return ((data ?? []) as unknown as { profile_id: string }[]).map((row) => row.profile_id);
}

async function handleRequest(request: Request): Promise<Response> {
  const origin = request.headers.get("Origin");
  const allowedOrigins = parseAllowedOrigins(Deno.env.get("BREA_ALLOWED_ORIGINS"));
  if (origin && !allowedOrigins.has(origin)) {
    return errorResponse(
      { code: "ORIGIN_NOT_ALLOWED", message: "This origin is not allowed." },
      403,
      origin,
      allowedOrigins,
    );
  }
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin, allowedOrigins) });
  }
  if (request.method !== "POST") {
    return errorResponse(
      { code: "METHOD_NOT_ALLOWED", message: "Only POST requests are supported." },
      405,
      origin,
      allowedOrigins,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(
      { code: "INVALID_REQUEST", message: "Request body must contain valid JSON." },
      400,
      origin,
      allowedOrigins,
    );
  }
  const input = validateEventsInput(body, new Date());
  if (!input.ok) return errorResponse(input.error, 400, origin, allowedOrigins);

  const config = configuration();
  if (!config.ok) return errorResponse(config.error, 503, origin, allowedOrigins);
  const accessToken = bearerToken(request.headers);
  if (!accessToken) {
    return errorResponse(
      { code: "AUTH_REQUIRED", message: "Sign in to browse events." },
      401,
      origin,
      allowedOrigins,
    );
  }

  const authClient = createClient({ baseUrl: config.value.baseUrl, accessToken });
  const { data: userData, error: userError } = await authClient.auth.getCurrentUser();
  if (userError || !userData?.user) {
    return errorResponse(
      { code: "INVALID_SESSION", message: "Your session has expired. Sign in again." },
      401,
      origin,
      allowedOrigins,
    );
  }

  const admin = createAdminClient({ baseUrl: config.value.baseUrl, apiKey: config.value.apiKey });
  const { data: profileData, error: profileError } = await admin.database
    .from("profiles").select("id").eq("user_id", userData.user.id).maybeSingle();
  if (profileError || !profileData) {
    return errorResponse(
      { code: "PROFILE_SETUP_REQUIRED", message: "Complete your Brea profile first." },
      409,
      origin,
      allowedOrigins,
    );
  }
  const profileId = (profileData as { id: string }).id;
  const eventFields = "id, host_id, title, starts_at, place_label, capacity, tags, created_at";

  if (input.value.action === "list") {
    const { data: eventsData, error: eventsError } = await admin.database
      .from("events")
      .select(eventFields)
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(LIST_LIMIT);
    if (eventsError) return errorResponse(internalError(), 500, origin, allowedOrigins);
    const events = (eventsData ?? []) as unknown as EventRow[];

    const eventIds = events.map((event) => event.id);
    const hostIds = [...new Set(events.map((event) => event.host_id))];
    // ponytail: counts computed client-side from all RSVP rows of one page of
    // events (≤ 50 × capacity ≤ 500). Move to a SQL aggregate view if slow.
    const [rsvpsResult, hostsResult] = await Promise.all([
      eventIds.length > 0
        ? admin.database.from("event_rsvps").select("event_id, profile_id").in("event_id", eventIds)
        : Promise.resolve({ data: [], error: null }),
      hostIds.length > 0
        ? admin.database.from("profiles").select("id, name").in("id", hostIds)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (rsvpsResult.error || hostsResult.error) {
      return errorResponse(internalError(), 500, origin, allowedOrigins);
    }
    const rsvps = (rsvpsResult.data ?? []) as unknown as { event_id: string; profile_id: string }[];
    const hostNames = new Map(
      ((hostsResult.data ?? []) as unknown as { id: string; name: string }[])
        .map((host) => [host.id, host.name]),
    );
    const counts = new Map<string, number>();
    const attending = new Set<string>();
    for (const rsvp of rsvps) {
      counts.set(rsvp.event_id, (counts.get(rsvp.event_id) ?? 0) + 1);
      if (rsvp.profile_id === profileId) attending.add(rsvp.event_id);
    }
    return jsonResponse(
      {
        events: events.map((event) =>
          eventItem(
            event,
            hostNames.get(event.host_id) ?? "A Brea member",
            counts.get(event.id) ?? 0,
            profileId,
            attending.has(event.id),
          )
        ),
      },
      200,
      origin,
      allowedOrigins,
    );
  }

  if (input.value.action === "create") {
    const { data: createdData, error: createError } = await admin.database
      .from("events")
      .insert([{
        host_id: profileId,
        title: input.value.title,
        starts_at: input.value.startsAt,
        place_label: input.value.placeLabel,
        capacity: input.value.capacity,
        tags: input.value.tags,
      }])
      .select(eventFields)
      .single();
    if (createError || !createdData) {
      return errorResponse(internalError(), 500, origin, allowedOrigins);
    }
    const created = createdData as unknown as EventRow;
    // The host attends their own event; this also makes the attendee list
    // visible to them without a special host case.
    const { error: hostRsvpError } = await admin.database
      .from("event_rsvps")
      .insert([{ event_id: created.id, profile_id: profileId }]);
    if (hostRsvpError) return errorResponse(internalError(), 500, origin, allowedOrigins);
    await admin.database.from("product_events").insert([{
      profile_id: profileId,
      event_name: "event_created",
      properties: { capacity: created.capacity, tags: created.tags.length },
    }]);
    const { data: hostData } = await admin.database
      .from("profiles").select("name").eq("id", profileId).maybeSingle();
    const hostName = (hostData as { name: string } | null)?.name ?? "A Brea member";
    return jsonResponse(
      eventItem(created, hostName, 1, profileId, true),
      200,
      origin,
      allowedOrigins,
    );
  }

  // rsvp / cancel / attendees all need the event and its RSVP roster.
  const { data: eventData, error: eventError } = await admin.database
    .from("events").select(eventFields).eq("id", input.value.eventId).maybeSingle();
  if (eventError) return errorResponse(internalError(), 500, origin, allowedOrigins);
  const event = eventData as unknown as EventRow | null;
  if (!event) {
    return errorResponse(
      { code: "EVENT_NOT_FOUND", message: "This event is not available." },
      404,
      origin,
      allowedOrigins,
    );
  }

  const attendeeIds = await rsvpProfileIds(admin, event.id);
  if (attendeeIds === null) return errorResponse(internalError(), 500, origin, allowedOrigins);
  const isAttending = attendeeIds.includes(profileId);

  if (input.value.action === "rsvp") {
    if (Date.parse(event.starts_at) <= Date.now()) {
      return errorResponse(
        { code: "EVENT_PAST", message: "This event has already started." },
        409,
        origin,
        allowedOrigins,
      );
    }
    if (isAttending) {
      return jsonResponse(
        { eventId: event.id, attendeeCount: attendeeIds.length, isAttending: true },
        200,
        origin,
        allowedOrigins,
      );
    }
    // ponytail: count-then-insert can oversell by a request or two under
    // concurrency; add a DB trigger with a row lock if exact capacity matters.
    if (attendeeIds.length >= event.capacity) {
      return errorResponse(
        { code: "EVENT_FULL", message: "This event is already full." },
        409,
        origin,
        allowedOrigins,
      );
    }
    const { error: rsvpError } = await admin.database
      .from("event_rsvps")
      .insert([{ event_id: event.id, profile_id: profileId }]);
    if (rsvpError && (rsvpError as { code?: string }).code !== "23505") {
      return errorResponse(internalError(), 500, origin, allowedOrigins);
    }
    await admin.database.from("product_events").insert([{
      profile_id: profileId,
      event_name: "event_rsvped",
      properties: {},
    }]);
    return jsonResponse(
      { eventId: event.id, attendeeCount: attendeeIds.length + 1, isAttending: true },
      200,
      origin,
      allowedOrigins,
    );
  }

  if (input.value.action === "cancel") {
    if (isAttending) {
      const { error: cancelError } = await admin.database
        .from("event_rsvps")
        .delete()
        .eq("event_id", event.id)
        .eq("profile_id", profileId);
      if (cancelError) return errorResponse(internalError(), 500, origin, allowedOrigins);
    }
    return jsonResponse(
      {
        eventId: event.id,
        attendeeCount: isAttending ? attendeeIds.length - 1 : attendeeIds.length,
        isAttending: false,
      },
      200,
      origin,
      allowedOrigins,
    );
  }

  // attendees: RSVP-gated discovery surface.
  if (!isAttending) {
    return errorResponse(
      { code: "RSVP_REQUIRED", message: "RSVP to see who is going." },
      403,
      origin,
      allowedOrigins,
    );
  }
  const otherIds = attendeeIds.filter((id) => id !== profileId);
  const profilesById = new Map<string, AttendeeProfileRow>();
  const blockedProfileIds = new Set<string>();
  if (otherIds.length > 0) {
    const [peopleResult, blocksResult] = await Promise.all([
      admin.database.from("profiles")
        .select("id, name, avatar_url, photos, headline, is_discoverable")
        .in("id", otherIds),
      admin.database.from("profile_blocks")
        .select("blocker_profile_id, blocked_profile_id")
        .or(`blocker_profile_id.eq.${profileId},blocked_profile_id.eq.${profileId}`),
    ]);
    if (peopleResult.error || blocksResult.error) {
      return errorResponse(internalError(), 500, origin, allowedOrigins);
    }
    for (const person of (peopleResult.data ?? []) as unknown as AttendeeProfileRow[]) {
      profilesById.set(person.id, person);
    }
    const blocks = (blocksResult.data ?? []) as unknown as {
      blocker_profile_id: string;
      blocked_profile_id: string;
    }[];
    for (const block of blocks) {
      blockedProfileIds.add(
        block.blocker_profile_id === profileId
          ? block.blocked_profile_id
          : block.blocker_profile_id,
      );
    }
  }
  return jsonResponse(
    {
      eventId: event.id,
      ...buildAttendeeList(attendeeIds, profilesById, profileId, blockedProfileIds),
    },
    200,
    origin,
    allowedOrigins,
  );
}

export async function handler(request: Request): Promise<Response> {
  const origin = request.headers.get("Origin");
  let allowedOrigins = new Set<string>();
  try {
    allowedOrigins = parseAllowedOrigins(Deno.env.get("BREA_ALLOWED_ORIGINS"));
    return await handleRequest(request);
  } catch {
    return errorResponse(internalError(), 500, origin, allowedOrigins);
  }
}

export default handler;
