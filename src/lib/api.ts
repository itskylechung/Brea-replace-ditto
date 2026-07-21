import { getInsforgeClient } from "./insforge";
import type { UserSchema } from "@insforge/sdk";
import type {
  BreaProfile,
  ChatMessage,
  ConnectionDecisionResponse,
  ConnectionInboxResponse,
  ConnectionItem,
  ConnectionResponse,
  PeopleSearchResponse,
  PersonMatch,
  ProfileUpdateInput,
  ReportReason,
} from "../types";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function valueAt(record: UnknownRecord, camelKey: string, snakeKey: string): unknown {
  return record[camelKey] ?? record[snakeKey];
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`The backend response is missing ${field}.`);
  }
  return value;
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function nullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function requiredBoolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") throw new Error(`The backend response is missing ${field}.`);
  return value;
}

const PROFILE_FIELDS = [
  "id",
  "user_id",
  "name",
  "avatar_url",
  "headline",
  "bio",
  "skills",
  "interests",
  "availability",
  "location_label",
  "latitude",
  "longitude",
  "linkedin_profile_url",
  "onboarding_completed",
  "is_discoverable",
  "is_available",
].join(", ");

function parseProfile(value: unknown): BreaProfile {
  if (!isRecord(value)) throw new Error("The backend returned an invalid profile.");
  return {
    id: requiredString(value.id, "profile id"),
    userId: requiredString(valueAt(value, "userId", "user_id"), "profile owner"),
    name: requiredString(value.name, "profile name"),
    avatarUrl: nullableString(valueAt(value, "avatarUrl", "avatar_url")),
    headline: nullableString(value.headline),
    bio: nullableString(value.bio),
    skills: stringArray(value.skills),
    interests: stringArray(value.interests),
    availability: nullableString(value.availability),
    locationLabel: nullableString(valueAt(value, "locationLabel", "location_label")),
    latitude: nullableNumber(value.latitude),
    longitude: nullableNumber(value.longitude),
    linkedinProfileUrl: nullableString(valueAt(value, "linkedinProfileUrl", "linkedin_profile_url")),
    onboardingCompleted: requiredBoolean(
      valueAt(value, "onboardingCompleted", "onboarding_completed"),
      "onboarding status",
    ),
    isDiscoverable: requiredBoolean(valueAt(value, "isDiscoverable", "is_discoverable"), "profile visibility"),
    isAvailable: requiredBoolean(valueAt(value, "isAvailable", "is_available"), "availability status"),
  };
}

function isUniqueViolation(error: unknown): boolean {
  return isRecord(error) && error.code === "23505";
}

function parsePerson(value: unknown): PersonMatch {
  if (!isRecord(value)) {
    throw new Error("The backend returned an invalid profile.");
  }

  const distance = valueAt(value, "distanceKm", "distance_km");
  if (typeof distance !== "number" || !Number.isFinite(distance) || distance < 0) {
    throw new Error("The backend response is missing a valid distance.");
  }

  // "pending" is the pre-lifecycle backend value; mapping it here lets this
  // frontend ship before the updated people-search function.
  const rawStatus = valueAt(value, "connectionStatus", "connection_status");
  const status = rawStatus === "pending" ? "outgoing_pending" : rawStatus;
  if (
    status !== "none" && status !== "outgoing_pending" &&
    status !== "incoming_pending" && status !== "accepted"
  ) {
    throw new Error("The backend returned an invalid connection status.");
  }

  return {
    id: requiredString(value.id, "profile id"),
    name: requiredString(value.name, "profile name"),
    avatarUrl: nullableString(valueAt(value, "avatarUrl", "avatar_url")),
    headline: requiredString(value.headline, "profile headline"),
    bio: nullableString(value.bio),
    distanceKm: distance,
    skills: stringArray(value.skills),
    interests: stringArray(value.interests),
    availability: nullableString(value.availability),
    matchReason: requiredString(valueAt(value, "matchReason", "match_reason"), "match reason"),
    connectionStatus: status,
  };
}

function parseSearchResponse(value: unknown): PeopleSearchResponse {
  if (!isRecord(value) || !Array.isArray(value.results)) {
    throw new Error("The search service returned an invalid response. Please try again.");
  }
  return { results: value.results.map(parsePerson) };
}

function parseConnectionResponse(value: unknown): ConnectionResponse {
  if (!isRecord(value)) {
    throw new Error("The connection service returned an invalid response.");
  }

  const recipientId = valueAt(value, "recipientId", "recipient_id");
  const createdAt = valueAt(value, "createdAt", "created_at");
  if ((value.status !== "pending" && value.status !== "accepted") || typeof value.created !== "boolean") {
    throw new Error("The connection service returned an invalid status.");
  }

  return {
    id: requiredString(value.id, "connection id"),
    recipientId: requiredString(recipientId, "recipient id"),
    status: value.status,
    createdAt: requiredString(createdAt, "creation time"),
    created: value.created,
  };
}

