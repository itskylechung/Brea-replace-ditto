import { createAdminClient } from "npm:@insforge/sdk@1.4.5";

const MIN_SOURCE_QUERY_LENGTH = 2;
const MAX_SOURCE_QUERY_LENGTH = 200;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ApiError = {
  code: string;
  message: string;
};

type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: ApiError };

export type ConnectionInput = {
  recipientId: string;
  sourceQuery: string;
};

type ConnectionRow = {
  id: string;
  recipient_id: string;
  status: "pending";
  created_at: string;
};

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export function validateConnectionInput(value: unknown): ValidationResult<ConnectionInput> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      ok: false,
      error: { code: "INVALID_REQUEST", message: "Request body must be a JSON object." },
    };
  }

  const body = value as Record<string, unknown>;
  if (!isUuid(body.recipientId)) {
    return {
      ok: false,
      error: { code: "INVALID_REQUEST", message: "recipientId must be a valid UUID." },
    };
  }

  if (typeof body.sourceQuery !== "string") {
    return {
      ok: false,
      error: {
        code: "INVALID_REQUEST",
        message: "sourceQuery must be a string between 2 and 200 characters.",
      },
    };
  }

  const sourceQuery = body.sourceQuery.trim();
  if (
    sourceQuery.length < MIN_SOURCE_QUERY_LENGTH ||
    sourceQuery.length > MAX_SOURCE_QUERY_LENGTH
  ) {
    return {
      ok: false,
      error: {
        code: "INVALID_REQUEST",
        message: "sourceQuery must be between 2 and 200 characters.",
      },
    };
  }

  return { ok: true, value: { recipientId: body.recipientId, sourceQuery } };
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

function configuration(): ValidationResult<{
  baseUrl: string;
  apiKey: string;
  senderId: string;
}> {
  const baseUrl = Deno.env.get("INSFORGE_BASE_URL")?.trim();
  const apiKey = Deno.env.get("API_KEY")?.trim();
  const senderId = Deno.env.get("BREA_MVP_PROFILE_ID")?.trim();

  if (!baseUrl || !apiKey || !isUuid(senderId)) {
    return {
      ok: false,
      error: {
        code: "MVP_PROFILE_UNAVAILABLE",
        message: "The MVP connection profile is unavailable.",
      },
    };
  }

  return { ok: true, value: { baseUrl, apiKey, senderId } };
}

function connectionResponse(connection: ConnectionRow, created: boolean) {
  return {
    id: connection.id,
    recipientId: connection.recipient_id,
    status: connection.status,
    createdAt: connection.created_at,
    created,
  };
}

function isUniqueViolation(error: unknown): boolean {
  return !!error && typeof error === "object" &&
    (error as { code?: unknown }).code === "23505";
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

  const validatedInput = validateConnectionInput(body);
  if (!validatedInput.ok) {
    return jsonResponse(validatedInput.error, 400, origin, allowedOrigins);
  }

  const config = configuration();
  if (!config.ok) {
    return jsonResponse(config.error, 503, origin, allowedOrigins);
  }

  if (validatedInput.value.recipientId === config.value.senderId) {
    return jsonResponse(
      { code: "SELF_CONNECTION", message: "You cannot connect with yourself." },
      400,
      origin,
      allowedOrigins,
    );
  }

  const admin = createAdminClient({
    baseUrl: config.value.baseUrl,
    apiKey: config.value.apiKey,
  });

  const { data: profileData, error: profileError } = await admin.database
    .from("profiles")
    .select("id, is_discoverable, is_available")
    .in("id", [config.value.senderId, validatedInput.value.recipientId]);

  if (profileError) {
    return jsonResponse(
      { code: "INTERNAL_ERROR", message: "The connection request could not be completed." },
      500,
      origin,
      allowedOrigins,
    );
  }

  const profiles = (profileData ?? []) as unknown as {
    id: string;
    is_discoverable: boolean;
    is_available: boolean;
  }[];
  const sender = profiles.find((profile) => profile.id === config.value.senderId);
  const recipient = profiles.find((profile) => profile.id === validatedInput.value.recipientId);

  if (!sender) {
    return jsonResponse(
      {
        code: "MVP_PROFILE_UNAVAILABLE",
        message: "The MVP connection profile is unavailable.",
      },
      503,
      origin,
      allowedOrigins,
    );
  }

  if (!recipient) {
    return jsonResponse(
      { code: "RECIPIENT_NOT_FOUND", message: "The selected profile was not found." },
      404,
      origin,
      allowedOrigins,
    );
  }

  if (!recipient.is_discoverable || !recipient.is_available) {
    return jsonResponse(
      { code: "RECIPIENT_UNAVAILABLE", message: "The selected profile is unavailable." },
      409,
      origin,
      allowedOrigins,
    );
  }

  const selectConnection = () =>
    admin.database
      .from("connections")
      .select("id, recipient_id, status, created_at")
      .eq("sender_id", config.value.senderId)
      .eq("recipient_id", validatedInput.value.recipientId)
      .maybeSingle();

  const { data: existingData, error: existingError } = await selectConnection();
  if (existingError) {
    return jsonResponse(
      { code: "INTERNAL_ERROR", message: "The connection request could not be completed." },
      500,
      origin,
      allowedOrigins,
    );
  }

  if (existingData) {
    return jsonResponse(
      connectionResponse(existingData as unknown as ConnectionRow, false),
      200,
      origin,
      allowedOrigins,
    );
  }

  const { data: insertedData, error: insertError } = await admin.database
    .from("connections")
    .insert([{
      id: crypto.randomUUID(),
      sender_id: config.value.senderId,
      recipient_id: validatedInput.value.recipientId,
      status: "pending",
      source_query: validatedInput.value.sourceQuery,
    }])
    .select("id, recipient_id, status, created_at")
    .single();

  if (!insertError && insertedData) {
    return jsonResponse(
      connectionResponse(insertedData as unknown as ConnectionRow, true),
      200,
      origin,
      allowedOrigins,
    );
  }

  if (isUniqueViolation(insertError)) {
    const { data: racedData, error: racedError } = await selectConnection();
    if (!racedError && racedData) {
      return jsonResponse(
        connectionResponse(racedData as unknown as ConnectionRow, false),
        200,
        origin,
        allowedOrigins,
      );
    }
  }

  return jsonResponse(
    { code: "INTERNAL_ERROR", message: "The connection request could not be completed." },
    500,
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
    return jsonResponse(
      { code: "INTERNAL_ERROR", message: "The connection request could not be completed." },
      500,
      origin,
      allowedOrigins,
    );
  }
}

export default handler;
