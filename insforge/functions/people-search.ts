import { createAdminClient, createClient } from "npm:@insforge/sdk@1.4.5";

const EARTH_RADIUS_KM = 6371.0088;
const EXACT_PHRASE_BONUS = 8;
const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 200;
const MIN_RADIUS_KM = 1;
const MAX_RADIUS_KM = 50;
const MIN_LIMIT = 1;
const MAX_LIMIT = 20;

const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "at",
  "can",
  "could",
  "find",
  "for",
  "i",
  "in",
  "is",
  "looking",
  "me",
  "my",
  "near",
  "nearby",
  "of",
  "on",
  "or",
  "person",
  "people",
  "please",
  "someone",
  "somebody",
  "that",
  "the",
  "to",
  "we",
  "who",
  "which",
  "with",
]);

const FIELD_DEFINITIONS = [
  { key: "skills", weight: 5, singular: "skill", plural: "skills" },
  { key: "interests", weight: 4, singular: "interest", plural: "interests" },
  { key: "headline", weight: 3, singular: "headline", plural: "headline" },
  { key: "availability", weight: 2, singular: "availability", plural: "availability" },
  { key: "bio", weight: 1, singular: "bio", plural: "bio" },
] as const;

type SearchableField = (typeof FIELD_DEFINITIONS)[number]["key"];

type ApiError = {
  code: string;
  message: string;
};

type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: ApiError };

export type SearchInput = {
  query: string;
  radiusKm: number;
  limit: number;
};

export type ProfileRow = {
  id: string;
  name: string;
  avatar_url: string | null;
  headline: string;
  bio: string | null;
  skills: string[];
  interests: string[];
  availability: string | null;
  latitude: number | null;
  longitude: number | null;
};

export type RankedProfile = {
  profile: ProfileRow;
  score: number;
  distanceKm: number;
  matchReason: string;
};

type FieldMatch = {
  key: SearchableField;
  weight: number;
  singular: string;
  plural: string;
  matches: string[];
  contribution: number;
  containsExactPhrase: boolean;
};

function normalizeForMatching(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("en-US")
    .replace(/[\p{P}\p{S}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeQuery(query: string): string[] {
  const normalized = normalizeForMatching(query);
  if (!normalized) return [];

  return [...new Set(normalized.split(" ").filter((token) => token && !STOPWORDS.has(token)))];
}

export function haversineKm(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
): number {
  const toRadians = (degrees: number) => degrees * Math.PI / 180;
  const deltaLatitude = toRadians(latitudeB - latitudeA);
  const deltaLongitude = toRadians(longitudeB - longitudeA);
  const originLatitude = toRadians(latitudeA);
  const destinationLatitude = toRadians(latitudeB);

  const haversine = Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(originLatitude) * Math.cos(destinationLatitude) *
      Math.sin(deltaLongitude / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(haversine)));
}

function valuesForField(profile: ProfileRow, field: SearchableField): string[] {
  if (field === "skills" || field === "interests") {
    return Array.isArray(profile[field]) ? profile[field] : [];
  }

  const value = profile[field];
  return typeof value === "string" ? [value] : [];
}

function fieldMatches(profile: ProfileRow, tokens: string[], exactPhrase: string): FieldMatch[] {
  return FIELD_DEFINITIONS.map((definition) => {
    const values = valuesForField(profile, definition.key).map(normalizeForMatching);
    const matches = tokens.filter((token) => values.some((value) => value.includes(token)));

    return {
      ...definition,
      matches,
      contribution: matches.length * definition.weight,
      containsExactPhrase: exactPhrase.length > 0 &&
        values.some((value) => value.includes(exactPhrase)),
    };
  });
}

function compareFieldStrength(left: FieldMatch, right: FieldMatch): number {
  if (left.contribution !== right.contribution) {
    return right.contribution - left.contribution;
  }
  if (left.weight !== right.weight) return right.weight - left.weight;
  return FIELD_DEFINITIONS.findIndex((field) => field.key === left.key) -
    FIELD_DEFINITIONS.findIndex((field) => field.key === right.key);
}

function formatTerms(terms: string[]): string {
  if (terms.length === 1) return terms[0];
  if (terms.length === 2) return `${terms[0]} and ${terms[1]}`;
  return `${terms.slice(0, -1).join(", ")}, and ${terms.at(-1)}`;
}

export function buildMatchReason(matches: FieldMatch[]): string {
  const strongest = [...matches]
    .filter((match) => match.contribution > 0)
    .sort(compareFieldStrength)[0];

  if (!strongest) return "";

  const terms = strongest.matches.slice(0, 3);
  const label = terms.length === 1 ? strongest.singular : strongest.plural;
  const prefix = strongest.key === "headline" || strongest.key === "availability" ||
      strongest.key === "bio"
    ? `${label[0].toLocaleUpperCase("en-US")}${label.slice(1)} matches`
    : `Matches ${label}:`;

  return `${prefix} ${formatTerms(terms)}.`;
}

export function rankProfile(
  profile: ProfileRow,
  query: string,
  distanceKm: number,
): RankedProfile | null {
  const tokens = normalizeQuery(query);
  if (tokens.length === 0) return null;

  const exactPhrase = tokens.join(" ");
  const matches = fieldMatches(profile, tokens, exactPhrase);
  const exactPhraseField = matches
    .filter((match) => match.containsExactPhrase)
    .sort((left, right) => right.weight - left.weight)[0];

  if (exactPhraseField) exactPhraseField.contribution += EXACT_PHRASE_BONUS;

  const score = matches.reduce((total, match) => total + match.contribution, 0);
  if (score <= 0) return null;

  return {
    profile,
    score,
    distanceKm,
    matchReason: buildMatchReason(matches),
  };
}

function compareText(left: string, right: string): number {
  const normalizedLeft = normalizeForMatching(left);
  const normalizedRight = normalizeForMatching(right);
  if (normalizedLeft < normalizedRight) return -1;
  if (normalizedLeft > normalizedRight) return 1;
  return 0;
}

export function compareRankedProfiles(left: RankedProfile, right: RankedProfile): number {
  if (left.score !== right.score) return right.score - left.score;
  if (left.distanceKm !== right.distanceKm) return left.distanceKm - right.distanceKm;

  const nameComparison = compareText(left.profile.name, right.profile.name);
  if (nameComparison !== 0) return nameComparison;
  return compareText(left.profile.id, right.profile.id);
}

export function validateSearchInput(value: unknown): ValidationResult<SearchInput> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      ok: false,
      error: { code: "INVALID_REQUEST", message: "Request body must be a JSON object." },
    };
  }

  const body = value as Record<string, unknown>;
  if (typeof body.query !== "string") {
    return {
      ok: false,
      error: {
        code: "INVALID_REQUEST",
        message: "query must be a string between 2 and 200 characters.",
      },
    };
  }

  const query = body.query.trim();
  if (query.length < MIN_QUERY_LENGTH || query.length > MAX_QUERY_LENGTH) {
    return {
      ok: false,
      error: { code: "INVALID_REQUEST", message: "query must be between 2 and 200 characters." },
    };
  }

  if (
    typeof body.radiusKm !== "number" || !Number.isFinite(body.radiusKm) ||
    body.radiusKm < MIN_RADIUS_KM || body.radiusKm > MAX_RADIUS_KM
  ) {
    return {
      ok: false,
      error: { code: "INVALID_REQUEST", message: "radiusKm must be a number between 1 and 50." },
    };
  }

  if (
    !Number.isInteger(body.limit) || (body.limit as number) < MIN_LIMIT ||
    (body.limit as number) > MAX_LIMIT
  ) {
    return {
      ok: false,
      error: { code: "INVALID_REQUEST", message: "limit must be an integer between 1 and 20." },
    };
  }

  return {
    ok: true,
    value: { query, radiusKm: body.radiusKm, limit: body.limit as number },
  };
}