function parseConnectionItem(value: unknown): ConnectionItem {
  if (!isRecord(value) || !isRecord(value.person)) {
    throw new Error("The request service returned an invalid item.");
  }
  if (value.direction !== "incoming" && value.direction !== "outgoing") {
    throw new Error("The request service returned an invalid direction.");
  }
  if (value.status !== "pending" && value.status !== "accepted" && value.status !== "declined") {
    throw new Error("The request service returned an invalid status.");
  }
  const person = value.person;
  return {
    id: requiredString(value.id, "request id"),
    direction: value.direction,
    status: value.status,
    sourceQuery: requiredString(valueAt(value, "sourceQuery", "source_query"), "request context"),
    createdAt: requiredString(valueAt(value, "createdAt", "created_at"), "request creation time"),
    respondedAt: nullableString(valueAt(value, "respondedAt", "responded_at")),
    person: {
      id: requiredString(person.id, "person id"),
      name: requiredString(person.name, "person name"),
      avatarUrl: nullableString(valueAt(person, "avatarUrl", "avatar_url")),
      headline: nullableString(person.headline),
      locationLabel: nullableString(valueAt(person, "locationLabel", "location_label")),
      linkedinProfileUrl: nullableString(
        valueAt(person, "linkedinProfileUrl", "linkedin_profile_url"),
      ),
    },
  };
}

function parseInboxResponse(value: unknown): ConnectionInboxResponse {
  if (!isRecord(value) || !Array.isArray(value.incoming) || !Array.isArray(value.outgoing)) {
    throw new Error("The request service returned an invalid response.");
  }
  return {
    incoming: value.incoming.map(parseConnectionItem),
    outgoing: value.outgoing.map(parseConnectionItem),
  };
}

function parseChatMessage(value: unknown): ChatMessage {
  if (!isRecord(value)) {
    throw new Error("The messaging service returned an invalid message.");
  }
  return {
    id: requiredString(value.id, "message id"),
    senderId: requiredString(valueAt(value, "senderId", "sender_id"), "message sender"),
    body: requiredString(value.body, "message body"),
    createdAt: requiredString(valueAt(value, "createdAt", "created_at"), "message time"),
  };
}

function parseMessagesResponse(value: unknown): ChatMessage[] {
  if (!isRecord(value) || !Array.isArray(value.messages)) {
    throw new Error("The messaging service returned an invalid response.");
  }
  return value.messages.map(parseChatMessage);
}

function parseDecisionResponse(value: unknown): ConnectionDecisionResponse {
  if (!isRecord(value) || (value.status !== "accepted" && value.status !== "declined")) {
    throw new Error("The request service returned an invalid decision.");
  }
  return {
    id: requiredString(value.id, "request id"),
    status: value.status,
    respondedAt: requiredString(valueAt(value, "respondedAt", "responded_at"), "response time"),
  };
}

