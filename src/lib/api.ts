import { getInsforgeClient } from "./insforge";
import type { UserSchema } from "@insforge/sdk";
import type {
  BreaProfile,
  ConnectionResponse,
  PeopleSearchResponse,
  PersonMatch,
  ProfileUpdateInput,
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

  const status = valueAt(value, "connectionStatus", "connection_status");
  if (status !== "none" && status !== "pending") {
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
  if (value.status !== "pending" || typeof value.created !== "boolean") {
    throw new Error("The connection service returned an invalid status.");
  }

  return {
    id: requiredString(value.id, "connection id"),
    recipientId: requiredString(recipientId, "recipient id"),
    status: "pending",
    createdAt: requiredString(createdAt, "creation time"),
    created: value.created,
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
    throw new Error(errorMessage(error, "We could not send this request. Please try again."));
  }
  return parseConnectionResponse(data);
}