export function parseAllowedOrigins(value: string | undefined): Set<string> {
  return new Set(
    (value ?? "").split(",").map((origin) => origin.trim()).filter(Boolean),
  );
}

function corsHeaders(origin: string | null, allowedOrigins: Set<string>): Headers {
  const headers = new Headers({
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  });

  if (origin && allowedOrigins.has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
  }

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

function isValidCoordinate(latitude: unknown, longitude: unknown): latitude is number {
  return typeof latitude === "number" && Number.isFinite(latitude) && latitude >= -90 &&
    latitude <= 90 && typeof longitude === "number" && Number.isFinite(longitude) &&
    longitude >= -180 && longitude <= 180;
}

export function bearerToken(headers: Headers): string | null {
  const authorization = headers.get("Authorization")?.trim();
  if (!authorization) return null;
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

function configuration(): ValidationResult<{
  baseUrl: string;
  apiKey: string;
}> {
  const baseUrl = Deno.env.get("INSFORGE_BASE_URL")?.trim();
  const apiKey = Deno.env.get("API_KEY")?.trim();

  if (!baseUrl || !apiKey) {
    return {
      ok: false,
      error: {
        code: "SERVICE_UNAVAILABLE",
        message: "Nearby search is temporarily unavailable.",
      },
    };
  }

  return { ok: true, value: { baseUrl, apiKey } };
}

async function handleRequest(request: Request): Promise<Response> {
  const origin = request.headers.get("Origin");
  const allowedOrigins = parseAllowedOrigins(Deno.env.get("BREA_ALLOWED_ORIGINS"));

  if (origin && !allowedOrigins.has(origin)) {
    return jsonResponse(
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
    return jsonResponse(
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
    return jsonResponse(
      { code: "INVALID_REQUEST", message: "Request body must contain valid JSON." },
      400,
      origin,
      allowedOrigins,
    );
  }

  const validatedInput = validateSearchInput(body);
  if (!validatedInput.ok) {
    return jsonResponse(validatedInput.error, 400, origin, allowedOrigins);
  }

  const config = configuration();
  if (!config.ok) {
    return jsonResponse(config.error, 503, origin, allowedOrigins);
  }

  const accessToken = bearerToken(request.headers);
  if (!accessToken) {
    return jsonResponse(
      { code: "AUTH_REQUIRED", message: "Sign in to search for nearby people." },
      401,
      origin,
      allowedOrigins,
    );
  }

  const authClient = createClient({ baseUrl: config.value.baseUrl, accessToken });
  const { data: currentUserData, error: currentUserError } = await authClient.auth.getCurrentUser();
  if (currentUserError || !currentUserData?.user) {
    return jsonResponse(
      { code: "INVALID_SESSION", message: "Your session has expired. Sign in again." },
      401,
      origin,
      allowedOrigins,
    );
  }

  const admin = createAdminClient({
    baseUrl: config.value.baseUrl,
    apiKey: config.value.apiKey,
  });

  const { data: senderData, error: senderError } = await admin.database
    .from("profiles")
    .select("id, latitude, longitude, onboarding_completed")
    .eq("user_id", currentUserData.user.id)
    .maybeSingle();

  if (senderError) {
    return jsonResponse(
      { code: "INTERNAL_ERROR", message: "Nearby search is temporarily unavailable." },
      500,
      origin,
      allowedOrigins,
    );
  }

  const sender = senderData as
    | {
      id: string;
      latitude: number | null;
      longitude: number | null;
      onboarding_completed: boolean;
    }
    | null;
  if (!sender || !sender.onboarding_completed) {
    return jsonResponse(
      { code: "PROFILE_SETUP_REQUIRED", message: "Complete your Brea profile before searching." },
      409,
      origin,
      allowedOrigins,
    );
  }

  if (!isValidCoordinate(sender.latitude, sender.longitude)) {
    return jsonResponse(
      { code: "PROFILE_SETUP_REQUIRED", message: "Add your location before searching." },
      409,
      origin,
      allowedOrigins,
    );
  }
  const senderLatitude = sender.latitude as number;
  const senderLongitude = sender.longitude as number;

  const { data: candidateData, error: candidateError } = await admin.database
    .from("profiles")
    .select(
      "id, name, avatar_url, headline, bio, skills, interests, availability, latitude, longitude",
    )
    .neq("id", sender.id)
    .eq("onboarding_completed", true)
    .eq("is_discoverable", true)
    .eq("is_available", true);

  if (candidateError) {
    return jsonResponse(
      { code: "INTERNAL_ERROR", message: "Nearby search is temporarily unavailable." },
      500,
      origin,
      allowedOrigins,
    );
  }

  const candidates = (candidateData ?? []) as unknown as ProfileRow[];
  const ranked = candidates.flatMap((profile) => {
    if (!isValidCoordinate(profile.latitude, profile.longitude)) return [];

    const distanceKm = haversineKm(
      senderLatitude,
      senderLongitude,
      profile.latitude,
      profile.longitude as number,
    );
    if (distanceKm > validatedInput.value.radiusKm) return [];

    const match = rankProfile(profile, validatedInput.value.query, distanceKm);
    return match ? [match] : [];
  }).sort(compareRankedProfiles).slice(0, validatedInput.value.limit);

  const resultIds = ranked.map((match) => match.profile.id);
  const pendingRecipients = new Set<string>();

  if (resultIds.length > 0) {
    const { data: connectionData, error: connectionError } = await admin.database
      .from("connections")
      .select("recipient_id")
      .eq("sender_id", sender.id)
      .eq("status", "pending")
      .in("recipient_id", resultIds);

    if (connectionError) {
      return jsonResponse(
        { code: "INTERNAL_ERROR", message: "Nearby search is temporarily unavailable." },
        500,
        origin,
        allowedOrigins,
      );
    }

    for (const connection of (connectionData ?? []) as unknown as { recipient_id: string }[]) {
      pendingRecipients.add(connection.recipient_id);
    }
  }

  const results = ranked.map(({ profile, distanceKm, matchReason }) => ({
    id: profile.id,
    name: profile.name,
    avatarUrl: profile.avatar_url,
    headline: profile.headline,
    bio: profile.bio,
    distanceKm: Math.round(distanceKm * 10) / 10,
    skills: profile.skills,
    interests: profile.interests,
    availability: profile.availability,
    matchReason,
    connectionStatus: pendingRecipients.has(profile.id) ? "pending" : "none",
  }));

  return jsonResponse({ results }, 200, origin, allowedOrigins);
}

export async function handler(request: Request): Promise<Response> {
  const origin = request.headers.get("Origin");
  let allowedOrigins = new Set<string>();

  try {
    allowedOrigins = parseAllowedOrigins(Deno.env.get("BREA_ALLOWED_ORIGINS"));
    return await handleRequest(request);
  } catch {
    return jsonResponse(
      { code: "INTERNAL_ERROR", message: "Nearby search is temporarily unavailable." },
      500,
      origin,
      allowedOrigins,
    );
  }
}

export default handler;