function errorMessage(error: unknown, fallback: string): string {
  if (isRecord(error) && typeof error.message === "string" && error.message.trim()) {
    return error.message;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

export class ConnectionRequestError extends Error {
  readonly code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "ConnectionRequestError";
    this.code = code;
  }
}

// The functions gateway surfaces the backend's error code on the thrown
// InsForgeError as either `code` or `error`; read both so callers can map
// specific 409s (INCOMING_REQUEST_EXISTS, ALREADY_CONNECTED,
// RECIPIENT_UNAVAILABLE) while unknown values fall back to a generic error.
function connectionErrorCode(error: unknown): string | undefined {
  if (!isRecord(error)) return undefined;
  const candidate = error.code ?? error.error;
  return typeof candidate === "string" ? candidate : undefined;
}

async function readCurrentProfile(userId: string): Promise<BreaProfile | null> {
  const { data, error } = await getInsforgeClient().database
    .from("profiles")
    .select(PROFILE_FIELDS)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(errorMessage(error, "We could not load your profile."));
  return data ? parseProfile(data) : null;
}

export async function ensureCurrentProfile(user: UserSchema): Promise<BreaProfile> {
  const existing = await readCurrentProfile(user.id);
  if (existing) return existing;

  const profileName = user.profile?.name?.trim() || user.email.split("@")[0] || "Brea member";
  const avatarUrl = user.profile?.avatar_url?.trim() || null;
  const client = getInsforgeClient();
  const { data, error } = await client.database
    .from("profiles")
    .insert([{
      user_id: user.id,
      name: profileName,
      avatar_url: avatarUrl,
      onboarding_completed: false,
      is_discoverable: false,
      is_available: false,
    }])
    .select(PROFILE_FIELDS)
    .single();

  if (!error && data) return parseProfile(data);
  if (isUniqueViolation(error)) {
    const racedProfile = await readCurrentProfile(user.id);
    if (racedProfile) return racedProfile;
  }
  throw new Error(errorMessage(error, "We could not create your Brea profile."));
}

export async function updateCurrentProfile(
  userId: string,
  input: ProfileUpdateInput,
): Promise<BreaProfile> {
  const { data, error } = await getInsforgeClient().database
    .from("profiles")
    .update({
      name: input.name,
      headline: input.headline,
      bio: input.bio,
      skills: input.skills,
      interests: input.interests,
      availability: input.availability,
      location_label: input.locationLabel,
      latitude: input.latitude,
      longitude: input.longitude,
      linkedin_profile_url: input.linkedinProfileUrl,
      onboarding_completed: input.onboardingCompleted,
      is_discoverable: input.isDiscoverable,
      is_available: input.isAvailable,
    })
    .eq("user_id", userId)
    .select(PROFILE_FIELDS)
    .single();

  if (error || !data) throw new Error(errorMessage(error, "We could not save your profile."));
  return parseProfile(data);
}

// Serialize an existing profile into the update payload, applying overrides.
// Used to persist a single field (e.g. a newly captured location) without
// re-collecting the rest of the profile.
export function profileToUpdateInput(
  profile: BreaProfile,
  overrides: Partial<ProfileUpdateInput> = {},
): ProfileUpdateInput {
  return {
    name: profile.name,
    headline: profile.headline ?? "",
    bio: profile.bio,
    skills: profile.skills,
    interests: profile.interests,
    availability: profile.availability,
    locationLabel: profile.locationLabel ?? "",
    latitude: profile.latitude,
    longitude: profile.longitude,
    linkedinProfileUrl: profile.linkedinProfileUrl,
    onboardingCompleted: profile.onboardingCompleted,
    isDiscoverable: profile.isDiscoverable,
    isAvailable: profile.isAvailable,
    ...overrides,
  };
}

export async function searchNearbyPeople(input: {
  query: string;
  radiusKm: number;
  limit?: number;
}): Promise<PeopleSearchResponse> {
  const client = getInsforgeClient();
  const { data, error } = await client.functions.invoke<unknown>("people-search", {
    body: {
      query: input.query,
      radiusKm: input.radiusKm,
      limit: input.limit ?? 12,
    },
  });

  if (error) {
    throw new Error(errorMessage(error, "We could not search nearby right now. Please try again."));
  }
  return parseSearchResponse(data);
}

export async function sendConnectionRequest(input: {
  recipientId: string;
  sourceQuery: string;
}): Promise<ConnectionResponse> {
  const client = getInsforgeClient();
  const { data, error } = await client.functions.invoke<unknown>("connection-request", {
    body: {
      recipientId: input.recipientId,
      sourceQuery: input.sourceQuery,
    },
  });

  if (error) {
    throw new ConnectionRequestError(
      errorMessage(error, "We could not send this request. Please try again."),
      connectionErrorCode(error),
    );
  }
  return parseConnectionResponse(data);
}

export async function listConnectionInbox(): Promise<ConnectionInboxResponse> {
  const { data, error } = await getInsforgeClient().functions.invoke<unknown>("connection-inbox", {
    body: {},
  });
  if (error) throw new Error(errorMessage(error, "We could not load your requests."));
  return parseInboxResponse(data);
}

export async function respondToConnection(input: {
  connectionId: string;
  action: "accept" | "decline";
}): Promise<ConnectionDecisionResponse> {
  const { data, error } = await getInsforgeClient().functions.invoke<unknown>("connection-respond", {
    body: input,
  });
  if (error) throw new Error(errorMessage(error, "We could not update this request."));
  return parseDecisionResponse(data);
}

export async function listChatMessages(connectionId: string): Promise<ChatMessage[]> {
  const { data, error } = await getInsforgeClient().functions.invoke<unknown>(
    "connection-messages",
    { body: { action: "list", connectionId } },
  );
  if (error) throw new Error(errorMessage(error, "We could not load this conversation."));
  return parseMessagesResponse(data);
}

export async function sendChatMessage(input: {
  connectionId: string;
  body: string;
}): Promise<ChatMessage> {
  const { data, error } = await getInsforgeClient().functions.invoke<unknown>(
    "connection-messages",
    { body: { action: "send", connectionId: input.connectionId, body: input.body } },
  );
  if (error) throw new Error(errorMessage(error, "Your message could not be sent."));
  return parseChatMessage(data);
}

export async function blockProfile(profileId: string): Promise<void> {
  const { error } = await getInsforgeClient().functions.invoke("profile-safety", {
    body: { action: "block", profileId },
  });
  if (error) throw new Error(errorMessage(error, "We could not hide this profile."));
}

export async function reportProfile(input: {
  profileId: string;
  reason: ReportReason;
  details?: string;
}): Promise<void> {
  const { error } = await getInsforgeClient().functions.invoke("profile-safety", {
    body: {
      action: "report",
      profileId: input.profileId,
      reason: input.reason,
      details: input.details?.trim() || null,
    },
  });
  if (error) throw new Error(errorMessage(error, "We could not submit your report."));
}

export async function trackProductEvent(
  eventName: "sign_in_completed" | "profile_completed" | "profile_updated",
  properties: Record<string, string | number | boolean | null> = {},
): Promise<void> {
  const { error } = await getInsforgeClient().functions.invoke("track-event", {
    body: { eventName, properties },
  });
  if (error) throw new Error(errorMessage(error, "The event could not be recorded."));
}
