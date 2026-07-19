import { getInsforgeClient } from "./insforge";
import type { ConnectionResponse, PeopleSearchResponse, PersonMatch } from "../types";

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
