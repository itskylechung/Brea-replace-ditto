import { createAdminClient, createClient } from "npm:@insforge/sdk@1.4.5";

type ApiError = { code: string; message: string };
type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: ApiError };

export type ConnectionRow = {
  id: string;
  sender_id: string;
  recipient_id: string;
  status: "pending" | "accepted" | "declined";
  source_query: string;
  created_at: string;
  responded_at: string | null;
};

export type ProfileRow = {
  id: string;
  name: string;
  avatar_url: string | null;
  headline: string | null;
  location_label: string | null;
  linkedin_profile_url: string | null;
};

export function parseAllowedOrigins(value: string | undefined): Set<string> {
  return new Set((value ?? "").split(",").map((origin) => origin.trim()).filter(Boolean));
}

export function bearerToken(headers: Headers): string | null {
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
      error: { code: "SERVICE_UNAVAILABLE", message: "Requests are temporarily unavailable." },
    };
  }
  return { ok: true, value: { baseUrl, apiKey } };
}

export function connectionItem(
  connection: ConnectionRow,
  direction: "incoming" | "outgoing",
  person: ProfileRow,
) {
  return {
    id: connection.id,
    direction,
    status: connection.status,
    sourceQuery: connection.source_query,
    createdAt: connection.created_at,
    respondedAt: connection.responded_at,
    person: {
      id: person.id,
      name: person.name,
      avatarUrl: person.avatar_url,
      headline: person.headline,
      locationLabel: person.location_label,
      linkedinProfileUrl: connection.status === "accepted" ? person.linkedin_profile_url : null,
    },
  };
}

export function buildInbox(
  incomingRows: ConnectionRow[],
  outgoingRows: ConnectionRow[],
  profilesById: Map<string, ProfileRow>,
): {
  incoming: ReturnType<typeof connectionItem>[];
  outgoing: ReturnType<typeof connectionItem>[];
} {
  const incoming = incomingRows.flatMap((connection) => {
    const person = profilesById.get(connection.sender_id);
    return person ? [connectionItem(connection, "incoming", person)] : [];
  });
  const outgoing = outgoingRows.flatMap((connection) => {
    const person = profilesById.get(connection.recipient_id);
    return person ? [connectionItem(connection, "outgoing", person)] : [];
  });
  return { incoming, outgoing };
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

  const config = configuration();
  if (!config.ok) return errorResponse(config.error, 503, origin, allowedOrigins);

  const accessToken = bearerToken(request.headers);
  if (!accessToken) {
    return errorResponse(
      { code: "AUTH_REQUIRED", message: "Sign in to view your requests." },
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
    .from("profiles")
    .select("id")
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (profileError) {
    return errorResponse(
      { code: "INTERNAL_ERROR", message: "Requests are temporarily unavailable." },
      500,
      origin,
      allowedOrigins,
    );
  }

  const currentProfile = profileData as { id: string } | null;
  if (!currentProfile) {
    return errorResponse(
      { code: "PROFILE_SETUP_REQUIRED", message: "Complete your Brea profile first." },
      409,
      origin,
      allowedOrigins,
    );
  }

  const connectionFields =
    "id, sender_id, recipient_id, status, source_query, created_at, responded_at";
  const [incomingResult, outgoingResult] = await Promise.all([
    admin.database.from("connections").select(connectionFields)
      .eq("recipient_id", currentProfile.id).order("created_at", { ascending: false }),
    admin.database.from("connections").select(connectionFields)
      .eq("sender_id", currentProfile.id).order("created_at", { ascending: false }),
  ]);

  if (incomingResult.error || outgoingResult.error) {
    return errorResponse(
      { code: "INTERNAL_ERROR", message: "Requests are temporarily unavailable." },
      500,
      origin,
      allowedOrigins,
    );
  }

  const incomingRows = (incomingResult.data ?? []) as unknown as ConnectionRow[];
  const outgoingRows = (outgoingResult.data ?? []) as unknown as ConnectionRow[];
  const profileIds = [
    ...new Set([
      ...incomingRows.map((connection) => connection.sender_id),
      ...outgoingRows.map((connection) => connection.recipient_id),
    ]),
  ];

  const profilesById = new Map<string, ProfileRow>();
  if (profileIds.length > 0) {
    const { data: peopleData, error: peopleError } = await admin.database
      .from("profiles")
      .select("id, name, avatar_url, headline, location_label, linkedin_profile_url")
      .in("id", profileIds);
    if (peopleError) {
      return errorResponse(
        { code: "INTERNAL_ERROR", message: "Requests are temporarily unavailable." },
        500,
        origin,
        allowedOrigins,
      );
    }
    for (const person of (peopleData ?? []) as unknown as ProfileRow[]) {
      profilesById.set(person.id, person);
    }
  }

  return jsonResponse(
    buildInbox(incomingRows, outgoingRows, profilesById),
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
    return errorResponse(
      { code: "INTERNAL_ERROR", message: "Requests are temporarily unavailable." },
      500,
      origin,
      allowedOrigins,
    );
  }
}

export default handler;
